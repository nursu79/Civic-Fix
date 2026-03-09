import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('issues').select('id, title, upvote_count').order('upvote_count', { ascending: false })
  console.log(data)
  const { data: upvotes } = await supabase.from('upvotes').select('issue_id')
  console.log("Upvotes table count:", upvotes.length)
}
run()
