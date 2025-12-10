import { useState } from "react";
import { BN } from "@coral-xyz/anchor";

interface MarketProps {
  marketId: string;
  question: string;
  totalYes: number; // in SOL
  totalNo: number; // in SOL
  feePercentage: number; // e.g., 200 (2%)
  onBet: (vote: number, marketId: string) => void;
}

export default function MarketCard({ 
  marketId, 
  question, 
  totalYes, 
  totalNo, 
  feePercentage,
  onBet 
}: MarketProps) {
  const totalVolume = totalYes + totalNo;
  
  // Quant Logic: Calculate Implied Probability
  // Handle 0 volume edge case to avoid NaN
  const yesPercent = totalVolume > 0 ? (totalYes / totalVolume) * 100 : 50;
  const noPercent = 100 - yesPercent;

  // Calculate "Multipliers" (e.g., 2.1x Payout)
  // If I bet on YES, I win a share of NO.
  // Multiplier ≈ Total / Yes
  const yesMultiplier = totalYes > 0 ? (totalVolume / totalYes).toFixed(2) : "2.00";
  const noMultiplier = totalNo > 0 ? (totalVolume / totalNo).toFixed(2) : "2.00";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 border border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-bold text-lg text-gray-800 leading-tight">{question}</h3>
        <div className="flex justify-between mt-2 text-xs text-gray-500 uppercase font-semibold">
          <span>Vol: {totalVolume.toFixed(2)} SOL</span>
          <span>Fee: {(feePercentage / 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="flex h-4 w-full">
        <div 
          style={{ width: `${yesPercent}%` }} 
          className="bg-green-500 transition-all duration-500"
        />
        <div 
          style={{ width: `${noPercent}%` }} 
          className="bg-red-500 transition-all duration-500"
        />
      </div>

      {/* Betting Buttons */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <button
          onClick={() => onBet(1, marketId)}
          className="p-4 hover:bg-green-50 transition-colors active:bg-green-100 group"
        >
          <div className="text-green-600 font-bold text-lg">YES</div>
          <div className="text-xs text-gray-400 font-medium">
            {yesPercent.toFixed(0)}% chance
          </div>
          <div className="mt-1 text-sm font-bold text-green-700 bg-green-100 py-1 px-2 rounded-full inline-block">
            {yesMultiplier}x Payout
          </div>
        </button>

        <button
          onClick={() => onBet(2, marketId)}
          className="p-4 hover:bg-red-50 transition-colors active:bg-red-100 group"
        >
          <div className="text-red-600 font-bold text-lg">NO</div>
          <div className="text-xs text-gray-400 font-medium">
            {noPercent.toFixed(0)}% chance
          </div>
          <div className="mt-1 text-sm font-bold text-red-700 bg-red-100 py-1 px-2 rounded-full inline-block">
            {noMultiplier}x Payout
          </div>
        </button>
      </div>
    </div>
  );
}