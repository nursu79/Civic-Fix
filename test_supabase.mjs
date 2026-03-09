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
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing connection to Supabase...');
  console.log('URL:', supabaseUrl);
  
  const { data: issues, error: issuesError, count } = await supabase
    .from('issues')
    .select('*', { count: 'exact' });

  if (issuesError) {
    console.error('Issues fetch error:', issuesError);
  } else {
    console.log('Successfully fetched issues. Count:', count, 'Length:', issues.length);
    if (issues.length > 0) {
      console.log('Sample issue:', issues[0].title);
    }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.error('Profiles fetch error:', profilesError);
  } else {
    console.log('Successfully fetched profiles:', profiles.length);
  }
}

test();
