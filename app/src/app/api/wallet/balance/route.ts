// src/app/api/wallet/balance/route.ts
// Fetches wallet balance from Solana

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  'confirmed'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Fetch balance
    const lamports = await connection.getBalance(publicKey);
    const sol = lamports / LAMPORTS_PER_SOL;

    return NextResponse.json({
      address: publicKey.toString(),
      balance: sol,
      balanceLamports: lamports,
    });

  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}