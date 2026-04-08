import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente (Vercel) ou fallback para desenvolvimento
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fnvhwfdrmozihekmhbke.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudmh3ZmRybW96aWhla21oYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODQ1ODcsImV4cCI6MjA5MDY2MDU4N30.aaMy8bupl4dT-MX8dVlHuxhMwqqrI1YZUFiUuOCVDxs';

export const supabase = createClient(supabaseUrl, supabaseKey);
