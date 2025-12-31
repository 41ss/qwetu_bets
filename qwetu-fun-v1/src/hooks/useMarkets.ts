import { useEffect } from "react";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";

// 1. Define and Export the Market Interface
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

export function useMarkets() {
    const fetcher = async () => {
        const { data, error } = await supabase
            .from("markets")
            .select("*")
            .eq("status", "ACTIVE")
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Ensure numbers are treated as numbers
        return (data || []).map(m => ({
            ...m,
            pool_yes: Number(m.pool_yes || 0),
            pool_no: Number(m.pool_no || 0)
        }));
    };

    const { data: markets, error, isLoading } = useSWR("active_markets", fetcher);

    useEffect(() => {
        const channel = supabase
            .channel('market_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'markets' },
                () => {
                    mutate("active_markets");
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return {
        markets: (markets || []) as Market[],
        isLoading,
        isError: !!error
    };
}