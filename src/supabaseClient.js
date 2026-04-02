import { createClient } from '@supabase/supabase-js';

// Substitua pelas credenciais do seu projeto no Supabase
// (Ficam em Project Settings > API)
const supabaseUrl = 'https://fnvhwfdrmozihekmhbke.supabase.co';
const supabaseKey = 'sb_publishable_Xl__VDfbLbOBP6hRDGMyMg_YmDr67hk';

export const supabase = createClient(supabaseUrl, supabaseKey);
