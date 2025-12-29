import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// Types need to be imported or defined, but for now lets rely on 'any' for the library parts to ensure isolation
// We can import types only
import type { IProvider } from "@web3auth/base";
import { CHAIN_NAMESPACES } from "@web3auth/base";

// Constants for Chain
const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3", // Solana Devnet
    rpcTarget: "https://api.devnet.solana.com",
    displayName: "Solana Devnet",
    blockExplorer: "https://explorer.solana.com",
    ticker: "SOL",
    tickerName: "Solana",
};

interface AuthContextType {
    user: any;
    provider: IProvider | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    walletAddress: string | null;
    balance: number;
    isLoading: boolean;
    refreshBalance: () => Promise<void>;
}

// @ts-ignore
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Helper to interact with RPC (simplified for now)
const getSolanaAddress = async (provider: IProvider): Promise<string> => {
    // Only works if provider is solana
    // But @web3auth/solana-provider doesn't expose standard request easily in all versions.
    // Let's assume standard connection.
    try {
        const accounts = await (provider as any).request({ method: "getAccounts" });
        return accounts?.[0] || "";
    } catch (error) {
        console.error("Error getting address", error);
        return "";
    }
};

// Define types locally if needed or use 'any' to avoid import issues
type Web3AuthType = any;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3AuthType | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [user, setUser] = useState<any>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                if (typeof window === "undefined") return;

                // Dynamic Import to firewall SSR
                const { Web3Auth } = await import("@web3auth/modal");
                const { SolanaPrivateKeyProvider } = await import("@web3auth/solana-provider");
                const { OpenloginAdapter } = await import("@web3auth/openlogin-adapter");

                const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

                console.log("Initializing Web3Auth...");
                
                // Cast to any to avoid strict type checks
                const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } }) as any;
                
                const web3authInstance = new Web3Auth({
                    clientId,
                    web3AuthNetwork: "sapphire_devnet",
                    privateKeyProvider,
                }) as any;

                const adapter = new OpenloginAdapter({
                    privateKeyProvider,
                    adapterSettings: {
                        uxMode: "popup",
                    },
                });
                web3authInstance.configureAdapter(adapter);

                // Check for initModal vs init
                if (typeof web3authInstance.initModal === 'function') {
                    await web3authInstance.initModal();
                } else if (typeof web3authInstance.init === 'function') {
                    await web3authInstance.init();
                }

                setWeb3auth(web3authInstance);
                setProvider(web3authInstance.provider);

                if (web3authInstance.connected) {
                    await handlePostLogin(web3authInstance.provider, web3authInstance);
                }
            } catch (error) {
                console.error("Web3Auth Init Error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handlePostLogin = async (newProvider: IProvider, authInstance: any) => {
        if (!authInstance) return;
        const userInfo = await authInstance.getUserInfo();
        setUser(userInfo);

        const address = await getSolanaAddress(newProvider);
        setWalletAddress(address);

        // Sync to Supabase
        if (userInfo && address) {
            syncUserToSupabase(userInfo, address);
        }
    };

    const syncUserToSupabase = async (userInfo: any, address: string) => {
        try {
            // Check if user exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', userInfo.verifierId || userInfo.email) // Fallback to email if verifierId missing
                .single();

            if (existingUser) {
                // Update login time
                await supabase
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', existingUser.id);

                setBalance(existingUser.balance_kes || 0);
            } else {
                // Create new user
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert([
                        {
                            auth_id: userInfo.verifierId || userInfo.email,
                            username: userInfo.name || "Anonymous",
                            wallet_address: address,
                            balance_kes: 0, // Start with 0 or bonus?
                            total_wins: 0
                        }
                    ])
                    .select()
                    .single();

                if (newUser) {
                    setBalance(0);
                    toast.success("Welcome! Account created.");
                }
            }
        } catch (err) {
            console.error("DB Sync Error:", err);
            // Don't block login on DB error, just log
        }
    };

    const login = async () => {
        if (!web3auth) {
            console.error("Web3Auth not initialized yet");
            return;
        }
        try {
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider);
            if (web3authProvider) {
                await handlePostLogin(web3authProvider, web3auth);
                toast.success("Logged in successfully!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Login failed");
        }
    };

    const logout = async () => {
        if (!web3auth) return;
        try {
            await web3auth.logout();
            setProvider(null);
            setUser(null);
            setWalletAddress(null);
            toast.success("Logged out");
        } catch (error) {
            console.error(error);
        }
    };

    const refreshBalance = async () => {
        if (!user) return;
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('balance_kes')
                .eq('auth_id', user.verifierId || user.email)
                .single();

            if (userData) {
                setBalance(userData.balance_kes || 0);
            }
        } catch (error) {
            console.error("Balance refresh failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, provider, login, logout, walletAddress, balance, isLoading, refreshBalance }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
