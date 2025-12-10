import { idlAddress } from "@coral-xyz/anchor/dist/cjs/idl";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phoneNumber, walletAddress } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL??"",
      process.env.SUPABASE_SERVICE_ROLE_KEY?? ""
    );

    // Insert new user
    const { data: user, error } = await supabase
      .from("users")
      .insert([
        { 
          phone_number: phoneNumber, 
          wallet_address: walletAddress,
          total_deposits_kes: 0,
          total_bets_placed: 0
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}