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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars (need service role key)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const dummyIssues = [
  {
    title: "Broken Water Pipe - Bole Road",
    description: "Large water leak near the Friendship Building. Flooding the sidewalk.",
    category: "water",
    status: "open",
    priority_score: 85,
    lat: 8.995,
    lng: 38.785,
    address: "Bole Road, Addis Ababa",
    reporter_id: null // Will fill after finding/creating a profile
  },
  {
    title: "Faulty Street Lights - Churchill Avenue",
    description: "Several street lights are flickering or completely out between Taitu Hotel and the Post Office.",
    category: "lighting",
    status: "in_progress",
    priority_score: 65,
    lat: 9.025,
    lng: 38.755,
    address: "Churchill Avenue, Addis Ababa",
    reporter_id: null
  },
  {
    title: "Uncollected Garbage - Mercato",
    description: "Overflowing trash bins near the main bus terminal. Causing bad odor.",
    category: "sanitation",
    status: "open",
    priority_score: 75,
    lat: 9.035,
    lng: 38.735,
    address: "Mercato, Addis Ababa",
    reporter_id: null
  }
];

async function seed() {
  console.log('Starting emergency re-seed...');
  
  // 1. Get or create a dummy reporter
  let { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  
  if (!profile) {
    console.log('No profiles found. Checking auth.users...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    if (users.length > 0) {
      console.log('Found user:', users[0].id);
      // Try to manually insert profile if trigger failed
      const { data: newProfile, error: pError } = await supabase.from('profiles').insert({
        id: users[0].id,
        display_name: 'Seed Reporter',
        role: 'citizen'
      }).select().single();
      
      if (pError) {
        console.error('Failed to create profile:', pError);
        process.exit(1);
      }
      profile = newProfile;
    } else {
      console.error('No auth users exist either. Cannot seed issues.');
      process.exit(1);
    }
  }

  console.log('Using reporter:', profile.id);

  // 2. Insert issues
  const issuesToInsert = dummyIssues.map(issue => ({
    ...issue,
    reporter_id: profile.id
  }));

  const { data, error } = await supabase.from('issues').insert(issuesToInsert).select();

  if (error) {
    console.error('Seeding error:', error);
  } else {
    console.log('Successfully seeded', data.length, 'issues');
  }
}

seed();
