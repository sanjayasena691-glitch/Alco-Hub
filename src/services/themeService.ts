/**
 * ALCO Hub - Theme Service
 * Mengelola preferensi tema visual (System, Light, Dark).
 * Default: System (mengikuti tema Windows / OS).
 */

import { ThemePreference } from '../types';

const STORAGE_KEY_THEME = 'alco_hub_theme_preference';

export type ResolvedTheme = 'light' | 'dark';

type ThemeChangeCallback = (theme: ThemePreference, resolved: ResolvedTheme) => void;
const listeners = new Set<ThemeChangeCallback>();

/**
 * Mendapatkan preferensi tema tersimpan atau fallback ke 'system'.
 */
export function getSavedThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (err) {
    console.warn('[ALCO Hub] Failed to read theme preference from storage:', err);
  }
  return 'system';
}

/**
 * Mengetahui apakah OS saat ini menggunakan dark mode.
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true; // Default dark jika environment non-browser
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Menentukan tema akhir ('light' | 'dark') berdasarkan preferensi dan status OS.
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return getSystemPrefersDark() ? 'dark' : 'light';
}

/**
 * Menerapkan tema ke elemen root (HTML & Body) secara langsung.
 */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }

  // Notifikasi semua listener aktif
  listeners.forEach((callback) => {
    try {
      callback(preference, resolved);
    } catch (err) {
      console.error('[ALCO Hub] Theme listener error:', err);
    }
  });

  return resolved;
}

/**
 * Mengubah dan menyimpan preferensi tema user.
 */
export function setThemePreference(preference: ThemePreference): ResolvedTheme {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, preference);
  } catch (err) {
    console.warn('[ALCO Hub] Failed to save theme preference:', err);
  }
  return applyTheme(preference);
}

/**
 * Berlangganan perubahan tema.
 */
export function subscribeThemeChange(callback: ThemeChangeCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Inisialisasi pendengar perubahan tema OS Windows / Mac.
 */
export function initThemeSystemListener(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const currentPref = getSavedThemePreference();
    if (currentPref === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}
