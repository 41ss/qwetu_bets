"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Market } from "@/data/markets";
import SwipeCard from "./SwipeCard";
import { RefreshCcw } from "lucide-react";
import PaymentModal from "./PaymentModal";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/gameStore";
import { useMarkets } from "@/hooks/useMarkets";
import SkeletonCard from "./SkeletonCard";

export default function Deck() {
    const { markets: dataMarkets, isLoading, usingMock } = useMarkets();
    // Local state to handle removed cards (swiped away)
    const [removedIds, setRemovedIds] = useState<string[]>([]);

    const { placeBet } = useGameStore();

    const markets = dataMarkets.filter(m => !removedIds.includes(m.id));

    // Payment Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingIntent, setPendingIntent] = useState<{ id: string, intent: "YES" | "NO" } | null>(null);

    const handleSwipeIntent = (id: string, intent: "YES" | "NO" | "SKIP") => {
        if (intent === "SKIP") {
            setRemovedIds(prev => [...prev, id]);
            return;
        }

        // Interrupt for Payment
        const market = markets.find(m => m.id === id);
        if (!market) return;

        setPendingIntent({ id, intent });
        setModalOpen(true);
    };

    const handleConfirmPayment = () => {
        if (!pendingIntent) return;

        const { id, intent } = pendingIntent;

        // Process "Payment" (Game Store logic)
        const result = placeBet(intent);

        setModalOpen(false);

        // Simulate API delay / Payment processing visual
        setTimeout(() => {
            if (result?.outcome === "WIN") {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                toast.success(`Payment Success! You Won +${result.pointsChange} pts`, { icon: '💸' });
            } else {
                toast.error(`Payment Success! But you lost...`, { icon: '📉' });
            }

            // Remove card
            setRemovedIds(prev => [...prev, id]);
            setPendingIntent(null);
        }, 500);
    };

    const resetDeck = () => {
        setRemovedIds([]);
    };

    if (isLoading) {
        return (
            <div className="relative w-full max-w-md h-[600px] flex items-center justify-center">
                <SkeletonCard />
            </div>
        );
    }

    const currentMarket = markets[0];

    return (
        <div className="relative w-full max-w-md h-[600px] flex items-center justify-center">
            <AnimatePresence>
                {markets.map((market, index) => {
                    const isTop = index === 0;
                    return (
                        <SwipeCard
                            key={market.id}
                            market={market}
                            active={isTop}
                            onSwipeIntent={handleSwipeIntent}
                        />
                    );
                }).reverse()}
                {/* Reverse so first in array is on top visually (z-index natural stacking context works opposite usually, later in DOM = higher)
            Wait, if I render cards, the last one in DOM is on top.
            If markets[0] is top card, I want it last in DOM?
            Or I control z-index.
            Let's use .reverse() to render:
            [0, 1, 2] -> [2, 1, 0]
            DOM: 2 (bottom), 1 (middle), 0 (top).
            Correct.
        */}
            </AnimatePresence>

            {currentMarket && pendingIntent && (
                <PaymentModal
                    isOpen={modalOpen}
                    onCancel={() => setModalOpen(false)}
                    onConfirm={handleConfirmPayment}
                    market={currentMarket}
                    stake={50}
                    intent={pendingIntent.intent}
                />
            )}

            {markets.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <h2 className="text-3xl font-display font-bold text-white mb-4">You're all caught up!</h2>
                    <p className="text-white/60 mb-8">No more predictions for now.</p>
                    <button
                        onClick={resetDeck}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Start Over
                    </button>
                </div>
            )}
        </div>
    );
}
