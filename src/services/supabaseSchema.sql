-- ==============================================================================
-- ALCO HUB - CENTRALIZED PRIVATE APP STORE SUPABASE DATABASE SCHEMA
-- Aladzan Corpora Ecosystem (Katalog Terpusat, Lisensi & Konfigurasi Kontak)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE: apps (Katalog Aplikasi Terpusat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.apps (
    id TEXT PRIMARY KEY,
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    function_label TEXT,
    pack_id TEXT DEFAULT 'core-system',
    pricing_type TEXT NOT NULL DEFAULT 'licensed' CHECK (pricing_type IN ('free', 'licensed', 'coming-soon')),
    price_label TEXT,
    status TEXT DEFAULT 'installed',
    coming_soon BOOLEAN DEFAULT FALSE,
    published BOOLEAN DEFAULT TRUE,
    latest_version TEXT DEFAULT '1.0.0',
    release_notes TEXT,
    download_url TEXT,
    sha256 TEXT,
    accent TEXT DEFAULT 'purple',
    icon_name TEXT DEFAULT 'target',
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk efisiensi query public catalog
CREATE INDEX IF NOT EXISTS idx_apps_published ON public.apps(published);
CREATE INDEX IF NOT EXISTS idx_apps_pack_id ON public.apps(pack_id);

-- ==============================================================================
-- 3. TABLE: alco_config (Konfigurasi Kontak Resmi ALCO & Pesan Default)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alco_config (
    id TEXT PRIMARY KEY DEFAULT 'contact',
    whatsapp TEXT NOT NULL DEFAULT '6281234567890',
    email TEXT DEFAULT 'contact@aladzancorpora.com',
    company_name TEXT DEFAULT 'Aladzan Corpora',
    default_purchase_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLE: licenses (Koleksi Lisensi Pengguna Terpusat - Opsional)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    license_key TEXT UNIQUE NOT NULL,
    licensed_to TEXT NOT NULL DEFAULT 'Authorized ALCO User',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Aktifkan RLS
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alco_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Policy 1: PUBLIC USER (Anon) hanya bisa membaca aplikasi yang SUDAH DIPUBLISH (published = true)
DROP POLICY IF EXISTS "Public users can view published apps" ON public.apps;
CREATE POLICY "Public users can view published apps"
    ON public.apps
    FOR SELECT
    TO anon, authenticated
    USING (published = true);

-- Policy 2: ADMIN (Authenticated Supabase User) memiliki akses penuh (CRUD) ke semua apps (termasuk Draft)
DROP POLICY IF EXISTS "Authenticated admins have full access to apps" ON public.apps;
CREATE POLICY "Authenticated admins have full access to apps"
    ON public.apps
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 3: PUBLIC USER dapat membaca konfigurasi kontak ALCO
DROP POLICY IF EXISTS "Public users can read alco_config" ON public.alco_config;
CREATE POLICY "Public users can read alco_config"
    ON public.alco_config
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy 4: ADMIN dapat mengubah konfigurasi kontak ALCO
DROP POLICY IF EXISTS "Authenticated admins can update alco_config" ON public.alco_config;
CREATE POLICY "Authenticated admins can update alco_config"
    ON public.alco_config
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 5: ADMIN memiliki akses penuh ke manajemen lisensi
DROP POLICY IF EXISTS "Authenticated admins have full access to licenses" ON public.licenses;
CREATE POLICY "Authenticated admins have full access to licenses"
    ON public.licenses
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 6. SEED DATA (7 APLIKASI EKOSISTEM ALADZAN CORPORA & KONTAK DEFAULT)
-- ==============================================================================
INSERT INTO public.alco_config (id, whatsapp, email, company_name, default_purchase_message)
VALUES (
    'contact',
    '6281234567890',
    'contact@aladzancorpora.com',
    'Aladzan Corpora',
    'Halo Aladzan Corpora, saya ingin membeli/mengaktifkan Lisensi Resmi untuk aplikasi ALCO Hub.'
)
ON CONFLICT (id) DO UPDATE SET
    whatsapp = EXCLUDED.whatsapp,
    email = EXCLUDED.email,
    company_name = EXCLUDED.company_name;

INSERT INTO public.apps (
    id, app_id, name, short_name, description, function_label, pack_id,
    pricing_type, price_label, status, coming_soon, published, latest_version,
    release_notes, download_url, sha256, accent, icon_name, features
)
VALUES
(
    'creative-system',
    'creative-system',
    'ALCO Creative System',
    'Creative System',
    'Temukan ide penawaran, validasi target audiens, dan susun fondasi pesan campaign iklan yang terstruktur.',
    'Strategy, Research & Creative Angle Formulation',
    'core-system',
    'licensed',
    'Rp 499.000 / Lifetime',
    'installed',
    FALSE,
    TRUE,
    '1.0.0',
    'Initial production release: Market research matrix, buyer angle formulation, and value proposition canvas.',
    'https://github.com/Alco-Releases/alco-creative-system/releases/download/v1.0.0/ALCO.Creative.System-1.0.0-win.exe',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'purple',
    'target',
    '["Offer Positioning & Angle Strategy", "Target Audience & Buyer Persona Matrix", "Copywriting & Creative Angle Briefs", "Integrated Value Proposition Canvas"]'::jsonb
),
(
    'content-engine',
    'content-engine',
    'ALCO Content Engine',
    'Content Engine',
    'Ubah positioning dan strategi menjadi kalender konten organik, caption siap posting, brief kreatif, dan aset terorganisir.',
    'Content Planning & Multi-Format Production',
    'core-system',
    'licensed',
    'Rp 399.000 / Lifetime',
    'installed',
    FALSE,
    TRUE,
    '0.1.1',
    'Update v0.1.1: Pembaruan hook generator, sinkronisasi kalender konten, dan perbaikan format ekspor caption.',
    'https://github.com/Alco-Releases/alco-content-engine/releases/download/v0.1.1/ALCO.Content.Engine-0.1.1-win.zip',
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    'cyan',
    'sparkles',
    '["Editorial Calendar & Production Planner", "Hook, Story & Offer Caption Builder", "Asset Organizer & Format Templates", "Multi-Format Repurposing Engine"]'::jsonb
),
(
    'auto-motion',
    'auto-motion',
    'ALCO Auto Motion',
    'Auto Motion',
    'Analisis footage mentah, buat rencana editing terstruktur, dan siapkan video motion dinamis untuk media sosial.',
    'Video Motion Architecture & Kinetic Editing',
    'core-system',
    'licensed',
    'Rp 599.000 / Lifetime',
    'installed',
    FALSE,
    TRUE,
    '1.0.0',
    'Full release: Kinetic typography engine & short-form video pacing presets.',
    'https://github.com/Alco-Releases/alco-auto-motion/releases/download/v1.0.0/ALCO.Auto.Motion-1.0.0-win.exe',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'orange',
    'video',
    '["Short-Form Video Motion Architect", "Pacing & Visual Hook Breakdown", "Subtitle & Kinetic Typography Presets", "Direct Timeline Render Export"]'::jsonb
),
(
    'product-forge',
    'product-forge',
    'ALCO Product Forge',
    'Product Forge',
    'Bangun arsitektur produk bernilai tinggi, struktur tiering penawaran, bonus stack irresistibel, dan kalkulator margin profit.',
    'Strategic Product Formulation & Offer Creation',
    'core-system',
    'licensed',
    'Rp 699.000 / Lifetime',
    'installed',
    FALSE,
    TRUE,
    '1.0.0',
    'V1 Launch: Irresistible offer architect, pricing strategy simulator, and packaging engine.',
    'https://github.com/Alco-Releases/alco-product-forge/releases/download/v1.0.0/ALCO.Product.Forge-1.0.0-win.exe',
    '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    'rose',
    'package',
    '["Value Stack & Irresistible Offer Builder", "Tiering & Margin Optimization Simulator", "Product Delivery Checklist Generator", "High-Ticket Offer Packaging Blueprint"]'::jsonb
),
(
    'meta-ads-analyst',
    'meta-ads-analyst',
    'ALCO Meta Ads Analyst',
    'Meta Ads Analyst',
    'Evaluasi metrik campaign Ads Manager secara otomatis, deteksi kebocoran budget, dan dapatkan rekomendasi optimasi scaling.',
    'AI-powered Meta Ads Diagnostics & Audit',
    'meta-ads-starter',
    'free',
    'FREE (Starter Tool)',
    'installed',
    FALSE,
    TRUE,
    '1.0.0',
    'Free tier diagnostics tool included in Meta Ads Starter Pack.',
    'https://github.com/Alco-Releases/alco-meta-ads-analyst/releases/download/v1.0.0/ALCO.Meta.Ads.Analyst-1.0.0-win.exe',
    'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    'emerald',
    'trending-up',
    '["CPA, ROAS & CTR Performance Diagnostics", "Budget Leakage & Frequency Warning", "Actionable Scaling Recommendations"]'::jsonb
),
(
    'landing-page-analyst',
    'landing-page-analyst',
    'ALCO Landing Page Analyst',
    'Landing Page Analyst',
    'Audit struktur halaman penawaran, kejelasan copywriting headline, kecepatan visual hierarchy, dan friction checkout.',
    'AI Analysis untuk Landing Page & Conversion Rate Optimization',
    'meta-ads-starter',
    'coming-soon',
    'Coming Soon',
    'coming-soon',
    TRUE,
    TRUE,
    '0.9.0-beta',
    'Under active development for Q4 2026 launch.',
    NULL,
    NULL,
    'teal',
    'layout',
    '["Above-The-Fold Hook Clarity Scoring", "Call-To-Action (CTA) Friction Checker", "Conversion Rate Optimization (CRO) Blueprint"]'::jsonb
),
(
    'ai-spy-ads',
    'ai-spy-ads',
    'ALCO AI Spy Ads',
    'AI Spy Ads',
    'Riset library iklan kompetitor teratas di industri Anda, bongkar pola hook visual, dan temukan celah diferensiasi pasar.',
    'Competitor Ads Research & Intelligence Mining',
    'meta-ads-starter',
    'coming-soon',
    'Coming Soon',
    'coming-soon',
    TRUE,
    TRUE,
    '0.9.0-beta',
    'Under active development for Q4 2026 launch.',
    NULL,
    NULL,
    'indigo',
    'search',
    '["Meta Ad Library Automated Pattern Mining", "Winning Hook & Creative Angle Taxonomy", "Competitor Offer Benchmark Matrix"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    description = EXCLUDED.description,
    function_label = EXCLUDED.function_label,
    pack_id = EXCLUDED.pack_id,
    pricing_type = EXCLUDED.pricing_type,
    price_label = EXCLUDED.price_label,
    coming_soon = EXCLUDED.coming_soon,
    published = EXCLUDED.published,
    latest_version = EXCLUDED.latest_version,
    release_notes = EXCLUDED.release_notes,
    download_url = EXCLUDED.download_url,
    sha256 = EXCLUDED.sha256,
    accent = EXCLUDED.accent,
    icon_name = EXCLUDED.icon_name,
    features = EXCLUDED.features,
    updated_at = NOW();
