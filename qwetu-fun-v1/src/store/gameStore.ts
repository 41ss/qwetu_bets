import { create } from "zustand";

type BetResult = {
    outcome: "WIN" | "LOSS";
    pointsChange: number;
};

type GameState = {
    points: number;
    streak: number;
    // Actions
    placeBet: (direction: "YES" | "NO" | "SKIP") => BetResult | null;
    resetGame: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
    points: 1000,
    streak: 0,

    placeBet: (direction) => {
        if (direction === "SKIP") return null;

        const currentPoints = get().points;
        const cost = 50;

        // Deduct cost
        // For demo, allow negative? Let's stop at 0 ideally, but for "fun" maybe just go negative or stop.
        // Let's allow negative for now to not block interaction.

        let newPoints = currentPoints - cost;
        let newStreak = get().streak;
        let result: BetResult;

        // 40% Chance to Win
        const isWin = Math.random() < 0.4;

        if (isWin) {
            newPoints += 100; // Net +50
            newStreak += 1;
            result = { outcome: "WIN", pointsChange: 50 };
        } else {
            newStreak = 0;
            result = { outcome: "LOSS", pointsChange: -50 };
        }

        set({ points: newPoints, streak: newStreak });
        return result;
    },

    resetGame: () => {
        set({ points: 1000, streak: 0 });
    },
}));
