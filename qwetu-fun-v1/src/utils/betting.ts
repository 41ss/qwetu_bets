export const PLATFORM_FEE = 0.02; // 2%

export type BetBreakdown = {
    stake: number;
    grossWin: number;
    feeDeduction: number;
    netPayout: number;
    multiplier: number;
};

export const calculatePotentialWin = (
    stake: number,
    poolAmount: number,
    participantCount: number
): BetBreakdown => {
    // Simple simulation: Assume even odds if pool is small, else dynamic.
    // For demo, let's assume a fixed 1.96x payout (approx 2x minus fee) 
    // or calculate share based on pool.

    // Let's use a "Share of Pool" model simplified.
    // If you win, you get your stake back + share of loser's pool.
    // Simplified for UI: Win 2x your money minus fee.
    const multiplier = 2;

    const grossWin = stake * multiplier;
    const feeDeduction = grossWin * PLATFORM_FEE;
    const netPayout = grossWin - feeDeduction;

    return {
        stake,
        grossWin,
        feeDeduction,
        netPayout,
        multiplier
    };
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
};
