-- ==============================================================================
-- SQL MIGRATION: Add icon_url to public.apps
-- ALCO Hub - Official App Icon Support
-- ==============================================================================

-- 1. Tambahkan kolom icon_url jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'apps' 
          AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE public.apps ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- 2. Berikan komentar deskriptif untuk dokumentasi schema
COMMENT ON COLUMN public.apps.icon_url IS 'URL icon resmi aplikasi (format SVG/PNG) untuk visual rendering ALCO Hub';
