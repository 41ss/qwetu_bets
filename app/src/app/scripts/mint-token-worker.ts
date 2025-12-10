// scripts/mint-tokens-worker.ts
// Background worker that mints Solana tokens for completed M-Pesa deposits
// Run this as a Vercel Cron Job or separate Node.js process

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  'confirmed'
);

// Treasury wallet that holds SOL to send to users
const treasuryKeypair = Keypair.fromSecretKey(
  bs58.decode(process.env.TREASURY_PRIVATE_KEY!)
);

/**
 * Process a single deposit: mint tokens on Solana
 */
async function processMintForDeposit(transaction: any): Promise<boolean> {
  try {
    const userWallet = new PublicKey(transaction.users.wallet_address);
    const amountLamports = Math.round(transaction.token_amount_sol * 1e9); // SOL to lamports

    console.log(`Minting ${transaction.token_amount_sol} SOL for user ${userWallet.toString()}`);

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: treasuryKeypair.publicKey,
      toPubkey: userWallet,
      lamports: amountLamports,
    });

    // Build and send transaction
    const txn = new Transaction().add(transferInstruction);
    const signature = await connection.sendTransaction(txn, [treasuryKeypair]);

    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    // Update database
    const { error: updateError } = await supabase
      .from('mpesa_transactions')
      .update({
        is_minted: true,
        mint_signature: signature,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      return false;
    }

    console.log(`✅ Minted successfully: ${signature}`);
    return true;

  } catch (error) {
    console.error(`Failed to mint for transaction ${transaction.id}:`, error);
    
    // Mark as failed if error is unrecoverable
    if (error instanceof Error && error.message.includes('insufficient funds')) {
      await supabase
        .from('mpesa_transactions')
        .update({ 
          status: 'FAILED',
          error_message: 'Treasury has insufficient SOL' 
        })
        .eq('id', transaction.id);
    }
    
    return false;
  }
}

/**
 * Main worker loop
 */
async function runMintingWorker() {
  console.log('🔄 Token Minting Worker Started');

  try {
    // Fetch completed deposits that haven't been minted yet
    const { data: pendingMints, error } = await supabase
      .from('mpesa_transactions')
      .select(`
        *,
        users!inner (
          wallet_address,
          phone_number
        )
      `)
      .eq('transaction_type', 'DEPOSIT')
      .eq('status', 'COMPLETED')
      .eq('is_minted', false)
      .order('completed_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (error) {
      console.error('Failed to fetch pending mints:', error);
      return;
    }

    if (!pendingMints || pendingMints.length === 0) {
      console.log('No pending mints found');
      return;
    }

    console.log(`Found ${pendingMints.length} pending mints`);

    // Process each deposit sequentially
    for (const transaction of pendingMints) {
      await processMintForDeposit(transaction);
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Batch complete');

  } catch (error) {
    console.error('Worker error:', error);
  }
}

// Run immediately if executed directly
if (require.main === module) {
  runMintingWorker()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runMintingWorker };