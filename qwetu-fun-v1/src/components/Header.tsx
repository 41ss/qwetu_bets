"use client";

import { useGameStore } from "@/store/gameStore";
import { Sparkles, Flame, Coins, LogIn, LogOut, Wallet, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";

export default function Header() {
    const { points, streak } = useGameStore();
    const { user, login, logout, balance, isLoading } = useAuth();
    const [prevPoints, setPrevPoints] = useState(points);

    // Animation trigger for points change
    const isPointsChanged = prevPoints !== points;

    useEffect(() => {
        if (isPointsChanged) {
            const timer = setTimeout(() => setPrevPoints(points), 300);
            return () => clearTimeout(timer);
        }
    }, [points, isPointsChanged]);


    return (
        <header className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none">
            <div className="flex items-center gap-6 pointer-events-auto">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="text-black w-5 h-5 fill-current" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-white tracking-tight hidden sm:block">
                        Qwetu<span className="text-purple-400">Fun</span>
                    </h1>
                </Link>

                <nav className="hidden md:flex items-center gap-4">
                    <Link href="/activity" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Activity
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Streak Badge (Only show if streak > 0) */}
                <AnimatePresence>
                    {streak >= 3 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 rounded-full text-white font-bold text-sm shadow-orange-500/50 shadow-lg border border-orange-400/50"
                        >
                            <Flame className="w-4 h-4 fill-current animate-pulse" />
                            <span>{streak}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Authentication State */}
                {isLoading ? (
                    <div className="w-24 h-8 bg-white/10 rounded-full animate-pulse" />
                ) : user ? (
                    <>
                        {/* Real Balance */}
                        <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-400 font-mono font-bold text-sm">
                            <Wallet className="w-3.5 h-3.5" />
                            <span>KES {balance.toLocaleString()}</span>
                        </div>

                        {/* User Profile / Logout */}
                        <div className="flex items-center gap-2">
                            {user.profileImage ? (
                                <img src={user.profileImage} alt="User" className="w-9 h-9 rounded-full border-2 border-white/20" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold border-2 border-white/20">
                                    {user.name?.charAt(0) || "U"}
                                </div>
                            )}
                            <button
                                onClick={logout}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                ) : (
                    <button
                        onClick={login}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
                    >
                        <LogIn className="w-4 h-4" />
                        Login
                    </button>
                )}
            </div>
        </header>
    );
}
