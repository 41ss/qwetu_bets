"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Check, SkipForward, Clock, Coins, User, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useGameStore } from "@/store/gameStore";
import { Market } from "@/hooks/useMarkets";

type SwipeCardProps = {
    market: Market;
    active: boolean;
    onSwipeIntent: (intent: "YES" | "NO" | "SKIP") => void;
};

export default function SwipeCard({ market, active, onSwipeIntent }: SwipeCardProps) {
    const { selectedStake } = useGameStore();
    const [timeLeft, setTimeLeft] = useState("");

    // 1. Sync Timer
    useEffect(() => {
        const updateTimer = () => {
            const date = new Date(market.end_time);
            setTimeLeft(formatDistanceToNow(date, { addSuffix: true }));
        };
        updateTimer();
        const timer = setInterval(updateTimer, 60000);
        return () => clearInterval(timer);
    }, [market.end_time]);

    // 2. Parimutuel Payout Logic
    const calculatePotential = (direction: 'YES' | 'NO') => {
        const yesPool = Number(market.pool_yes || 0);
        const noPool = Number(market.pool_no || 0);
        const totalPot = yesPool + noPool + selectedStake;
        const sidePool = (direction === 'YES' ? yesPool : noPool) + selectedStake;
        const share = selectedStake / sidePool;
        return Math.floor(share * totalPot * 0.95); // 5% fee
    };

    // 3. Multiplier Logic (e.g. "3.5x")
    const getMultiplier = (direction: 'YES' | 'NO') => {
        const yesPool = Number(market.pool_yes || 0);
        const noPool = Number(market.pool_no || 0);
        const totalPot = yesPool + noPool + selectedStake;
        
        // The side pool must include your potential stake
        const sidePool = (direction === 'YES' ? yesPool : noPool) + selectedStake;
        
        // Multiplier = (TotalPot * 0.95) / SidePool
        const multiplier = (totalPot * 0.95) / sidePool;
        
        return multiplier.toFixed(1) + "x";
    };

    const mainPotential = useMemo(() => calculatePotential('YES'), [market, selectedStake]);

    // Motion Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Overlay Opacities
    const yesOpacity = useTransform(x, [0, 100], [0, 1]);
    const noOpacity = useTransform(x, [-100, 0], [1, 0]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipeIntent("YES");
        } else if (info.offset.x < -threshold) {
            onSwipeIntent("NO");
        } else if (info.offset.y < -threshold) {
            onSwipeIntent("SKIP");
        }
    };

return (
    <motion.div
        style={{ x, y, rotate, opacity, position: "absolute", top: 0, cursor: active ? "grab" : "default" }}
        whileTap={active ? { cursor: "grabbing" } : {}}
        drag={active}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={active ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0.5, y: 15 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`w-[340px] h-[520px] bg-[#121212] rounded-[2.5rem] shadow-2xl flex flex-col justify-between p-6 border-2 border-white/5 relative overflow-hidden`}
    >
        {/* Swiping Overlays - Highly visible feedback */}
        <motion.div style={{ opacity: yesOpacity }} className="absolute inset-0 bg-green-500/20 z-30 pointer-events-none flex items-center justify-center">
            <Check className="text-green-400 w-32 h-32 border-8 rounded-full p-6 border-green-400 shadow-[0_0_50px_rgba(74,222,128,0.3)]" />
        </motion.div>
        <motion.div style={{ opacity: noOpacity }} className="absolute inset-0 bg-red-500/20 z-30 pointer-events-none flex items-center justify-center">
            <X className="text-red-400 w-32 h-32 border-8 rounded-full p-6 border-red-400 shadow-[0_0_50px_rgba(248,113,113,0.3)]" />
        </motion.div>

        {/* Header - Real-time Timer */}
        <div className="z-20 flex justify-between items-center">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-black text-white font-mono uppercase tracking-tighter">Ends {timeLeft}</span>
            </div>
            <div className="bg-white/10 p-2 rounded-full border border-white/5">
                <TrendingUp className="text-green-400 w-4 h-4" />
            </div>
        </div>

        {/* Question - Clean Center */}
        <div className="z-20 flex-1 flex items-center">
            <h2 className="text-4xl font-black text-white leading-[1.05] tracking-tight drop-shadow-2xl">
                {market.question}
            </h2>
        </div>

        {/* Dynamic Action Badges */}
        <div className="z-20 space-y-3 mb-2">
            <div className="flex gap-2.5">
                {/* YES BOX - Dynamic Multiplier */}
                <div className="bg-green-500/10 backdrop-blur-md p-3.5 rounded-[1.5rem] border border-green-500/20 text-center flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded-bl-lg shadow-lg">
                        {getMultiplier('YES')}
                    </div>
                    <p className="text-[9px] text-green-400 font-black uppercase tracking-widest mb-1 opacity-70">Payout YES</p>
                    <p className="text-white font-black text-base">KES {calculatePotential('YES')}</p>
                </div>

                {/* NO BOX - Dynamic Multiplier */}
                <div className="bg-red-500/10 backdrop-blur-md p-3.5 rounded-[1.5rem] border border-red-500/20 text-center flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-500 text-black text-[10px] font-black px-2 py-0.5 rounded-bl-lg shadow-lg">
                        {getMultiplier('NO')}
                    </div>
                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1 opacity-70">Payout NO</p>
                    <p className="text-white font-black text-base">KES {calculatePotential('NO')}</p>
                </div>
            </div>
        </div>

        {/* Footer - Social Proof */}
        <div className="z-20 flex justify-between items-center pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#121212] bg-white/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-white/40" />
                        </div>
                    ))}
                </div>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Live Pool</span>
            </div>
            <div className="flex flex-col items-center opacity-30">
                <SkipForward className="w-5 h-5 text-white" />
                <span className="text-[7px] font-black uppercase mt-1">Skip</span>
            </div>
        </div>

        {/* Stylized Background Image */}
        {market.image_url && (
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent z-10" />
                <img 
                    src={market.image_url} 
                    className="w-full h-full object-cover opacity-20 grayscale scale-110" 
                    alt="" 
                />
            </div>
        )}
    </motion.div>
);
}