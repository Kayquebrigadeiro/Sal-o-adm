import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente (Vercel) ou fallback para desenvolvimento
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://SEU_PROJETO_SUPABASE_REF.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_SUPABASE_ANON';

export const supabase = createClient(supabaseUrl, supabaseKey);
