import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oeguzykkdnmuoheeudli.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZ3V6eWtrZG5tdW9oZWV1ZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDk3NTksImV4cCI6MjA4MDkyNTc1OX0.gmrL0tdn0oI98Nhem5TcgtTcjjIKoSGUUEUzSPBrQxo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
