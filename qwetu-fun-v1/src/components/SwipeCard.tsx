"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Copy, X, Check, SkipForward, Clock, Coins, User } from "lucide-react";
import { Market } from "@/data/markets";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/utils/betting";

type SwipeCardProps = {
    market: Market;
    active: boolean;
    onSwipeIntent: (id: string, intent: "YES" | "NO" | "SKIP") => void;
};

export default function SwipeCard({ market, active, onSwipeIntent }: SwipeCardProps) {
    const [exitX, setExitX] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const updateTimer = () => {
            setTimeLeft(formatDistanceToNow(new Date(market.endTime), { addSuffix: true }));
        };
        updateTimer();
        const timer = setInterval(updateTimer, 60000);
        return () => clearInterval(timer);
    }, [market.endTime]);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Overlay Opacities
    const yesOpacity = useTransform(x, [0, 100], [0, 1]);
    const noOpacity = useTransform(x, [-100, 0], [1, 0]);

    const handleDragEnd = (
        _: any,
        info: PanInfo
    ) => {
        const threshold = 100;
        const swipeDir = info.offset.x;
        const swipeUp = info.offset.y;

        if (swipeDir > threshold) {
            // Intent YES
            onSwipeIntent(market.id, "YES");
        } else if (swipeDir < -threshold) {
            // Intent NO
            onSwipeIntent(market.id, "NO");
        } else if (swipeUp < -threshold) {
            // Skip is instant
            setExitX(0);
            onSwipeIntent(market.id, "SKIP");
        }
    };

    return (
        <motion.div
            style={{
                x,
                y,
                rotate,
                opacity,
                position: "absolute",
                top: 0,
                cursor: "grab",
            }}
            whileTap={{ cursor: "grabbing" }}
            drag={active}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, opacity: 0.5, y: 10 }}
            animate={
                active
                    ? { scale: 1, opacity: 1, y: 0, x: 0 }
                    : { scale: 0.95, opacity: 0.5, y: 10 }
            }
            exit={{ x: exitX, opacity: 0, transition: { duration: 0.2 } }}
            className={`w-[340px] h-[500px] ${market.color} rounded-3xl shadow-2xl flex flex-col justify-between p-6 border-4 border-white/10 relative overflow-hidden`}
        >
            {/* Overlays */}
            <motion.div
                style={{ opacity: yesOpacity }}
                className="absolute inset-0 bg-green-500/80 rounded-3xl z-10 flex items-center justify-center pointer-events-none"
            >
                <Check className="text-white w-32 h-32 border-4 rounded-full p-4 border-white" />
            </motion.div>
            <motion.div
                style={{ opacity: noOpacity }}
                className="absolute inset-0 bg-red-500/80 rounded-3xl z-10 flex items-center justify-center pointer-events-none"
            >
                <X className="text-white w-32 h-32 border-4 rounded-full p-4 border-white" />
            </motion.div>

            {/* Timer Badge */}
            <div className="absolute top-6 left-6 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs font-bold text-white font-mono uppercase">Ends {timeLeft}</span>
            </div>

            {/* Content */}
            <div className="flex justify-between items-start z-20 mt-8">
                <span className="px-3 py-1 bg-black/20 rounded-full text-white text-xs font-medium backdrop-blur-md border border-white/5">
                    {market.category}
                </span>
                <div className="bg-white/10 p-2 rounded-full cursor-pointer hover:bg-white/20 transition">
                    <Copy className="text-white w-4 h-4" />
                </div>
            </div>

            <div className="z-20 mt-4 mb-auto">
                <h2 className="text-4xl font-bold text-white leading-tight font-display drop-shadow-md">
                    {market.question}
                </h2>
            </div>

            {/* Pool Badge */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-max">
                <div className="bg-white/10 backdrop-blur-xl px-6 py-2 rounded-full border border-white/20 shadow-lg flex items-center gap-2 animate-pulse">
                    <Coins className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white font-bold tracking-wide">Pool: {formatCurrency(market.poolAmount)}</span>
                </div>
            </div>

            {/* Footer Info */}
            <div className="flex justify-between items-end z-20 text-white/80 mt-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                        <User className="w-3 h-3" />
                        <span>{market.participantCount} Students voted</span>
                    </div>
                    <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 w-[60%]" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1 text-white/50">
                    <SkipForward className="w-6 h-6" />
                    <span className="text-[10px] uppercase tracking-wider">Skip</span>
                </div>
            </div>
        </motion.div>
    );
}
