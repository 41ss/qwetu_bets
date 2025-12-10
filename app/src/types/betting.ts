// types/betting.ts
// TypeScript types aligned with V2 contract

export enum BetVote {
  YES = 1,
  NO = 2,
}

export interface Market {
  id: string; // UUID
  pubkey: string; // Solana address
  title: string;
  description: string | null;
  
  // Pool state
  yesPoolSol: number;
  noPoolSol: number;
  totalVolumeSol: number;
  
  // Resolution
  isResolved: boolean;
  outcome: boolean | null; // true = YES won, false = NO won, null = unresolved
  
  // Protocol fee (V2)
  feePercentage: number; // 0-100
  protocolFeesCollectedSol: number;
  protocolWallet: string | null;
  
  // Metadata
  createdByWallet: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  lastSyncedAt: Date;
}

export interface MarketWithOdds extends Market {
  // Calculated fields
  yesProbabilityPct: number;
  noProbabilityPct: number;
  yesPayoutMultiplier: number;
  noPayoutMultiplier: number;
}

export interface Bet {
  id: string; // UUID
  userId: string;
  marketPubkey: string;
  marketTitle: string;
  
  // Bet details (V2)
  vote: BetVote;
  amountSol: number;
  transactionSignature: string;
  
  // Payout calculation (V2)
  distributablePoolSol: number | null;
  winningPoolSol: number | null;
  payoutPercentage: number | null;
  
  // Resolution
  isResolved: boolean;
  won: boolean | null;
  payoutAmountSol: number | null;
  claimed: boolean;
  claimSignature: string | null;
  
  // Timestamps
  createdAt: Date;
  resolvedAt: Date | null;
  claimedAt: Date | null;
}

export interface BetEvent {
  id: string;
  marketId: string;
  userWallet: string;
  amountSol: number;
  vote: BetVote;
  
  // Live pool state after this bet
  newTotalYesSol: number;
  newTotalNoSol: number;
  
  // Blockchain reference
  transactionSignature: string;
  slot: number;
  blockTime: Date | null;
  indexedAt: Date;
}

export interface User {
  id: string;
  phoneNumber: string;
  walletAddress: string;
  displayName: string | null;
  
  // Statistics
  totalDepositsKes: number;
  totalWithdrawalsKes: number;
  totalBetsPlaced: number;
  
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MPesaTransaction {
  id: string;
  userId: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  
  // M-Pesa identifiers
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  
  // Financial
  amountKes: number;
  phoneNumber: string;
  
  // Status
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  
  // Blockchain bridge (V2)
  tokenAmountSol: number | null;
  mintSignature: string | null;
  isMinted: boolean;
  
  // Timestamps
  initiatedAt: Date;
  completedAt: Date | null;
  
  // Debug
  callbackData: any;
  errorMessage: string | null;
}

// API Response types
export interface PlaceBetRequest {
  userId: string;
  marketPubkey: string;
  vote: BetVote;
  amountSol: number;
  walletAddress: string;
}

export interface PlaceBetResponse {
  success: boolean;
  transactionSignature?: string;
  betId?: string;
  newYesPool?: number;
  newNoPool?: number;
  error?: string;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  userId: string;
}

export interface STKPushResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

// Helper functions
export function getVoteLabel(vote: BetVote): string {
  return vote === BetVote.YES ? 'YES' : 'NO';
}

export function calculatePayoutMultiplier(
  vote: BetVote,
  yesPool: number,
  noPool: number,
  feePercentage: number = 2
): number {
  const totalPool = yesPool + noPool;
  if (totalPool === 0) return 0;
  
  const distributablePool = totalPool * (1 - feePercentage / 100);
  const winningPool = vote === BetVote.YES ? yesPool : noPool;
  
  if (winningPool === 0) return 0;
  
  return distributablePool / winningPool;
}

export function calculatePayout(
  betAmount: number,
  vote: BetVote,
  yesPool: number,
  noPool: number,
  feePercentage: number = 2
): number {
  const multiplier = calculatePayoutMultiplier(vote, yesPool, noPool, feePercentage);
  return betAmount * multiplier;
}

export function calculateImpliedProbability(
  vote: BetVote,
  yesPool: number,
  noPool: number
): number {
  const totalPool = yesPool + noPool;
  if (totalPool === 0) return 50;
  
  const pool = vote === BetVote.YES ? yesPool : noPool;
  return (pool / totalPool) * 100;
}

export function formatSOL(amount: number): string {
  return `${amount.toFixed(4)} SOL`;
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Constants
export const SOL_TO_KES_RATE = 10000; // 1 SOL = 10,000 KES
export const PROTOCOL_FEE_PERCENTAGE = 2; // 2% fee

export function solToKes(sol: number): number {
  return sol * SOL_TO_KES_RATE;
}

export function kesToSol(kes: number): number {
  return kes / SOL_TO_KES_RATE;
}