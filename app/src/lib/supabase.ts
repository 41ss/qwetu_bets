import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oeguzykkdnmuoheeudli.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}


const supabase = createClient(supabaseUrl, supabaseKey)