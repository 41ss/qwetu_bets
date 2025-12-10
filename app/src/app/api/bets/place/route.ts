// app/api/bets/place/route.ts
// Handles bet placement and stores event data in database

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, 'confirmed');

interface PlaceBetRequest {
  userId: string; // UUID from users table
  marketPubkey: string; // Base58 market address
  vote: 1 | 2; // 1=YES, 2=NO
  amountSol: number;
  walletAddress: string; // User's wallet (for verification)
}

interface PlaceBetResponse {
  success: boolean;
  transactionSignature?: string;
  betId?: string;
  newYesPool?: number;
  newNoPool?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PlaceBetResponse>> {
  try {
    const body: PlaceBetRequest = await request.json();
    const { userId, marketPubkey, vote, amountSol, walletAddress } = body;

    // Validation
    if (!userId || !marketPubkey || !vote || !amountSol || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (vote !== 1 && vote !== 2) {
      return NextResponse.json(
        { success: false, error: 'Vote must be 1 (YES) or 2 (NO)' },
        { status: 400 }
      );
    }

    if (amountSol <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Verify user exists and wallet matches
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.wallet_address !== walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address mismatch' },
        { status: 403 }
      );
    }

    // Verify market exists and is active
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('pubkey', marketPubkey)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      );
    }

    if (market.is_resolved) {
      return NextResponse.json(
        { success: false, error: 'Market is already resolved' },
        { status: 400 }
      );
    }

    // Note: In a real implementation, the frontend would sign and send the transaction
    // This endpoint primarily serves to validate and log the bet AFTER it's confirmed on-chain
    // The actual transaction construction happens client-side with Solana Wallet Adapter

    // For now, we'll assume the frontend sends us the confirmed transaction signature
    // and we'll verify + store it

    return NextResponse.json({
      success: true,
      message: 'Transaction should be signed and sent by frontend wallet',
      instructionData: {
        marketPubkey,
        vote,
        amountLamports: Math.round(amountSol * 1e9),
      },
    });

  } catch (error) {
    console.error('Place bet error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Separate endpoint to confirm and log bet after on-chain confirmation
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      userId, 
      marketPubkey, 
      transactionSignature,
      vote,
      amountSol,
      newYesPool,
      newNoPool,
      slot,
      blockTime
    } = body;

    // Verify transaction on-chain
    const txInfo = await connection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo || txInfo.meta?.err) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or failed' },
        { status: 400 }
      );
    }

    // Store bet in database
    const { data: bet, error: betError } = await supabase
      .from('market_bets')
      .insert({
        user_id: userId,
        market_pubkey: marketPubkey,
        vote: vote,
        amount_sol: amountSol,
        transaction_signature: transactionSignature,
      })
      .select()
      .single();

    if (betError) {
      console.error('Failed to store bet:', betError);
      return NextResponse.json(
        { success: false, error: 'Failed to store bet' },
        { status: 500 }
      );
    }

    // Store bet event for analytics
    await supabase.from('bet_events').insert({
      market_id: marketPubkey,
      user_wallet: body.walletAddress,
      amount_sol: amountSol,
      vote: vote,
      new_total_yes_sol: newYesPool,
      new_total_no_sol: newNoPool,
      transaction_signature: transactionSignature,
      slot: slot,
      block_time: blockTime ? new Date(blockTime * 1000).toISOString() : null,
    });

    // Update market pools in cache
    await supabase
      .from('markets')
      .update({
        yes_pool_sol: newYesPool,
        no_pool_sol: newNoPool,
        total_volume_sol: newYesPool + newNoPool,
        last_synced_at: new Date().toISOString(),
      })
      .eq('pubkey', marketPubkey);

    // Increment user's bet counter
    await supabase.rpc('increment_user_bets', { user_uuid: userId });

    return NextResponse.json({
      success: true,
      betId: bet.id,
      transactionSignature,
    });

  } catch (error) {
    console.error('Bet confirmation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm bet' },
      { status: 500 }
    );
  }
}