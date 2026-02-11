
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Utilitário para buscar variáveis de ambiente em diferentes contextos (Vercel, Vite, etc)
 */
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`] || process.env[`NEXT_PUBLIC_${key}`] || null;
  }
  return null;
};

// Chaves fornecidas pelo usuário
const USER_SUPABASE_URL = 'https://xclhzluntzsdvgexjzbu.supabase.co';
const USER_SUPABASE_KEY = 'sb_publishable_allgD1s6OpO2F3TGW33N3w_PmvIfsIP';

// Tenta obter das variáveis de ambiente primeiro, depois usa as fornecidas como fallback
const supabaseUrl = getEnv('URL_SUPABASE') || getEnv('SUPABASE_URL') || USER_SUPABASE_URL;
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || USER_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * O app agora é considerado configurado se tivermos a URL e a Key (seja via env ou fallback)
 */
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

export const getMissingConfigKeys = () => {
  const missing = [];
  if (!supabaseUrl) missing.push('URL_SUPABASE');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  // API_KEY do Gemini ainda é essencial vir das envs para segurança
  if (!getEnv('API_KEY')) missing.push('API_KEY (Gemini)');
  return missing;
};
