"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, CheckCircle, Loader2 } from "lucide-react";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeposit: (phone: string, amount: number) => Promise<void>;
}

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export default function DepositModal({ isOpen, onClose, onDeposit }: DepositModalProps) {
    const [amount, setAmount] = useState<number | "">("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !phone) return;

        setStatus("loading");
        try {
            await onDeposit(phone, Number(amount));
            setStatus("success");
            setTimeout(() => {
                setStatus("idle");
                onClose();
                setAmount("");
                setPhone("");
            }, 2000);
        } catch (error) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
                    />

                    {/* Bottom Sheet Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-x border-white/10 rounded-t-3xl p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:static md:max-w-md md:rounded-3xl md:m-auto md:translate-y-0"
                        style={{
                            // On desktop, we want it centered, handled by md: classes above effectively if we were using a flex container wrapper from outside. 
                            // But here we are fixed. Let's make it work for both.
                            // The simplest way to achieve bottom sheet on mobile and center on desktop without complex conditionals is using specific layout classes.
                            // For this specific 'Bottom Sheet' feel request, prioritising mobile 
                        }}
                    >
                        {/* Drag Handle for visual cue */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                    <span className="text-green-500 font-bold text-xs">M-PESA</span>
                                </span>
                                Top Up to Play!
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {status === "success" ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in">
                                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Deposit Initiated!</h3>
                                <p className="text-gray-400">Check your phone to complete payment.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (KES)</label>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        {[50, 100, 200].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setAmount(amt)}
                                                className={`py-3 rounded-xl text-sm font-bold transition-all border ${amount === amt
                                                    ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20"
                                                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                                                    }`}
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Or enter amount..."
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-lg"
                                        required
                                        min={10}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">M-Pesa Number</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="tel"
                                            placeholder="07..."
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === "loading" || !phone || !amount}
                                    className="w-full bg-[#25D366] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending Request...
                                        </>
                                    ) : (
                                        "Pay with M-Pesa"
                                    )}
                                </button>
                                <p className="text-center text-[10px] uppercase tracking-widest text-gray-600">
                                    Secure Payment
                                </p>
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
