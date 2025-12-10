'use client';
import React, { useState, useEffect } from 'react';
import { useUserAuth } from '@/hooks/useUserAuth';
import LoginScreen from '@/components/LoginScreen';
import DepositModal from '@/components/DepositModal';
import MarketCard from '@/components/MarketCard'; // New
import BetModal from '@/components/BetModal';     // New
import { Wallet, Plus, TrendingUp, LogOut, Loader2 } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';

// --- CONFIGURATION ---
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("FgzZbmGBW7y749xrgMWETpwH5DHBYhWmoed5jrvmGE5b");
// Mock Data (Replace with Supabase fetch later)
const MOCK_MARKETS = [
  {
    id: "market_01",
    question: "Will it rain in Nairobi tomorrow?",
    totalYes: 5.4,
    totalNo: 3.2,
    feePercentage: 200, // 2%
  },
  {
    id: "market_02",
    question: "Will Arsenal win against Chelsea?",
    totalYes: 12.5,
    totalNo: 8.1,
    feePercentage: 200,
  }
];

export default function QwetuBetsApp() {
  const { isLoading, isAuthenticated, user, keypair, error, authenticate, logout, refreshUser, getBalance } = useUserAuth();
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Betting State
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<number>(1); // 1=Yes, 2=No
  const [showBetModal, setShowBetModal] = useState(false);
  
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Solana Connection
  const connection = new Connection(RPC_URL, "confirmed");

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
  }, [isAuthenticated]);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const sol = await getBalance();
      setBalance(sol);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleDepositSuccess = async () => {
    await fetchBalance();
    await refreshUser();
  };

  // Triggered when user clicks YES/NO on a card
  const handleOpenBetModal = (vote: number, marketId: string) => {
    setSelectedVote(vote);
    setSelectedMarket(marketId);
    setShowBetModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <TrendingUp className="text-white" size={32} />
          </div>
          <p className="text-gray-600">Loading Qwetu Bets...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onAuthenticate={authenticate}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 w-10 h-10 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Qwetu Bets</h1>
                <p className="text-xs text-gray-500">{user?.phoneNumber}</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-gray-700 transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={20} />
              <span className="text-sm opacity-90">Your Balance</span>
            </div>
            <button onClick={fetchBalance} disabled={loadingBalance} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition flex items-center gap-1">
              {loadingBalance && <Loader2 size={12} className="animate-spin" />}
              {loadingBalance ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="mb-6">
            <div className="text-4xl font-bold mb-1">
              {balance !== null ? `${balance.toFixed(4)} SOL` : '---'}
            </div>
            <div className="text-sm opacity-75">
              ≈ KES {balance !== null ? (balance * 10000).toLocaleString('en-KE', { maximumFractionDigits: 0 }) : '---'}
            </div>
          </div>
          <button
            onClick={() => setShowDepositModal(true)}
            className="w-full bg-white text-emerald-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Deposit with M-Pesa
          </button>
        </div>

        {/* ACTIVE MARKETS */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🔥 Active Markets
          </h2>
          
          <div className="space-y-4">
            {MOCK_MARKETS.map((market) => (
              <MarketCard
                key={market.id}
                marketId={market.id}
                question={market.question}
                totalYes={market.totalYes}
                totalNo={market.totalNo}
                feePercentage={market.feePercentage}
                onBet={handleOpenBetModal}
              />
            ))}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        userId={user!.id}
        phoneNumber={user!.phoneNumber}
        onSuccess={handleDepositSuccess}
      />

      {keypair && selectedMarket && (
        <BetModal
          isOpen={showBetModal}
          onClose={() => setShowBetModal(false)}
          marketId={selectedMarket}
          vote={selectedVote}
          keypair={keypair}
          connection={connection}
          programId={PROGRAM_ID}
          onSuccess={() => {
            fetchBalance();
            // TODO: Refresh market data from Supabase
          }}
        />
      )}
    </div>
  );
}