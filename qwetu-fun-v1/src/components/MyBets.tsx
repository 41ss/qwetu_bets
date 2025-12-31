"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Loader2, TrendingUp, Calendar, Coins } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

// Interface remains the same
interface BetWithMarket {
    id: string;
    stake_amount: number;
    direction: "YES" | "NO";
    status: "PENDING" | "CONFIRMED" | "WON" | "LOST";
    created_at: string;
    market: {
        id: string;
        question: string;
        pool_yes: number;
        pool_no: number;
        status: "ACTIVE" | "LOCKED" | "RESOLVED";
        outcome?: "YES" | "NO";
    };
}

export default function MyBets() {
    const { user, isLoading: authLoading } = useAuth();
    const [bets, setBets] = useState<BetWithMarket[]>([]);
    const [loading, setLoading] = useState(true);

   useEffect(() => {
        // Only run if user is fully loaded and has an identity
        const authId = user?.verifierId || user?.email;
        if (!authId) {
            setLoading(false);
            return;
        }

        const fetchBets = async () => {
            try {
                setLoading(true);
                
                // Fetch the UUID for the logged-in user
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', authId)
                    .single();

                if (userError || !userData) {
                    console.warn("User not found in database yet.");
                    setBets([]);
                    return;
                }

                const { data, error } = await supabase
                    .from("bets")
                    .select(`
                        id, stake_amount, direction, status, created_at,
                        market:markets (
                            id, question, pool_yes, pool_no, status, outcome
                        )
                    `)
                    .eq("user_id", userData.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setBets((data as any) || []);
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBets();
    }, [user?.verifierId, user?.email]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-KE", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getPotentialPayout = (bet: BetWithMarket) => {
        const { stake_amount, direction, market, status } = bet;

        if (status === "WON") return "PAID";
        if (status === "LOST") return "0";
        if (market.status === "RESOLVED") return "0";

        const totalPot = Number(market.pool_yes || 0) + Number(market.pool_no || 0);
        const winningSidePool = direction === "YES" ? Number(market.pool_yes) : Number(market.pool_no);

        if (winningSidePool === 0) return stake_amount.toLocaleString();

        const share = stake_amount / winningSidePool;
        const payout = share * totalPot * 0.95;

        return Math.floor(payout).toLocaleString();
    };

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-white/40 text-sm">Initializing...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
                <div className="bg-white/5 p-4 rounded-full">
                    <TrendingUp className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white font-bold">Connect Wallet</p>
                <p className="text-white/40 text-sm">Please log in to view your betting activity.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-white/40 text-sm">Loading your activity...</p>
            </div>
        );
    }

    if (bets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-white/5 p-6 rounded-full mb-6">
                    <TrendingUp className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-white font-bold text-lg">No active activity</h3>
                <p className="text-white/40 text-sm mt-2">
                    Start swiping to build your portfolio!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full max-w-md mx-auto p-4 pb-28">
            <h2 className="text-xl font-black text-white italic uppercase tracking-wider flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5 text-yellow-500" />
                My Activity
            </h2>

            {bets.map((bet) => (
                <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group bg-[#121212] border border-white/5 rounded-3xl p-5 relative overflow-hidden"
                >
                    <div className={`absolute top-0 right-0 px-4 py-1.5 text-[10px] font-black uppercase rounded-bl-2xl ${bet.status === 'CONFIRMED' || bet.status === 'PENDING' ? 'bg-blue-500/10 text-blue-400' :
                        bet.status === 'WON' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/10 text-red-500'
                        }`}>
                        {bet.status === 'CONFIRMED' || bet.status === 'PENDING' ? 'LIVE' : bet.status}
                    </div>

                    <div className="mb-4">
                        <h3 className="text-white font-bold text-lg leading-tight">
                            {bet.market.question}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {formatDate(bet.created_at)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-tighter mb-1">Position</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${bet.direction === 'YES' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-white font-black text-sm">{bet.direction}</span>
                                <span className="text-white/40 text-xs font-mono">@{bet.stake_amount}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-tighter mb-1">Current Payout</span>
                            <span className={`text-lg font-black font-mono ${bet.status === 'WON' ? 'text-green-400' : 'text-white'}`}>
                                {bet.status === 'CONFIRMED' || bet.status === 'PENDING' ? `~${getPotentialPayout(bet)}` :
                                    bet.status === 'WON' ? `+${getPotentialPayout(bet)}` : '0'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}