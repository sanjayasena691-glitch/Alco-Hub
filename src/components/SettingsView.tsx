/**
 * ALCO Hub - Settings View
 * Tampilan pengaturan preferensi visual (System/Light/Dark), status pembaruan,
 * diagnostik lingkungan runtime desktop, konfigurasi AI Navigator, dan informasi Tentang ALCO Hub.
 */

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Monitor,
  RefreshCw,
  Key,
  ShieldCheck,
  Terminal,
  Database,
  ExternalLink,
  Trash2,
  Info,
  CheckCircle2,
  HardDrive,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import {
  ThemePreference,
  EcosystemApp,
  AppLocalInstallation,
  GhCliStatus,
} from '../types';
import {
  getSavedThemePreference,
  setThemePreference,
  subscribeThemeChange,
} from '../services/themeService';
import { getMaskedApiKey, removeUserApiKey } from '../services/aiNavigatorService';
import { HUB_META } from '../config/ecosystemApps';
import { clearCatalogCache } from '../services/storeService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface SettingsViewProps {
  apiKey: string;
  onApiKeyChange: (newKey: string) => void;
  onOpenApiKeyModal: () => void;
  onOpenExternalUrl: (url: string) => void;
  apps?: EcosystemApp[];
  localInstallations?: Record<string, AppLocalInstallation>;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  apiKey,
  onApiKeyChange,
  onOpenApiKeyModal,
  onOpenExternalUrl,
  apps = [],
  localInstallations = {},
  onCheckUpdates,
  isCheckingUpdates = false,
}) => {
  const [themePref, setThemePref] = useState<ThemePreference>(getSavedThemePreference());
  const [ghCliStatus, setGhCliStatus] = useState<GhCliStatus | null>(null);
  const [cacheClearedMessage, setCacheClearedMessage] = useState<string | null>(null);

  const isElectronAvailable = typeof window !== 'undefined' && Boolean(window.alcoHub);
  const isCloudConfigured = isSupabaseConfigured();

  // Listen to theme changes
  useEffect(() => {
    const unsub = subscribeThemeChange((newPref) => {
      setThemePref(newPref);
    });
    return () => unsub();
  }, []);

  // Check GitHub CLI status if running in Electron
  useEffect(() => {
    if (window.alcoHub && typeof window.alcoHub.checkGhCliStatus === 'function') {
      window.alcoHub.checkGhCliStatus().then((status) => {
        setGhCliStatus(status);
      }).catch(() => {
        setGhCliStatus(null);
      });
    }
  }, []);

  const handleThemeSelect = (pref: ThemePreference) => {
    setThemePref(pref);
    setThemePreference(pref);
  };

  const handleClearCache = () => {
    clearCatalogCache();
    setCacheClearedMessage('Cache lokal berhasil dibersihkan. Memuat ulang katalog...');
    if (onCheckUpdates) {
      onCheckUpdates();
    }
    setTimeout(() => {
      setCacheClearedMessage(null);
    }, 4000);
  };

  // Count apps with pending updates
  const appsWithUpdates = apps.filter((app) => {
    const canonicalId = app.appId || app.id;
    const inst = localInstallations[canonicalId] || localInstallations[app.id];
    return Boolean(inst?.isInstalled && app.latestVersion && inst.version && app.latestVersion !== inst.version);
  });

  const installedCount = (Object.values(localInstallations) as AppLocalInstallation[]).filter((i) => i && i.isInstalled).length;

  return (
    <div id="alco-settings-view" className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Pengaturan & Diagnostik
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Kelola preferensi visual, status pembaruan aplikasi, diagnostik runtime desktop, dan kredensial AI.
        </p>
      </div>

      {/* 1. Appearance / Tema Visual */}
      <section
        id="settings-appearance-section"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Tampilan & Tema Visual
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih mode warna antarmuka ALCO Hub sesuai kenyamanan kerja Anda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* System Option */}
          <button
            type="button"
            onClick={() => handleThemeSelect('system')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all ${
              themePref === 'system'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-200'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <Laptop className="w-4 h-4" />
              </div>
              {themePref === 'system' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">System</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Mengikuti tema Windows / OS
              </span>
            </div>
          </button>

          {/* Light Option */}
          <button
            type="button"
            onClick={() => handleThemeSelect('light')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all ${
              themePref === 'light'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-200'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500">
                <Sun className="w-4 h-4" />
              </div>
              {themePref === 'light' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Light</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Tema terang berdaya kontras tinggi
              </span>
            </div>
          </button>

          {/* Dark Option */}
          <button
            type="button"
            onClick={() => handleThemeSelect('dark')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all ${
              themePref === 'dark'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 dark:text-indigo-200'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-400">
                <Moon className="w-4 h-4" />
              </div>
              {themePref === 'dark' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm block">Dark</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Tema gelap ramah mata malam hari
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Updates / Pembaruan Ekosistem */}
      <section
        id="settings-updates-section"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <RefreshCw className={`w-5 h-5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pembaruan Ekosistem Aplikasi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memeriksa ketersediaan versi rilis terbaru dari server repositori resmi.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isCheckingUpdates}
            onClick={onCheckUpdates}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdates ? 'Memeriksa...' : 'Periksa Pembaruan'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Versi ALCO Hub:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-bold text-sm">
              v{HUB_META.version}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Aplikasi Terpasang:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {installedCount} dari {apps.length} Aplikasi
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Status Update:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {appsWithUpdates.length > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {appsWithUpdates.length} pembaruan tersedia
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Seluruh aplikasi mutakhir
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Diagnostics & Runtime Environment */}
      <section
        id="settings-diagnostics-section"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Diagnostik Sistem & Runtime
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Status integrasi native Windows, koneksi katalog cloud, dan integritas penyimpanan lokal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Desktop Bridge */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Runtime Detection:</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isElectronAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-slate-900 dark:text-white">
                {isElectronAvailable ? 'Electron Desktop Bridge (Windows Native)' : 'Browser Web Preview'}
              </span>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Katalog Cloud:</span>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {isCloudConfigured ? 'Supabase Centralized DB Aktif' : 'Offline / Standalone Fallback'}
              </span>
            </div>
          </div>

          {/* GitHub CLI Bridge */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">GitHub CLI (Distribution):</span>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {ghCliStatus?.installed
                  ? `Terpasang (${ghCliStatus.account ? `@${ghCliStatus.account}` : 'Ready'})`
                  : isElectronAvailable
                  ? 'CLI belum terdeteksi di PATH'
                  : 'N/A (Web Environment)'}
              </span>
            </div>
          </div>

          {/* Local Cache Management */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Cache Katalog Lokal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Terisolasi di Local Storage
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
            >
              Reset Cache
            </button>
          </div>
        </div>

        {cacheClearedMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{cacheClearedMessage}</span>
          </div>
        )}
      </section>

      {/* 4. Gemini AI API Key Settings */}
      <section
        id="settings-api-key-section"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ALCO Navigator AI Key
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gemini API Key pribadi untuk fitur konsultasi alur ekosistem dan project checker.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0"
          >
            {apiKey ? 'Ubah API Key' : 'Konfigurasi Key'}
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Status Kunci Aktif:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              {apiKey ? getMaskedApiKey(apiKey) : 'Belum dikonfigurasi'}
            </span>
          </div>

          {apiKey && (
            <button
              type="button"
              onClick={() => {
                removeUserApiKey();
                onApiKeyChange('');
              }}
              className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </section>

      {/* 5. About ALCO Hub */}
      <section
        id="settings-about-section"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-center gap-4">
          <img
            src="/alco-hub-icon.png"
            alt="ALCO Hub"
            className="w-12 h-12 rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-950"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {HUB_META.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                v{HUB_META.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {HUB_META.ecosystem}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Pusat katalog terpusat, instalasi desktop mandiri, dan peluncur aplikasi ekosistem Aladzan Corpora.
          Menghubungkan seluruh software bisnis mandiri Anda dalam satu antarmuka desktop terpadu.
        </p>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{HUB_META.principles}</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            © {new Date().getFullYear()} Aladzan Corpora. All rights reserved.
          </span>
        </div>
      </section>
    </div>
  );
};
