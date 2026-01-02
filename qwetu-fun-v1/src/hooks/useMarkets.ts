import { useEffect } from "react";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";

export interface Market {
    id: string;
    question: string;
    category?: string;
    color?: string;
    pool_yes: number;
    pool_no: number;
    end_time: string;
    image_url?: string;
    status: "ACTIVE" | "LOCKED" | "RESOLVED";
    outcome?: "YES" | "NO";
}

// Accept userId to filter out already-placed bets
export function useMarkets(userId?: string) {
    const fetcher = async () => {
        // Step A: Find markets where the user ALREADY has a bet
        let excludedIds: string[] = [];
        
        if (userId) {
            const { data: userBets } = await supabase
                .from("bets")
                .select("market_id")
                .eq("user_id", userId);
            
            if (userBets) {
                excludedIds = userBets.map(b => b.market_id);
            }
        }

        // Step B: Fetch ACTIVE markets not in the excluded list
        let query = supabase
            .from("markets")
            .select("*")
            .eq("status", "ACTIVE");

        if (excludedIds.length > 0) {
            query = query.not("id", "in", `(${excludedIds.join(",")})`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        
        return (data || []).map(m => ({
            ...m,
            pool_yes: Number(m.pool_yes || 0),
            pool_no: Number(m.pool_no || 0)
        }));
    };

    // Include userId in the SWR key so it refetches when the user logs in
    const { data: markets, error, isLoading } = useSWR(
        userId ? ["active_markets", userId] : "active_markets_guest", 
        fetcher
    );

    useEffect(() => {
        const channel = supabase
            .channel('market_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets' }, () => {
                mutate(userId ? ["active_markets", userId] : "active_markets_guest");
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    return {
        markets: (markets || []) as Market[],
        isLoading,
        isError: !!error,
        // Exporting mutate so the Deck can refresh after a bet is confirmed
        refresh: () => mutate(userId ? ["active_markets", userId] : "active_markets_guest")
    };
}