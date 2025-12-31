"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

import SwipeCard from "./SwipeCard";
import PaymentModal from "./PaymentModal";
import DepositModal from "./DepositModal";
import SkeletonCard from "./SkeletonCard";
import StakeSelector from "./StakeSelector";

import { useGameStore } from "@/store/gameStore";
import { useMarkets } from "@/hooks/useMarkets";
import { useAuth } from "@/contexts/AuthProvider";
import { initiateDeposit } from "@/lib/payments";

export default function Deck() {
    // 1. Fetch real markets from Supabase
    const { markets: dataMarkets, isLoading } = useMarkets();
    const [removedIds, setRemovedIds] = useState<string[]>([]);

    // Filter cards to only show those not swiped
    const activeMarkets = dataMarkets.filter(m => !removedIds.includes(m.id));

    const { user, balance, refreshBalance } = useAuth();
    const { setPoints, placeBet, selectedStake } = useGameStore();

    // Sync local store balance with Auth balance
    useEffect(() => {
        setPoints(balance);
    }, [balance, setPoints]);

    // Modal States
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [pendingIntent, setPendingIntent] = useState<{ id: string, intent: "YES" | "NO" } | null>(null);

    // 2. The High-Level Swipe Handler
    const handleSwipe = async (id: string, intent: "YES" | "NO" | "SKIP") => {
        if (intent === "SKIP") {
            setRemovedIds(prev => [...prev, id]);
            return;
        }

        // Check if current balance covers the stake selected in StakeSelector
        if (balance < selectedStake) {
            setPendingIntent({ id, intent });
            setDepositModalOpen(true);
            return;
        }

        // Open confirmation modal
        setPendingIntent({ id, intent });
        setConfirmModalOpen(true);
    };

    const handleConfirmBet = async () => {
        if (!pendingIntent || !user) return;

        const { id, intent } = pendingIntent;
        setConfirmModalOpen(false);

        // Execute the RPC call to public.place_bet
        const success = await placeBet(intent, id, user.verifierId || user.email);

        if (success) {
            toast.success(`KES ${selectedStake} bet on ${intent}!`, { icon: '🔥' });
            setRemovedIds(prev => [...prev, id]);
            refreshBalance(); // Trigger balance refresh from DB
        }

        setPendingIntent(null);
    };

    const resetDeck = () => setRemovedIds([]);

    if (isLoading) return <SkeletonCard />;

    // Helper to get the market data for the modal
    const currentPendingMarket = activeMarkets.find(m => m.id === pendingIntent?.id);

    return (
        <div className="relative w-full max-w-md h-[600px] flex flex-col items-center justify-center">

            <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence>
                    {activeMarkets.length > 0 ? (
                        activeMarkets.map((market, index) => {
                            const isTop = index === 0;
                            return (
                                <SwipeCard
                                    key={market.id}
                                    market={market}
                                    active={isTop}
                                    // Use the unified handler
                                    onSwipeIntent={(intent) => handleSwipe(market.id, intent as "YES" | "NO" | "SKIP")}

                                />
                            );
                        }).reverse()
                    ) : (
                        <div className="flex flex-col items-center text-center p-8 animate-in fade-in zoom-in">
                            <h2 className="text-2xl font-bold text-white mb-2">Caught Up!</h2>
                            <p className="text-white/60 mb-6">No more predictions available.</p>
                            <button
                                onClick={resetDeck}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold"
                            >
                                <RefreshCcw className="w-4 h-4" /> Start Over
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Stake selection bar (150, 300, 500, Custom) */}
            <div className="flex items-center justify-center w-full relative">
                <StakeSelector />
            </div>

            {/* Confirmation Modal */}
            {currentPendingMarket && pendingIntent && (
                <PaymentModal
                    isOpen={confirmModalOpen}
                    onCancel={() => {
                        setConfirmModalOpen(false);
                        setPendingIntent(null);
                    }}
                    onConfirm={handleConfirmBet}
                    market={currentPendingMarket} // TS is happy now because of the check above
                    stake={selectedStake}
                    intent={pendingIntent.intent} // TS is happy because pendingIntent is verified
                />
            )}

            {/* Deposit Modal (Fonbnk Iframe) */}
            <DepositModal
                isOpen={depositModalOpen}
                onClose={() => setDepositModalOpen(false)}
            />
        </div>
    );
}