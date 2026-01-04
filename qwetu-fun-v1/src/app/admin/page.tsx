"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Check, X, Trash2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useMarkets } from "@/hooks/useMarkets";

export default function AdminPage() {
    const { user } = useAuth();
    const { markets, isLoading } = useMarkets();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [question, setQuestion] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [hours, setHours] = useState("24");
    const [category, setCategory] = useState("");

    // 1. SECURITY: Basic email gate (Replace with your actual email)
    if (!user || user.email !== "keaganmuhia@gmail.com") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold">
                ⛔ ACCESS DENIED
            </div>
        );
    }

    // 2. CREATE MARKET
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const endTime = new Date();
        endTime.setHours(endTime.getHours() + Number(hours));

        const { error } = await supabase.from('markets').insert({
            question,
            image_url: imageUrl,
            category,
            end_time: endTime.toISOString(),
            status: 'ACTIVE',
            pool_yes: 0,
            pool_no: 0
        });

        if (error) toast.error(error.message);
        else {
            toast.success("Market Created!");
            setQuestion("");
            setImageUrl("");
        }
        setIsSubmitting(false);
    };

    // 3. RESOLVE MARKET (The Money Shot)
    const handleResolve = async (marketId: string, outcome: "YES" | "NO") => {
        if (!confirm(`Are you sure ${outcome} won? This triggers payouts!`)) return;

        const { error } = await supabase.rpc('resolve_market', {
            p_market_id: marketId,
            p_outcome: outcome
        });

        if (error) {
            console.error(error);
            toast.error("Resolution Failed");
        } else {
            toast.success(`Market resolved ${outcome}! Payouts sent.`);
        }
    };

    return (
        <div className="min-h-screen bg-black p-8 pb-32 overflow-y-auto">
            <h1 className="text-3xl font-black text-white mb-8 border-b border-white/10 pb-4">
                👑 ADMIN DASHBOARD
            </h1>

            {/* CREATOR SECTION */}
            <div className="bg-[#121212] p-6 rounded-3xl border border-white/10 mb-12">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-400" /> Create New Market
                </h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <input 
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Question (e.g. Will it rain today?)"
                        className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white focus:border-green-500 outline-none"
                    />
                    <div className="flex gap-4">
                        <input 
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="Image URL (Unsplash)"
                            className="flex-1 bg-black/50 border border-white/20 p-4 rounded-xl text-white"
                        />
                        <select 
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="bg-black/50 border border-white/20 p-4 rounded-xl text-white"
                        >
                            <option value="Social">Social</option>
                            <option value="Sports">Sports</option>
                            <option value="Politics">Politics</option>
                        </select>
                        
                        <select 
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            className="bg-black/50 border border-white/20 p-4 rounded-xl text-white"
                        >
                            <option value="1">1 Hour</option>
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="168">1 Week</option>
                        </select>
                    </div>
                    <button 
                        disabled={isSubmitting}
                        className="w-full bg-green-500 text-black font-bold py-4 rounded-xl hover:bg-green-400 transition"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Launch Market"}
                    </button>
                </form>
            </div>

            {/* RESOLVER SECTION */}
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" /> Active Markets
            </h2>
            
            <div className="grid gap-4">
                {isLoading ? <Loader2 className="animate-spin text-white"/> : markets.map(market => (
                    <div key={market.id} className="bg-[#121212] p-6 rounded-2xl border border-white/10 flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-bold text-lg">{market.question}</h3>
                            <p className="text-white/40 text-sm mt-1">
                                Pool: KES {market.pool_yes + market.pool_no} | YES: {market.pool_yes} / NO: {market.pool_no}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleResolve(market.id, "YES")}
                                className="px-4 py-2 bg-green-500/20 text-green-400 font-bold rounded-lg hover:bg-green-500 hover:text-black border border-green-500/50"
                            >
                                WIN YES
                            </button>
                            <button 
                                onClick={() => handleResolve(market.id, "NO")}
                                className="px-4 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500 hover:text-black border border-red-500/50"
                            >
                                WIN NO
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}