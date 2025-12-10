import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Daraja API credentials (store in .env.local)
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY!;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE!; // Paybill/Till number
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

// Supabase client with service role key (backend operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Base URLs for Daraja API
const DARAJA_BASE_URL = MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

interface STKPushRequest {
  phoneNumber: string; // Format: 254712345678 (without +)
  amount: number; // KES amount
  userId: string; // UUID from users table
}

/**
 * Get OAuth access token from Daraja API
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  
  const response = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Generate timestamp in format: YYYYMMDDHHmmss
 */
function generateTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Generate password for STK Push
 * Formula: Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(timestamp: string): string {
  const str = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(str).toString('base64');
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-+]/g, '');
  
  // Convert 07XX or 01XX to 2547XX/2541XX
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }
  
  // Ensure it starts with 254
  if (!cleaned.startsWith('254')) {
    throw new Error('Phone number must be a Kenyan number starting with 254 or 0');
  }
  
  // Validate length (254 + 9 digits = 12)
  if (cleaned.length !== 12) {
    throw new Error('Invalid phone number length');
  }
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: STKPushRequest = await request.json();
    const { phoneNumber, amount, userId } = body;

    // Validation
    if (!phoneNumber || !amount || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, amount, userId' },
        { status: 400 }
      );
    }

    if (amount < 1) {
      return NextResponse.json(
        { error: 'Amount must be at least 1 KES' },
        { status: 400 }
      );
    }

    // Validate and format phone number
    const formattedPhone = validatePhoneNumber(phoneNumber);

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, wallet_address, phone_number')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    // Callback URL (must be publicly accessible HTTPS)
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`;

    // STK Push payload
    const stkPushPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline' for Till
      Amount: Math.round(amount), // Must be integer
      PartyA: formattedPhone, // Customer phone
      PartyB: MPESA_SHORTCODE, // Your shortcode
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `QWETU-${userId.slice(0, 8)}`, // Max 12 chars
      TransactionDesc: 'Qwetu Bets Deposit',
    };

    // Initiate STK Push
    const stkResponse = await fetch(`${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushPayload),
    });

    const stkData = await stkResponse.json();

    // Check for errors
    if (stkData.errorCode || !stkResponse.ok) {
      console.error('STK Push failed:', stkData);
      return NextResponse.json(
        { 
          error: 'Payment request failed', 
          details: stkData.errorMessage || stkData.ResponseDescription 
        },
        { status: 400 }
      );
    }

    // Success - Store transaction in database
    const { data: transaction, error: insertError } = await supabase
      .from('mpesa_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'DEPOSIT',
        merchant_request_id: stkData.MerchantRequestID,
        checkout_request_id: stkData.CheckoutRequestID,
        amount_kes: amount,
        phone_number: `+${formattedPhone}`,
        status: 'PENDING',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store transaction:', insertError);
      // STK Push was sent but we couldn't track it - log this
      return NextResponse.json(
        { 
          error: 'Payment initiated but tracking failed', 
          checkoutRequestId: stkData.CheckoutRequestID 
        },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Payment request sent. Please check your phone.',
      transactionId: transaction.id,
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID,
    });

  } catch (error) {
    console.error('STK Push error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Optional: Query STK Push status (for polling)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkoutRequestId');

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'Missing checkoutRequestId parameter' },
        { status: 400 }
      );
    }

    // Query transaction status from database
    const { data: transaction, error } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount_kes,
      mpesaReceipt: transaction.mpesa_receipt_number,
      isMinted: transaction.is_minted,
      mintSignature: transaction.mint_signature,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}