
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Configurações autoritativas para o ambiente de produção
const SUPABASE_URL = 'https://xclhzluntzsdvgexjzbu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_allgD1s6OpO2F3TGW33N3w_PmvIfsIP';

/**
 * Criação do cliente Supabase.
 * Em um SaaS real, as chaves são injetadas via env, mas aqui garantimos
 * o funcionamento com o fallback direto para evitar falhas de conexão no link ?s=
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const isSupabaseConfigured = () => {
  return !!SUPABASE_URL && !!SUPABASE_KEY;
};
