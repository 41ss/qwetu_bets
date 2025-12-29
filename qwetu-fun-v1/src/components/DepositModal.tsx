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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="fixed z-50 w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-emerald-900/20"
                        style={{ top: "50%", left: "50%", x: "-50%", y: "-50%" }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Smartphone className="w-4 h-4 text-emerald-400" />
                                </span>
                                M-Pesa Deposit
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {status === "success" ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in">
                                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Deposit Successful!</h3>
                                <p className="text-gray-400">Your balance has been updated.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="2547..."
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (KES)</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {PRESET_AMOUNTS.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setAmount(amt)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${amount === amt
                                                        ? "bg-emerald-500 text-black border-emerald-500"
                                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-emerald-500/50"
                                                    }`}
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-lg"
                                        required
                                        min={10}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === "loading" || !phone || !amount}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        "Pay Now"
                                    )}
                                </button>
                                <p className="text-center text-xs text-gray-500">
                                    Secured by IntaSend
                                </p>
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
