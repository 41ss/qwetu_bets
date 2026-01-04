"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const { walletAddress, user } = useAuth();
    const [amount, setAmount] = useState<number | "">("");
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIframeUrl(null);
            setAmount("");
            setLoading(false);
        }
    }, [isOpen]);

    const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !walletAddress) return;
    console.log("MY WALLET ADDRESS:", walletAddress);

    setLoading(true);
    try {
        // A. Send address to backend so it can be included in the signature
        const res = await fetch('/api/integrations/fonbnk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: Number(amount),
                address: walletAddress, // CRITICAL
                metadata: { user_id: user?.id || "unknown" }
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signing failed");

        // B. Build URL - Values must be identical to the JWT payload
        const baseUrl = "https://sandbox-pay.fonbnk.com";
        const params = new URLSearchParams({
            source: "fVwMdraP",
            signature: data.signature,
            network: "SOLANA",
            asset: "USDC",
            address: walletAddress,
            amount: amount.toString(),
            currency: "local",
            countryIsoCode: "KE",
            redirectUrl: window.location.origin
        });

        setIframeUrl(`${baseUrl}?${params.toString()}`);
    } catch (error: any) {
        alert(error.message);
    } finally {
        setLoading(false);
    }
};


    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/10 rounded-t-3xl shadow-2xl md:static md:max-w-md md:m-auto md:rounded-3xl"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Top Up Balance</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6">
                            {iframeUrl ? (
                                // THE WIDGET IFRAME
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white h-[600px] relative">
                                    <iframe
                                        src={iframeUrl}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        allow="payment"
                                    />
                                    <button
                                        onClick={() => setIframeUrl(null)}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs hover:bg-black"
                                    >
                                        Cancel / Change Amount
                                    </button>
                                </div>
                            ) : (
                                // THE AMOUNT SELECTOR
                                <form onSubmit={handleProceed} className="space-y-6">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[200, 500, 1000].map((amt) => (
                                            <button
                                                key={amt} type="button" onClick={() => setAmount(amt)}
                                                className={`py-3 rounded-xl text-sm font-bold border transition-all ${amount === amt ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-400"
                                                    }`}
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">KES</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(Number(e.target.value))}
                                            placeholder="Enter Amount"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-14 pr-4 py-4 text-white text-lg font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !amount || Number(amount) < 200}
                                        className="w-full bg-[#25D366] text-black font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : "Pay with M-Pesa"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}