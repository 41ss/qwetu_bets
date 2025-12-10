// hooks/usePlaceBet.ts
// React hook for placing bets with V2 contract

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import IDL  from '@/utils/idl.json';

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

interface PlaceBetParams {
  marketPubkey: string;
  vote: 1 | 2; // 1=YES, 2=NO
  amountSol: number;
  userId: string; // From your users table
}

interface PlaceBetResult {
  success: boolean;
  signature?: string;
  error?: string;
  newYesPool?: number;
  newNoPool?: number;
}

export function usePlaceBet() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isPlacing, setIsPlacing] = useState(false);

  const placeBet = async (params: PlaceBetParams): Promise<PlaceBetResult> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPlacing(true);

    try {
      const { marketPubkey, vote, amountSol, userId } = params;
      const amountLamports = Math.round(amountSol * 1e9);

      // Create provider (read-only, we'll sign manually)
      const provider = new AnchorProvider(
        connection,
        // @ts-ignore - We don't need full wallet interface for reading
        { publicKey },
        { commitment: 'confirmed' }
      );

const program = new Program(IDL as any, provider);

      // Derive market PDA (assuming your contract uses seeds)
      const marketPubKey = new PublicKey(marketPubkey);
      
      // Find user's bet account PDA (if your contract uses one)
      // Adjust seeds based on your actual contract implementation
      const [betAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bet'),
          marketPubKey.toBuffer(),
          publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Build transaction
      const tx = await program.methods
        .placeBet(vote, new BN(amountLamports))
        .accounts({
          market: marketPubKey,
          betAccount: betAccount,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Send and confirm
      const signature = await sendTransaction(tx, connection);
      console.log('Transaction sent:', signature);

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      }, 'confirmed');

      console.log('Transaction confirmed:', signature);

      // Fetch transaction details to get event data
      const txInfo = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      // Parse event logs to extract BetPlaced event data
      // NOTE: This is a simplified version - you'll need to parse actual event logs
      let newYesPool = 0;
      let newNoPool = 0;

      if (txInfo?.meta?.logMessages) {
        // Parse logs for BetPlaced event
        // Format: "Program log: BetPlaced { market_id: ..., amount: ..., new_total_yes: ..., new_total_no: ... }"
        const betPlacedLog = txInfo.meta.logMessages.find(log => log.includes('BetPlaced'));
        if (betPlacedLog) {
          // Extract new_total_yes and new_total_no from log
          // This is pseudo-code - adjust based on actual log format
          const yesMatch = betPlacedLog.match(/new_total_yes:\s*(\d+)/);
          const noMatch = betPlacedLog.match(/new_total_no:\s*(\d+)/);
          if (yesMatch) newYesPool = parseInt(yesMatch[1]) / 1e9;
          if (noMatch) newNoPool = parseInt(noMatch[1]) / 1e9;
        }
      }

      // Log bet to database
      await fetch('/api/bets/place', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketPubkey,
          transactionSignature: signature,
          vote,
          amountSol,
          newYesPool,
          newNoPool,
          walletAddress: publicKey.toString(),
          slot: txInfo?.slot,
          blockTime: txInfo?.blockTime,
        }),
      });

      setIsPlacing(false);

      return {
        success: true,
        signature,
        newYesPool,
        newNoPool,
      };

    } catch (error) {
      console.error('Place bet error:', error);
      setIsPlacing(false);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  };

  return {
    placeBet,
    isPlacing,
  };
}

// Helper hook to fetch user's current bets
export function useUserBets(userId: string | null) {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBets = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/bets/user/${userId}`);
      const data = await response.json();
      setBets(data.bets || []);
    } catch (error) {
      console.error('Failed to fetch bets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchBets();
  }, [userId]);

  return {
    bets,
    loading,
    refetch: fetchBets,
  };
}

// Helper to calculate potential payout
export function calculatePotentialPayout(
  betAmount: number,
  vote: 1 | 2,
  yesPool: number,
  noPool: number,
  feePercentage: number = 2
): number {
  const totalPool = yesPool + noPool;
  const distributablePool = totalPool * (1 - feePercentage / 100);
  const winningPool = vote === 1 ? yesPool : noPool;

  if (winningPool === 0) return 0;

  // Winner_Payout = (Bet_Amount * Distributable_Pool) / Winning_Pool
  return (betAmount * distributablePool) / winningPool;
}

// Helper to calculate implied probability
export function calculateImpliedProbability(
  vote: 1 | 2,
  yesPool: number,
  noPool: number
): number {
  const totalPool = yesPool + noPool;
  if (totalPool === 0) return 50;

  const probability = vote === 1 
    ? (yesPool / totalPool) * 100 
    : (noPool / totalPool) * 100;

  return Math.round(probability * 100) / 100; // Round to 2 decimals
}