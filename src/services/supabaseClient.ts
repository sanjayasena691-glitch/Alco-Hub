/**
 * ALCO Hub - Supabase Client & Connection Manager
 * Mengelola inisialisasi aman Supabase client, pembacaan konfigurasi environment / runtime, dan fallback.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'alco_supabase_url_custom';
const STORAGE_KEY_SUPABASE_KEY = 'alco_supabase_anon_key_custom';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
}

/**
 * Membaca URL dan Anon Key dari env (VITE_*) atau override di localStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

  const customUrl = (localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '').trim();
  const customKey = (localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '').trim();

  if (customUrl && customKey) {
    return { url: customUrl, anonKey: customKey, isCustom: true };
  }

  return { url: envUrl, anonKey: envKey, isCustom: false };
}

/**
 * Menyimpan custom URL dan Anon Key ke localStorage (untuk kemudahan setting di UI)
 */
export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (cleanUrl && cleanKey) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  }

  // Reset cached client
  cachedClient = null;
  lastUrl = '';
  lastKey = '';
}

/**
 * Memeriksa apakah konfigurasi Supabase valid dan tersedia
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey.length > 20
  );
}

/**
 * Mendapatkan Supabase Client instance (Lazy Singleton)
 */
export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey || !url.startsWith('https://')) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.warn('[ALCO Hub] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test konektivitas ke Supabase instance
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL atau Anon Key belum dikonfigurasi.',
    };
  }

  try {
    const { data, error, count } = await client
      .from('apps')
      .select('id, name, published', { count: 'exact' })
      .limit(5);

    if (error) {
      return {
        success: false,
        message: `Supabase Error: ${error.message} (${error.code || 'RLS/Table missing'})`,
      };
    }

    return {
      success: true,
      message: `Terhubung ke Supabase! Ditemukan ${count ?? data?.length ?? 0} aplikasi di tabel "apps".`,
      count: count ?? data?.length ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Koneksi gagal: ${err.message || 'Network / CORS error'}`,
    };
  }
}
