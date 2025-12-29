import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Market, markets as mockMarkets } from "@/data/markets";

const fetcher = async () => {
    // Try detailed fetch first
    const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("status", "ACTIVE");

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        return [];
    }

    return data.map((item: any) => ({
        id: item.id.toString(),
        question: item.question,
        category: item.category || "General",
        color: item.color || "bg-gray-800",
        poolAmount: item.pool_amount || 0,
        endTime: item.end_time || new Date().toISOString(),
        participantCount: (item.yes_count || 0) + (item.no_count || 0),
    })) as Market[];
};

export function useMarkets() {
    const { data, error, isLoading } = useSWR("markets", fetcher, {
        revalidateOnFocus: false,
        shouldRetryOnError: false, // Don't retry infinitely if DB is down
    });

    // Fallback Logic
    const shouldUseMock = error || (data && data.length === 0);
    const finalMarkets: Market[] = shouldUseMock ? mockMarkets : (data || []);

    return {
        markets: finalMarkets,
        isLoading: isLoading && !error && !data, // Only loading if no data AND no error
        isError: !!error,
        usingMock: shouldUseMock
    };
}
