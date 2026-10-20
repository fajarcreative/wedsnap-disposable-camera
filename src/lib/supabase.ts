import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    typeof rawUrl === 'string' &&
    rawUrl.trim() !== '' &&
    typeof rawAnonKey === 'string' &&
    rawAnonKey.trim() !== '' &&
    !rawUrl.includes('YOUR_') &&
    !rawAnonKey.includes('YOUR_') &&
    rawUrl.startsWith('http')
  );
};

// Safe fallback credentials so createClient never throws on empty env vars
const safeUrl = isSupabaseConfigured() ? rawUrl : 'https://placeholder-project.supabase.co';
const safeAnonKey = isSupabaseConfigured() ? rawAnonKey : 'placeholder-anon-key-valid-for-init-only';

export const supabase = createClient<Database>(safeUrl, safeAnonKey);
