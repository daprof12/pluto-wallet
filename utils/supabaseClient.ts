/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for cross-platform data sync.
 * Replace the placeholder values with your actual Supabase project credentials.
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

// Read from Vite environment variables first, then fallback to info.tsx
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

const SUPABASE_URL = envUrl || (projectId ? `https://${projectId}.supabase.co` : '');
const SUPABASE_ANON_KEY = envKey || publicAnonKey || '';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
};

export default supabase;