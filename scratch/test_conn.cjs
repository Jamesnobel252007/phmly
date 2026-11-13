const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !parts[0].startsWith('#')) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('URL present:', Boolean(url));
console.log('Key present:', Boolean(key));

async function run() {
  const supabase = createClient(url, key);
  try {
    const { data, error } = await supabase.from('rooms').select('count', { count: 'exact', head: true });
    console.log('Rooms count check:', { data, error });
  } catch (err) {
    console.log('Catch error:', err.message);
  }
}

run();

