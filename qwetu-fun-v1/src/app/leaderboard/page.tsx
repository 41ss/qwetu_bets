"use client"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, User, Medal } from "lucide-react";
import Header from "@/components/Header";

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            const { data } = await supabase.from('leaderboard').select('*').limit(10);
            setLeaders(data || []);
            setLoading(false);
        };
        fetchLeaders();
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 pb-24">
            <Header />
            <div className="mt-24 max-w-md mx-auto">
                <h1 className="text-3xl font-black italic uppercase mb-8 flex items-center gap-3">
                    <Trophy className="text-yellow-500 w-8 h-8" /> Leaderboard
                </h1>

                <div className="space-y-3">
                    {leaders.map((leader, index) => (
                        <div key={leader.id} className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-xl font-black italic text-white/20 w-6">
                                    #{index + 1}
                                </span>
                                <div>
                                    <p className="font-bold">{leader.username || "Anonymous"}</p>
                                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">
                                        {leader.total_bets} Predictions Made
                                    </p>
                                </div>
                            </div>
                            {index < 3 && <Medal className={`w-6 h-6 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-400'}`} />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}