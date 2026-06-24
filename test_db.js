import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n');
const supabaseUrl = env.find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1];
const supabaseKey = env.find(l => l.startsWith('VITE_SUPABASE_ANON_KEY')).split('=')[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('profissionais').select('porcentagem_comissao').limit(1);
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

check();
