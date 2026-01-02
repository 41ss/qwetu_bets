"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Smartphone, TrendingUp, Coins } from "lucide-react";
import { Market } from "@/hooks/useMarkets";
import { formatCurrency } from "@/utils/betting";

type PaymentModalProps = {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    market: Market;
    stake: number;
    intent: "YES" | "NO";
};

export default function PaymentModal({
    isOpen,
    onConfirm,
    onCancel,
    market,
    stake,
    intent,
}: PaymentModalProps) {
    
    // 1. Production Parimutuel Calculation (Matching SwipeCard Logic)
    const calculateProductionPayout = () => {
        const yesPool = Number(market.pool_yes || 0);
        const noPool = Number(market.pool_no || 0);
        
        // The total pot includes the current pools plus the user's new stake
        const totalPot = yesPool + noPool + stake;
        
        // The side pool for the user's intent also includes their new stake
        const sidePool = (intent === "YES" ? yesPool : noPool) + stake;
        
        // Share of the winning side * Total Pot
        const share = stake / sidePool;
        const grossWin = share * totalPot;
        
        // 5% Platform Fee (Matches 0.95 multiplier used elsewhere)
        const netPayout = Math.floor(grossWin * 0.95);
        const feeDeduction = Math.floor(grossWin * 0.05);

        return { grossWin, netPayout, feeDeduction };
    };

    const { grossWin, netPayout, feeDeduction } = calculateProductionPayout();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={onCancel}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 40 }}
                        className="relative w-full max-w-sm bg-[#121212] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className={`absolute -top-24 -left-24 w-48 h-48 blur-[100px] rounded-full opacity-20 ${intent === 'YES' ? 'bg-green-500' : 'bg-red-500'}`} />

                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                Confirm Bet
                            </h3>
                            <button
                                onClick={onCancel}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Bet Summary Card */}
                        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-8 relative z-10">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Position</span>
                                    <span className={`text-4xl font-black italic ${intent === "YES" ? "text-green-400" : "text-red-400"}`}>
                                        {intent}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Stake Amount</span>
                                    <span className="text-2xl font-black text-white font-mono">KES {stake}</span>
                                </div>
                            </div>

                            {/* Question Preview */}
                            <p className="text-sm text-white/70 font-medium leading-relaxed italic border-t border-white/5 pt-4">
                                "{market.question}"
                            </p>
                        </div>

                        {/* Financial Breakdown */}
                        <div className="space-y-4 mb-10 relative z-10 px-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter text-white/40">
                                <span>Gross Potential</span>
                                <span>{formatCurrency(grossWin)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter text-red-500/60">
                                <span>Platform Fee (5%)</span>
                                <span>-{formatCurrency(feeDeduction)}</span>
                            </div>
                            
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
                            
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-white uppercase italic">Est. Net Payout</span>
                                <div className="flex items-center gap-2 text-green-400">
                                    <Coins className="w-5 h-5" />
                                    <span className="text-3xl font-black font-mono tracking-tighter">
                                        {formatCurrency(netPayout)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="space-y-4 relative z-10">
                            <button
                                onClick={onConfirm}
                                className="w-full py-5 bg-white hover:bg-blue-400 text-black font-black text-xl rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                            >
                                <Smartphone className="w-6 h-6" />
                                CONFIRM BET
                            </button>
                            
                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Secured by Keagan Protocol</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}