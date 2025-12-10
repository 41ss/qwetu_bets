// src/app/api/mpesa/status/route.ts
// Polls M-Pesa transaction status for frontend

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  transactionId: string;
  amountKes?: number;
  tokenAmountSol?: number;
  isMinted?: boolean;
  mintSignature?: string;
  mpesaReceipt?: string;
  errorMessage?: string;
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkout_request_id');
    const transactionId = searchParams.get('transaction_id');

    // Must provide either checkout_request_id or transaction_id
    if (!checkoutRequestId && !transactionId) {
      return NextResponse.json(
        { error: 'Missing checkout_request_id or transaction_id parameter' },
        { status: 400 }
      );
    }

    // Query transaction by either ID
    let query = supabase
      .from('mpesa_transactions')
      .select('*');

    if (checkoutRequestId) {
      query = query.eq('checkout_request_id', checkoutRequestId);
    } else if (transactionId) {
      query = query.eq('id', transactionId);
    }

    const { data: transaction, error } = await query.single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if transaction has expired (10 minutes timeout)
    const initiatedAt = new Date(transaction.initiated_at);
    const now = new Date();
    const minutesElapsed = (now.getTime() - initiatedAt.getTime()) / 1000 / 60;

    if (transaction.status === 'PENDING' && minutesElapsed > 10) {
      // Auto-expire stale transactions
      await supabase
        .from('mpesa_transactions')
        .update({ status: 'EXPIRED' })
        .eq('id', transaction.id);

      return NextResponse.json({
        status: 'EXPIRED',
        transactionId: transaction.id,
        message: 'Payment request expired. Please try again.',
      });
    }

    // Build response based on status
    const response: StatusResponse = {
      status: transaction.status,
      transactionId: transaction.id,
    };

    switch (transaction.status) {
      case 'PENDING':
        response.message = 'Waiting for payment confirmation...';
        break;

      case 'COMPLETED':
        response.amountKes = parseFloat(transaction.amount_kes);
        response.tokenAmountSol = transaction.token_amount_sol ? parseFloat(transaction.token_amount_sol) : undefined;
        response.isMinted = transaction.is_minted;
        response.mintSignature = transaction.mint_signature;
        response.mpesaReceipt = transaction.mpesa_receipt_number;
        
        if (transaction.is_minted) {
          response.message = 'Payment successful! Tokens deposited to your wallet.';
        } else {
          response.message = 'Payment confirmed. Processing your tokens...';
        }
        break;

      case 'FAILED':
        response.errorMessage = transaction.error_message || 'Payment failed';
        response.message = 'Payment failed. Please try again.';
        break;

      case 'CANCELLED':
        response.message = 'Payment was cancelled.';
        break;

      case 'EXPIRED':
        response.message = 'Payment request expired.';
        break;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}