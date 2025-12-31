"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Smartphone } from "lucide-react";
import { Market } from "@/hooks/useMarkets";
import { calculatePotentialWin, formatCurrency, PLATFORM_FEE } from "@/utils/betting";

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
    const poolAmount = (market.pool_yes || 0) + (market.pool_no || 0);
    // Approximate participant count if not available, or just pass 0 as it's for simulation
    const participantCount = 0;

    const { grossWin, feeDeduction, netPayout } = calculatePotentialWin(stake, poolAmount, participantCount);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onCancel}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white font-display">Confirm Vote</h3>
                            <button
                                onClick={onCancel}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Selection */}
                        <div className="bg-white/5 rounded-xl p-4 mb-6 flex items-center justify-between border border-white/5">
                            <div>
                                <span className="block text-xs text-white/40 uppercase tracking-wider font-bold">You are voting</span>
                                <span className={`text-2xl font-black ${intent === "YES" ? "text-green-400" : "text-red-400"}`}>
                                    {intent}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-white/40 uppercase tracking-wider font-bold">Stake</span>
                                <span className="text-xl font-bold text-white">{formatCurrency(stake)}</span>
                            </div>
                        </div>

                        {/* Financial Transparency */}
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-white/60">
                                <span>Potential Gross Win</span>
                                <span>{formatCurrency(grossWin)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-400/80">
                                <span>Platform Fee ({PLATFORM_FEE * 100}%)</span>
                                <span>-{formatCurrency(feeDeduction)}</span>
                            </div>
                            <div className="h-px bg-white/10 my-2" />
                            <div className="flex justify-between text-lg font-bold text-green-400">
                                <span>Est. Payout</span>
                                <span>{formatCurrency(netPayout)}</span>
                            </div>
                            <p className="text-center text-xs text-white/30 italic mt-2">
                                Winner takes 98% of the Pot!
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={onConfirm}
                                className="w-full py-4 bg-[#00D632] hover:bg-[#00c42e] text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                <Smartphone className="w-5 h-5" />
                                Pay with M-Pesa
                            </button>
                            <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Secure Payment via LocalRamp</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
