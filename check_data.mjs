import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log('Auditing RLS Policies...');

  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('*')
    .or('tablename.eq.issues,tablename.eq.profiles');

  if (error) {
    // If we can't read pg_policies (common in Supabase for anon/service), try another way
    // Actually, service role should be able to.
    console.error('Error reading policies:', error);
  } else {
    console.log('Found policies:', policies.length);
    policies.forEach(p => console.log(`- ${p.tablename}: ${p.policyname} (${p.permissive})`));
  }
}

async function fixRLS() {
  console.log('Applying RLS fixes...');
  
  // We can't run arbitrary SQL via the client unless we have an RPC or use a trick.
  // But we can check policies via a table if we have permissions.
  // Actually, since this is a local environment, I'll just try to fetch everything and see if I can find the issue.
  
  const { data: issues, error } = await supabase.from('issues').select('*');
  console.log('Issues found (Service Role):', issues?.length);

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles found (Service Role):', profiles?.length);

  // If we have 0 issues, RLS isn't the only problem, they are literally not there.
  // But my emergency_seed just added 3.
  
  // Let's try to see if we can "fix" the policies by re-running some SQL if we had an RPC.
  // Since we don't, I'll just ensure the reporter_id is set correctly.
}

check();
fixRLS();
