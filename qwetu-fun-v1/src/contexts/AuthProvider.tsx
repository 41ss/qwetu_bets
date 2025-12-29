"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// WEB3AUTH IMPORTS
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, IProvider } from "@web3auth/base";
import { Web3Auth } from "@web3auth/modal";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { AuthAdapter } from "@web3auth/auth-adapter";
// --- CONFIGURATION ---
const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BOY4kYL09-C6TZsq7Q4vBlDgzEiOD-tO4y_fieTICYu5ZCuIQIMQHNVGCiIUqMwj6MY-H5yFB-otuPbbF17bd3I";

const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3", // Solana Devnet
    rpcTarget: "https://api.devnet.solana.com",
    displayName: "Solana Devnet",
    blockExplorer: "https://explorer.solana.com",
    ticker: "SOL",
    tickerName: "Solana",
};

// --- TYPES ---
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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// --- COMPONENT ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [user, setUser] = useState<any>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Initialize Solana Provider
                // @ts-ignore - 'currentChain' bypass
                const privateKeyProvider = new SolanaPrivateKeyProvider({
                    config: { chainConfig },
                }) as any;

                // 2. Initialize Web3Auth Core
                const web3authInstance = new Web3Auth({
                    clientId,
                    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
                    privateKeyProvider,
                });

                // 3. EXPLICITLY Configure OpenLogin Adapter (The Fix)
                // This forces the "Auth" module to exist, preventing the 'loginWithSessionId' null error.
                const authAdapter = new AuthAdapter({
        privateKeyProvider,
        adapterSettings: {
            uxMode: "popup",
        }
    });
web3authInstance.configureAdapter(authAdapter as any);
                // 4. Init Modal
                // @ts-ignore - initModal check
                if (web3authInstance.initModal) {
                    // @ts-ignore
                    await web3authInstance.initModal();
                } else {
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

    const handlePostLogin = async (newProvider: IProvider | null, authInstance: Web3Auth) => {
        if (!newProvider || !authInstance) return;

        try {
            const userInfo = await authInstance.getUserInfo();
            setUser(userInfo);

            // Get Solana Address
            // @ts-ignore - Request method fix
            const accounts = await newProvider.request({ method: "getAccounts" });
            const address = (accounts as string[])[0];
            setWalletAddress(address);

            if (userInfo && address) {
                await syncUserToSupabase(userInfo, address);
            }
        } catch (error) {
            console.error("Post Login Error:", error);
        }
    };

    const syncUserToSupabase = async (userInfo: any, address: string) => {
        try {
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', userInfo.verifierId || userInfo.email)
                .maybeSingle();

            if (existingUser) {
                await supabase
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', existingUser.id);
                setBalance(existingUser.balance_kes || 0);
            } else {
                const { error } = await supabase
                    .from('users')
                    .insert([{
                        auth_id: userInfo.verifierId || userInfo.email,
                        username: userInfo.name || "Anonymous",
                        wallet_address: address,
                        balance_kes: 0,
                        total_wins: 0
                    }]);
                if (!error) {
                    setBalance(0);
                    toast.success("Account Created!");
                }
            }
        } catch (err) {
            console.error("DB Sync Error:", err);
        }
    };

    const login = async () => {
        if (!web3auth) {
            toast.error("Loading login...");
            return;
        }
        try {
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider);
            if (web3authProvider) {
                await handlePostLogin(web3authProvider, web3auth);
                toast.success("Logged in!");
            }
        } catch (error) {
            console.error("Login Failed:", error);
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
            console.error("Logout Failed:", error);
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