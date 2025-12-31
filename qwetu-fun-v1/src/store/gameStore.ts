import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type BetResult = {
    outcome: "WIN" | "LOSS" | "PENDING";
    pointsChange: number;
};

type GameState = {
    points: number;
    streak: number;
    selectedStake: number;
    setPoints: (points: number) => void;
    setSelectedStake: (stake: number) => void;
    // Parameters strictly defined to prevent UUID conversion errors
    placeBet: (
        direction: "YES" | "NO" | "SKIP", 
        marketId: string, 
        authId: string
    ) => Promise<BetResult | null>;
    resetGame: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
    points: 0,
    streak: 0,
    selectedStake: 150,

    setPoints: (points) => set({ points }),
    setSelectedStake: (stake) => set({ selectedStake: stake }),

    placeBet: async (direction, marketId, authId) => {
        if (direction === "SKIP") return null;

        const currentPoints = get().points;
        const stake = get().selectedStake;

        // 1. Optimistic Update (Immediate UI feedback)
        set({ points: currentPoints - stake });

        try {
            // 2. RPC Call
            // NOTE: The keys p_market_id, p_direction, etc., must match the SQL parameters exactly
            const { data, error } = await supabase.rpc('place_bet', {
                p_market_id: marketId,
                p_direction: direction,
                p_stake: stake,
                p_auth_id: authId
            });

            if (error) throw error;

            // 3. Success Logic
            // In a parimutuel market, the outcome is always PENDING until the admin resolves it
            set(state => ({ streak: state.streak + 1 }));
            
            return { 
                outcome: "PENDING", 
                pointsChange: -stake 
            };

        } catch (error: any) {
            console.error("🚫 Bet Error Details:", error);
            
            // 4. Rollback Optimistic UI
            set({ points: currentPoints });

            // Handle specific PostgreSQL errors
            if (error.code === '22P02') {
                toast.error("System Error: Invalid ID Format");
            } else if (error.message?.includes("Insufficient balance")) {
                toast.error("Low Balance! Top up to continue.");
            } else {
                toast.error("Transaction failed. Please try again.");
            }

            return null;
        }
    },

    resetGame: () => {
        set({ points: 0, streak: 0 });
    },
}));