// scripts/market-sync-worker.ts
// Listens for BetPlaced events and syncs market state to database
// This keeps our off-chain cache in sync with on-chain reality

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { createClient } from '@supabase/supabase-js';
import IDL  from '@/utils/idl.json';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  'confirmed'
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

interface BetPlacedEvent {
  marketId: PublicKey;
  user: PublicKey;
  amount: BN;
  vote: number; // 1=YES, 2=NO
  newTotalYes: BN;
  newTotalNo: BN;
}

/**
 * Process a BetPlaced event
 */
async function processBetPlacedEvent(
  event: BetPlacedEvent,
  signature: string,
  slot: number,
  blockTime: number | null
) {
  try {
    const marketPubkey = event.marketId.toString();
    const userWallet = event.user.toString();
    const amountSol = event.amount.toNumber() / 1e9;
    const newYesSol = event.newTotalYes.toNumber() / 1e9;
    const newNoSol = event.newTotalNo.toNumber() / 1e9;

    console.log(`📊 BetPlaced Event: ${userWallet} bet ${amountSol} SOL on ${event.vote === 1 ? 'YES' : 'NO'}`);

    // Check if event already processed (idempotency)
    const { data: existing } = await supabase
      .from('bet_events')
      .select('id')
      .eq('transaction_signature', signature)
      .single();

    if (existing) {
      console.log('Event already processed, skipping');
      return;
    }

    // Store event in database
    const { error: eventError } = await supabase
      .from('bet_events')
      .insert({
        market_id: marketPubkey,
        user_wallet: userWallet,
        amount_sol: amountSol,
        vote: event.vote,
        new_total_yes_sol: newYesSol,
        new_total_no_sol: newNoSol,
        transaction_signature: signature,
        slot: slot,
        block_time: blockTime ? new Date(blockTime * 1000).toISOString() : null,
      });

    if (eventError) {
      console.error('Failed to store event:', eventError);
      return;
    }

    // Update market cache with latest pool values
    const { error: marketError } = await supabase
      .from('markets')
      .update({
        yes_pool_sol: newYesSol,
        no_pool_sol: newNoSol,
        total_volume_sol: newYesSol + newNoSol,
        last_synced_at: new Date().toISOString(),
      })
      .eq('pubkey', marketPubkey);

    if (marketError) {
      console.error('Failed to update market:', marketError);
    }

    console.log(`✅ Synced market ${marketPubkey}: YES=${newYesSol}, NO=${newNoSol}`);

  } catch (error) {
    console.error('Event processing error:', error);
  }
}

/**
 * Poll for recent transactions and parse events
 * Alternative to WebSocket (more reliable for production)
 */
async function pollForEvents(lastProcessedSlot: number): Promise<number> {
  try {
    // Get recent signatures for our program
    const signatures = await connection.getSignaturesForAddress(
      PROGRAM_ID,
      { limit: 100 },
      'confirmed'
    );

    let newestSlot = lastProcessedSlot;

    for (const sigInfo of signatures) {
      // Skip if we've already processed this slot
      if (sigInfo.slot <= lastProcessedSlot) continue;

      // Fetch transaction details
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

if (!tx || !tx.meta || tx.meta.err) continue;

      // Parse logs for BetPlaced events
      // NOTE: This is simplified - in production, use Anchor's event parser
      const logs = tx.meta.logMessages || [];
      const betPlacedLog = logs.find(log => log.includes('BetPlaced'));

      

      if (betPlacedLog) {
        // Parse event data from logs
        // In production, use: program.addEventListener('BetPlaced', callback)
        // For now, we'll manually parse
        
        // Example log format: "Program log: BetPlaced { market_id: ..., user: ..., amount: 100000000, vote: 1, new_total_yes: 500000000, new_total_no: 300000000 }"
        
        // Extract values (this is pseudo-code - adjust to your actual log format)
        const marketIdMatch = betPlacedLog.match(/market_id:\s*([A-Za-z0-9]+)/);
        const userMatch = betPlacedLog.match(/user:\s*([A-Za-z0-9]+)/);
        const amountMatch = betPlacedLog.match(/amount:\s*(\d+)/);
        const voteMatch = betPlacedLog.match(/vote:\s*(\d+)/);
        const yesMatch = betPlacedLog.match(/new_total_yes:\s*(\d+)/);
        const noMatch = betPlacedLog.match(/new_total_no:\s*(\d+)/);

        if (marketIdMatch && userMatch && amountMatch && voteMatch && yesMatch && noMatch) {
          const event: BetPlacedEvent = {
            marketId: new PublicKey(marketIdMatch[1]),
            user: new PublicKey(userMatch[1]),
            amount: new BN(amountMatch[1]),
            vote: parseInt(voteMatch[1]),
            newTotalYes: new BN(yesMatch[1]),
            newTotalNo: new BN(noMatch[1]),
          };

          await processBetPlacedEvent(
            event,
            sigInfo.signature,
            sigInfo.slot,
            tx.blockTime ?? null
          );
        }
      }

      newestSlot = Math.max(newestSlot, sigInfo.slot);
    }

    return newestSlot;

  } catch (error) {
    console.error('Polling error:', error);
    return lastProcessedSlot;
  }
}

/**
 * WebSocket listener (preferred for real-time updates)
 */
function startWebSocketListener() {
  const provider = new AnchorProvider(
    connection,
    // @ts-ignore
    { publicKey: PublicKey.default },
    { commitment: 'confirmed' }
  );

const program = new Program(IDL as any, provider);

  console.log('🎧 Listening for BetPlaced events...');

  // Subscribe to BetPlaced events
  const listener = program.addEventListener('BetPlaced', async (event, slot, signature) => {
    console.log('🔔 New BetPlaced event:', signature);

    // Get block time
    const tx = await connection.getTransaction(signature);
    const blockTime = tx?.blockTime || null;

    await processBetPlacedEvent(event as BetPlacedEvent, signature, slot, blockTime);
  });

  // Handle disconnection
  process.on('SIGINT', () => {
    console.log('Stopping listener...');
    program.removeEventListener(listener);
    process.exit(0);
  });
}

/**
 * Main worker function (polling mode)
 */
async function runSyncWorker() {
  console.log('🔄 Market Sync Worker Started (Polling Mode)');

  // Get last processed slot from database (or start from current)
  const { data: lastSync } = await supabase
    .from('bet_events')
    .select('slot')
    .order('slot', { ascending: false })
    .limit(1)
    .single();

  let lastProcessedSlot = lastSync?.slot || 0;

  // Poll every 5 seconds
  while (true) {
    lastProcessedSlot = await pollForEvents(lastProcessedSlot);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Choose mode based on environment
if (process.env.SYNC_MODE === 'websocket') {
  startWebSocketListener();
} else {
  runSyncWorker();
}

export { runSyncWorker, startWebSocketListener };