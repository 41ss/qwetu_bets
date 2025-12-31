"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// WEB3AUTH IMPORTS
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, IProvider } from "@web3auth/base";
import { Web3Auth } from "@web3auth/modal";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { AuthAdapter } from "@web3auth/auth-adapter";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BOY4kYL09-C6TZsq7Q4vBlDgzEiOD-tO4y_fieTICYu5ZCuIQIMQHNVGCiIUqMwj6MY-H5yFB-otuPbbF17bd3I";

const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3",
    rpcTarget: "https://api.devnet.solana.com",
    displayName: "Solana Devnet",
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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [user, setUser] = useState<any>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const refreshBalance = useCallback(async (targetUser?: any) => {
        const currentUser = targetUser || user;
        if (!currentUser) return;
        try {
            const { data } = await supabase
                .from('users')
                .select('balance_kes')
                .eq('auth_id', currentUser.verifierId || currentUser.email)
                .single();
            if (data) setBalance(data.balance_kes || 0);
        } catch (error) {
            console.error("Balance refresh failed", error);
        }
    }, [user]);

    const syncUserToSupabase = async (userInfo: any, address: string) => {
        try {
            const authId = userInfo.verifierId || userInfo.email;
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', authId)
                .maybeSingle();

            if (existingUser) {
                await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', existingUser.id);
                setBalance(existingUser.balance_kes || 0);
                return existingUser;
            } else {
                const { data: newUser } = await supabase.from('users').insert([{
                    auth_id: authId,
                    username: userInfo.name || "Anonymous",
                    wallet_address: address,
                    balance_kes: 0
                }]).select().single();

                if (newUser) {
                    setBalance(0);
                    toast.success("Welcome to Qwetu Bets!");
                    return newUser;
                }
            }
        } catch (err) {
            console.error("DB Sync Error:", err);
        }
    };

    const handlePostLogin = async (newProvider: IProvider, authInstance: Web3Auth) => {
        try {
            const userInfo = await authInstance.getUserInfo();
            const accounts = await newProvider.request({ method: "getAccounts" }) as string[];
            const address = accounts[0];

            setWalletAddress(address);
            const dbUser = await syncUserToSupabase(userInfo, address);

            if (dbUser) {
                // Merge Web3Auth info with Supabase DB info (so user.id is the UUID)
                setUser({ ...userInfo, ...dbUser });
            } else {
                setUser(userInfo);
            }
        } catch (error) {
            console.error("Post Login Error:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } });
                const web3authInstance = new Web3Auth({
                    clientId,
                    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
                    privateKeyProvider,
                });

                const authAdapter = new AuthAdapter({
                    privateKeyProvider,
                    adapterSettings: { uxMode: "popup" }
                });
                web3authInstance.configureAdapter(authAdapter as any);

                await web3authInstance.initModal();
                setWeb3auth(web3authInstance);

                if (web3authInstance.connected && web3authInstance.provider) {
                    setProvider(web3authInstance.provider);
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

    const login = async () => {
        if (!web3auth) {
            toast.error("Auth not ready");
            return;
        }
        try {
            const p = await web3auth.connect();
            if (p) {
                setProvider(p);
                await handlePostLogin(p, web3auth);
            }
        } catch (error) {
            console.error("Login Failed", error);
        }
    };

    const logout = async () => {
        if (!web3auth) return;
        await web3auth.logout();
        setProvider(null);
        setUser(null);
        setWalletAddress(null);
        setBalance(0);
    };

    return (
        <AuthContext.Provider value={{ user, provider, login, logout, walletAddress, balance, isLoading, refreshBalance }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);