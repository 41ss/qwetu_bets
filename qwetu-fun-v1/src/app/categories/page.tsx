"use client";

import { useState } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { useAuth } from "@/contexts/AuthProvider";
import SwipeCard from "@/components/SwipeCard";
import Header from "@/components/Header";
import { LayoutGrid, Trophy, Users, Landmark, Sparkles, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";

const CATEGORIES = [
    { id: 'All', icon: LayoutGrid, color: 'text-white' },
    { id: 'Sports', icon: Trophy, color: 'text-orange-500' },
    { id: 'Social', icon: Users, color: 'text-blue-500' },
    { id: 'Politics', icon: Landmark, color: 'text-red-500' },
    { id: 'Pop Culture', icon: Sparkles, color: 'text-purple-500' },
];

export default function CategoriesPage() {
    const { user } = useAuth();
    const { markets, isLoading } = useMarkets(user?.id);
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Filter logic
    const filteredMarkets = selectedCategory === 'All' 
        ? markets 
        : markets.filter(m => m.category === selectedCategory);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 pb-32 overflow-x-hidden">
            <Header />

            <main className="mt-24 max-w-md mx-auto">
                <h1 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">
                    Browse <span className="text-blue-500">Markets</span>
                </h1>

                {/* Category Pill Selector */}
                <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all whitespace-nowrap font-bold text-sm ${
                                selectedCategory === cat.id 
                                ? "bg-white text-black border-white" 
                                : "bg-[#121212] text-white/40 border-white/5 hover:border-white/20"
                            }`}
                        >
                            <cat.icon className={`w-4 h-4 ${selectedCategory === cat.id ? 'text-black' : cat.color}`} />
                            {cat.id}
                        </button>
                    ))}
                </div>

                {/* Results Grid */}
                <div className="grid gap-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-white/20 font-bold uppercase text-xs">Loading {selectedCategory}...</p>
                        </div>
                    ) : filteredMarkets.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {filteredMarkets.map((market) => (
                                // Reusing SwipeCard but in a "Static/Preview" mode or a new MarketListItem component
                                <div key={market.id} className="bg-[#121212] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
                                     <div className="absolute top-4 right-4 bg-white/5 px-2 py-1 rounded-md text-[8px] font-black uppercase text-white/40 border border-white/5">
                                        {market.category}
                                    </div>
                                    <h3 className="text-xl font-bold leading-tight mb-4 pr-12">{market.question}</h3>
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-white/20 uppercase">Total Pool</span>
                                            <span className="font-mono font-bold text-green-400">KES {Number(market.pool_yes) + Number(market.pool_no)}</span>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href = '/'} // Redirect to Deck to swipe
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-colors uppercase italic"
                                        >
                                            Predict Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
                            <p className="text-white/20 font-bold italic uppercase">No {selectedCategory} markets currently active</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}