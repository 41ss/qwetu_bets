import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    // Initialize Supabase Admin Client (Bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Query the users table
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is the "Row not found" error code in Postgres, which is fine
      throw error;
    }

    if (user) {
      return NextResponse.json({ exists: true, user });
    } else {
      return NextResponse.json({ exists: false });
    }

  } catch (error: any) {
    console.error("Check User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}