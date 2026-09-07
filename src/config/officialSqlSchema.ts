/**
 * ALCO Hub - Single Source of Truth for Official Supabase Database Schema
 * Versi: 2.1 (Dynamic Product Packs, Access Model, Trial Duration & Owner RLS)
 */

export const OFFICIAL_SUPABASE_SCHEMA_V2_1 = `-- ==============================================================================
-- OFFICIAL SUPABASE SCHEMA v2.1 - ALCO HUB (Aladzan Corpora)
-- Dynamic Product Packs, Access Model, Trial Metadata & Hardened Owner RLS
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
    tool_count INTEGER DEFAULT 0,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan semua kolom product_packs tersedia jika tabel sudah ada sebelumnya
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_packs' AND column_name = 'tool_count') THEN
        ALTER TABLE public.product_packs ADD COLUMN tool_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_packs' AND column_name = 'category') THEN
        ALTER TABLE public.product_packs ADD COLUMN category TEXT DEFAULT 'Ecosystem Pack';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_packs' AND column_name = 'accent') THEN
        ALTER TABLE public.product_packs ADD COLUMN accent TEXT DEFAULT 'purple';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_packs' AND column_name = 'is_custom') THEN
        ALTER TABLE public.product_packs ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Indexing untuk filter status
CREATE INDEX IF NOT EXISTS idx_product_packs_status ON public.product_packs(status);

-- Seed Default Product Packs (Aman dieksekusi berulang dengan ON CONFLICT)
INSERT INTO public.product_packs (id, name, tagline, description, category, accent, badge, status, tool_count, is_custom)
VALUES 
    ('core-system', 'Core System', 'Fondasi Utama Ekosistem Bisnis & Konten', 'Rangkaian alat inti untuk merancang strategi, memproduksi konten harian, dan menghasilkan video promosi.', 'Ecosystem Foundation', 'purple', 'Core Suite', 'active', 4, false),
    ('meta-ads-starter', 'Meta Ads Starter Pack', 'AI tools for launching and optimizing Meta Ads', 'Paket terintegrasi khusus untuk riset kompetitor, optimasi landing page, dan evaluasi performa campaign iklan berbayar.', 'Advertising & Growth', 'emerald', '3 Tools Included', 'active', 3, false),
    ('content-creator-pack', 'Content Creator Pack', 'Produksi Konten, Video Hook & Scriptwriting', 'Alat khusus otomasi storytelling, audio synthesis, dan multi-channel publishing.', 'Content Engine', 'cyan', 'Creator Pack', 'coming-soon', 0, false),
    ('product-research-pack', 'Product Research Pack', 'Deep Market Intelligence & Scraping', 'Deep market intelligence, customer sentiment scraping, dan niche validator.', 'Research & Analytics', 'indigo', 'Intelligence', 'coming-soon', 0, false),
    ('selling-tools-pack', 'Selling Tools Pack', 'Funnel Optimizer & Offer Stacking', 'Checkout funnel optimizer, follow-up bot generator, dan offer stacking calculator.', 'Sales & Conversion', 'orange', 'Pro Suite', 'coming-soon', 0, false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    accent = EXCLUDED.accent,
    badge = EXCLUDED.badge,
    status = EXCLUDED.status,
    tool_count = EXCLUDED.tool_count,
    updated_at = NOW();

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

-- Pastikan kolom baru tersedia jika tabel apps sudah ada sebelumnya
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apps' AND column_name = 'pack_id') THEN
        ALTER TABLE public.apps ADD COLUMN pack_id TEXT DEFAULT 'core-system';
    END IF;

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
    )
    WITH CHECK (
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
    )
    WITH CHECK (
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
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

-- 9. POLICIES: admin_users
DROP POLICY IF EXISTS "Users can read own admin role" ON public.admin_users;
CREATE POLICY "Users can read own admin role" ON public.admin_users 
    FOR SELECT TO authenticated USING (user_id = auth.uid());
`;
