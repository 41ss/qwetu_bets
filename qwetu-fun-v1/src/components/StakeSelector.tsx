"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, X, Check } from "lucide-react";

const PRESET_STAKES = [150, 300, 500];

export default function StakeSelector() {
    const { selectedStake, setSelectedStake } = useGameStore();
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customAmount, setCustomAmount] = useState<string>("");

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(customAmount);
        if (amt >= 150) {
            setSelectedStake(amt);
            setIsCustomOpen(false);
            setCustomAmount("");
        }
    };

    return (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center gap-1.5 pointer-events-auto shadow-2xl">
                {PRESET_STAKES.map((stake) => (
                    <button
                        key={stake}
                        onClick={() => setSelectedStake(stake)}
                        className={`relative px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedStake === stake
                            ? "bg-white text-black shadow-lg"
                            : "text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                    >
                        {selectedStake === stake && (
                            <motion.div
                                layoutId="activeStake"
                                className="absolute inset-0 bg-white rounded-full -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{stake}</span>
                    </button>
                ))}

                <div className="w-px h-4 bg-white/20 mx-1" />

                <div className="relative">
                    <button
                        onClick={() => setIsCustomOpen(!isCustomOpen)}
                        className={`px-3 py-2 rounded-full transition-colors ${!PRESET_STAKES.includes(selectedStake)
                            ? "bg-emerald-500 text-black"
                            : "text-white/60 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        {!PRESET_STAKES.includes(selectedStake) ? (
                            <span className="text-xs font-bold font-mono">{selectedStake}</span>
                        ) : (
                            <Settings2 className="w-4 h-4" />
                        )}
                    </button>

                    <AnimatePresence>
                        {isCustomOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-white/20 rounded-2xl p-4 w-48 shadow-xl"
                            >
                                <form onSubmit={handleCustomSubmit}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] uppercase text-white/50 tracking-wider font-bold">Custom Bet</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomOpen(false)}
                                            className="text-white/40 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="relative mb-2">
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            placeholder="Min 150"
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-white/20"
                                            min={150}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!customAmount || Number(customAmount) < 150}
                                        className="w-full bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 text-black text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                                    >
                                        <Check className="w-3 h-3" />
                                        Set Stake
                                    </button>
                                </form>
                                {/* Triangle Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1A1A1A]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
