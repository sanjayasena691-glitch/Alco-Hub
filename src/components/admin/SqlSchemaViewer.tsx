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
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  testSupabaseConnection,
  saveCustomSupabaseConfig,
  getSupabaseConfig,
} from '../../services/supabaseClient';

const OFFICIAL_SQL_V2 = `-- ==============================================================================
-- SKEMA RESMI DATABASE SUPABASE ALCO HUB (Aladzan Corpora)
-- Versi: 2.0 (Dynamic Product Packs, Access Model & Trial Metadata)
-- ==============================================================================

-- 1. TABEL PRODUCT PACKS (product_packs)
CREATE TABLE IF NOT EXISTS public.product_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT DEFAULT 'Ecosystem Pack',
    accent TEXT DEFAULT 'purple',
    badge TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'coming-soon')),
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_packs_status ON public.product_packs(status);

-- Seed Default Product Packs
INSERT INTO public.product_packs (id, name, tagline, description, category, accent, badge, status, is_custom)
VALUES 
    ('core-system', 'Core Business System', 'Sistem Inti Operasional & Strategi Bisnis', 'Koleksi aplikasi pondasi dan arsitektur bisnis utama Aladzan Corpora.', 'Core System', 'purple', 'Sistem Inti', 'active', false),
    ('meta-ads', 'Meta Ads Starter Pack', 'Eksekusi & Optimasi Iklan Facebook & Instagram', 'Perangkat lengkap perancangan copy, struktur kampanye, dan monitoring iklan Meta.', 'Marketing & Ads', 'emerald', 'Starter Pack', 'active', false),
    ('content-creator', 'Content Creator Pack', 'Produksi Konten, Video Hook & Scriptwriting', 'Perangkat kreasi konten video vertikal, riset topik viral, dan pembuatan script.', 'Content Engine', 'cyan', 'Creator Pack', 'active', false),
    ('creative-system', 'Creative & Offer Suite', 'Formula Penawaran & Visual Direct Response', 'Generator angle penawaran, validasi positioning produk, dan landing page high-converting.', 'Creative Suite', 'orange', 'Pro Suite', 'active', false),
    ('intelligence-hub', 'ALCO Intelligence & Tools', 'Riset Pasar, Audit & Ekstraksi Data', 'Perangkat riset pasar, audit funnel, kalkulator margin, dan intelijen kompetitor.', 'Tools & Utilities', 'indigo', 'Intelligence', 'active', false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    accent = EXCLUDED.accent,
    badge = EXCLUDED.badge;

-- 2. TABEL APLIKASI (apps)
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    function_label TEXT,
    pack_id TEXT DEFAULT 'core-system' REFERENCES public.product_packs(id) ON UPDATE CASCADE ON DELETE SET NULL,
    pricing_type TEXT NOT NULL DEFAULT 'licensed' CHECK (pricing_type IN ('free', 'licensed', 'trial', 'coming-soon')),
    access_model TEXT DEFAULT 'licensed' CHECK (access_model IN ('free', 'licensed', 'trial', 'coming-soon')),
    trial_duration_days INTEGER DEFAULT 14,
    price_label TEXT,
    status TEXT DEFAULT 'installed',
    coming_soon BOOLEAN DEFAULT FALSE,
    published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    version TEXT DEFAULT '1.0.0',
    latest_version TEXT DEFAULT '1.0.0',
    release_notes TEXT,
    download_url TEXT,
    sha256 TEXT,
    accent TEXT DEFAULT 'purple',
    icon_name TEXT DEFAULT 'target',
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade kolom jika tabel apps sudah ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'access_model') THEN
        ALTER TABLE public.apps ADD COLUMN access_model TEXT DEFAULT 'licensed' CHECK (access_model IN ('free', 'licensed', 'trial', 'coming-soon'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'trial_duration_days') THEN
        ALTER TABLE public.apps ADD COLUMN trial_duration_days INTEGER DEFAULT 14;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'published_at') THEN
        ALTER TABLE public.apps ADD COLUMN published_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'features') THEN
        ALTER TABLE public.apps ADD COLUMN features TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_apps_app_id ON public.apps(app_id);
CREATE INDEX IF NOT EXISTS idx_apps_pack_id ON public.apps(pack_id);
CREATE INDEX IF NOT EXISTS idx_apps_published ON public.apps(published);

-- 3. TABEL KONTAK RESMI ALCO (alco_contact)
CREATE TABLE IF NOT EXISTS public.alco_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp TEXT,
    email TEXT,
    company_name TEXT DEFAULT 'Aladzan Corpora',
    owner_name TEXT DEFAULT 'Aladzan Corpora Management',
    default_purchase_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL ADMIN USERS (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner'
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.product_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alco_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES: product_packs
DROP POLICY IF EXISTS "Public can view active product packs" ON public.product_packs;
CREATE POLICY "Public can view active product packs" ON public.product_packs
    FOR SELECT TO anon, authenticated USING (status = 'active' OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner'
    ));

DROP POLICY IF EXISTS "Owners have full access to product packs" ON public.product_packs;
CREATE POLICY "Owners have full access to product packs" ON public.product_packs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

-- 7. POLICIES: apps
DROP POLICY IF EXISTS "Public users can view published apps" ON public.apps;
CREATE POLICY "Public users can view published apps" ON public.apps 
    FOR SELECT TO anon, authenticated USING (published = true OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner'
    ));

DROP POLICY IF EXISTS "Owners have full access to apps" ON public.apps;
CREATE POLICY "Owners have full access to apps" ON public.apps 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

-- 8. POLICIES: alco_contact
DROP POLICY IF EXISTS "Public read alco_contact" ON public.alco_contact;
CREATE POLICY "Public read alco_contact" ON public.alco_contact 
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Owners update alco_contact" ON public.alco_contact;
CREATE POLICY "Owners update alco_contact" ON public.alco_contact 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

-- 9. POLICIES: admin_users
DROP POLICY IF EXISTS "Users can read own admin role" ON public.admin_users;
CREATE POLICY "Users can read own admin role" ON public.admin_users 
    FOR SELECT TO authenticated USING (user_id = auth.uid());`;

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
    navigator.clipboard.writeText(OFFICIAL_SQL_V2);
    setCopiedSql(true);
    onShowNotification('Skrip SQL Skema v2.0 berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div id="sql-schema-viewer" className="space-y-6">
      {/* Supabase Connection Setup */}
      <form onSubmit={handleSaveConfig} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Konfigurasi Koneksi Supabase</h3>
        </div>
        <p className="text-xs text-slate-400">
          Masukkan Supabase Project URL dan Anon Key untuk menghubungkan ALCO Hub ke Database Cloud resmi.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Supabase Project URL</label>
            <input
              type="url"
              value={supabaseUrlInput}
              onChange={(e) => setSupabaseUrlInput(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Supabase Anon / Public Key</label>
            <input
              type="password"
              value={supabaseKeyInput}
              onChange={(e) => setSupabaseKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
          >
            Simpan Konfigurasi
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>Test Koneksi</span>
          </button>
        </div>

        {connectionTestResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              connectionTestResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {connectionTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{connectionTestResult.message}</span>
          </div>
        )}
      </form>

      {/* SQL Schema helper */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Supabase SQL Migration Skema v2.0 (Product Packs, Access Model & RLS)
              </h3>
              <p className="text-[11px] text-slate-400">
                Mendukung tabel <code className="text-purple-300">product_packs</code> dinamis, <code className="text-indigo-300">trial_duration_days</code>, dan <code className="text-emerald-300">access_model</code>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Tersalin!' : 'Salin Skrip SQL'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed select-all">
          {OFFICIAL_SQL_V2}
        </pre>
      </div>

      {/* Edge Function Deployment Info */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">
            Supabase Edge Function: <code className="text-indigo-300 font-mono">publish-release</code>
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Edge Function ini menangani pengunggahan installer <code className="text-slate-300">.exe</code> ke GitHub Releases secara aman menggunakan GitHub Personal Access Token yang disimpan di server secret. Tag release diformat secara otomatis menjadi <code className="text-indigo-300 font-mono">&#123;app-id&#125;-v&#123;version&#125;</code> dan dijaga immutable.
        </p>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-2.5">
          <p className="text-slate-500 font-bold"># 1. Konfigurasi Secret GitHub di Supabase:</p>
          <p className="text-emerald-400 select-all">
            supabase secrets set GITHUB_TOKEN=ghp_yourToken GITHUB_REPO_OWNER=yaladzan92-creator GITHUB_REPO_NAME=Alco-Releases
          </p>
          <p className="text-slate-500 font-bold pt-1"># 2. Deploy Edge Function ke Cloud:</p>
          <p className="text-indigo-300 select-all">
            supabase functions deploy publish-release --no-verify-jwt
          </p>
        </div>
      </div>
    </div>
  );
};
