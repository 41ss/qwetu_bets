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
import { useAuth } from "@/contexts/AuthProvider";
import DepositModal from "./DepositModal";
import { initiateDeposit } from "@/lib/payments";

export default function Deck() {
    const { markets: dataMarkets, isLoading, usingMock } = useMarkets();
    // Local state to handle removed cards (swiped away)
    const [removedIds, setRemovedIds] = useState<string[]>([]);

    const { placeBet } = useGameStore();

    const markets = dataMarkets.filter(m => !removedIds.includes(m.id));

    const { user, balance, refreshBalance } = useAuth();
    // Payment Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [pendingIntent, setPendingIntent] = useState<{ id: string, intent: "YES" | "NO" } | null>(null);

    const handleSwipeIntent = (id: string, intent: "YES" | "NO" | "SKIP") => {
        if (intent === "SKIP") {
            setRemovedIds(prev => [...prev, id]);
            return;
        }

        // 1. GATEKEEPER: Check Balance
        if (balance < 50) {
            setDepositModalOpen(true);
            return;
        }

        // Interrupt for Payment
        const market = markets.find(m => m.id === id);
        if (!market) return;

        setPendingIntent({ id, intent });
        setModalOpen(true);
    };

    const handleDeposit = async (phone: string, amount: number) => {
        if (!user) {
            toast.error("Please login first!");
            return;
        }
        await initiateDeposit(amount, phone, user.verifierId || user.email, refreshBalance);
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

            <DepositModal
                isOpen={depositModalOpen}
                onClose={() => setDepositModalOpen(false)}
                onDeposit={handleDeposit}
            />

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
