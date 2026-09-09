import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Lock,
  UploadCloud,
  ShieldCheck,
  Database,
} from 'lucide-react';
import {
  testSupabaseConnection,
  saveCustomSupabaseConfig,
  getSupabaseConfig,
} from '../../services/supabaseClient';
import { OFFICIAL_SUPABASE_SCHEMA_V2_1 } from '../../config/officialSqlSchema';

interface SqlSchemaViewerProps {
  onShowNotification: (msg: string) => void;
}

export const SqlSchemaViewer: React.FC<SqlSchemaViewerProps> = ({
  onShowNotification,
}) => {
  const currentSupabase = getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(currentSupabase.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(currentSupabase.anonKey);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
    onShowNotification('Konfigurasi Supabase berhasil disimpan.');
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    const result = await testSupabaseConnection();
    setIsTestingConnection(false);
    setConnectionTestResult(result);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(OFFICIAL_SUPABASE_SCHEMA_V2_1);
    setCopiedSql(true);
    onShowNotification('Official Supabase Schema v2.1 berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div id="sql-schema-viewer" className="space-y-6">
      {/* Supabase Connection Setup */}
      <form onSubmit={handleSaveConfig} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Konfigurasi Koneksi Supabase</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Masukkan Supabase Project URL dan Anon Key untuk menghubungkan ALCO Hub ke Database Cloud resmi.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supabase Project URL</label>
            <input
              type="url"
              value={supabaseUrlInput}
              onChange={(e) => setSupabaseUrlInput(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supabase Anon / Public Key</label>
            <input
              type="password"
              value={supabaseKeyInput}
              onChange={(e) => setSupabaseKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all"
          >
            Simpan Konfigurasi
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>Test Koneksi</span>
          </button>
        </div>

        {connectionTestResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              connectionTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}
          >
            {connectionTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{connectionTestResult.message}</span>
          </div>
        )}
      </form>

      {/* SQL Schema helper */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Official Supabase Schema v2.1
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  v2.1 Terbaru
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Mendukung tabel <code className="text-purple-600 dark:text-purple-300 font-mono">product_packs</code> (dengan <code className="text-purple-600 dark:text-purple-300 font-mono">tool_count</code>), relasi <code className="text-indigo-600 dark:text-indigo-300 font-mono">pack_id</code>, <code className="text-cyan-600 dark:text-cyan-300 font-mono">trial_duration_days</code>, <code className="text-emerald-600 dark:text-emerald-300 font-mono">access_model</code>, dan Owner RLS security policies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0 active:scale-95"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Tersalin!' : 'Salin Skrip SQL'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-200 dark:text-slate-300 overflow-x-auto max-h-96 leading-relaxed select-all">
            {OFFICIAL_SUPABASE_SCHEMA_V2_1}
          </pre>
        </div>
      </div>

      {/* Architecture & Release Pipeline Info */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/20 space-y-4 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Arsitektur Distribusi & Release Publisher ALCO Hub
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          ALCO Hub menggunakan pemisahan tanggung jawab (*Separation of Concerns*) yang efisien dan aman:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              1. GitHub Releases (Storage & CDN)
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Penyimpanan file installer <code className="text-slate-800 dark:text-slate-200 font-mono">.exe</code> berukuran besar. Diunggah langsung dari komputer Owner tanpa melewati Edge Function, sehingga bebas dari limit memori Deno (HTTP 546).
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              2. Supabase Cloud (Catalog & Auth)
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Menyimpan katalog aplikasi (<code className="text-indigo-600 dark:text-indigo-300 font-mono">public.apps</code>), paket produk, kontak, dan otentikasi Owner melalui Row Level Security (RLS).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
