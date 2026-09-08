-- ==============================================================================
-- OFFICIAL SUPABASE SCHEMA v2.2 - ALCO HUB (Aladzan Corpora)
-- Owner Broadcast Notification Center & Hardened Public Read RLS
-- ==============================================================================

-- 1. TABEL NOTIFIKASI BROADCAST (public.notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'hub_update', 'new_product', 'maintenance')),
    published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    action_label TEXT,
    action_url TEXT,
    target_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk query cepat berdasarkan status publish dan tanggal
CREATE INDEX IF NOT EXISTS idx_notifications_published ON public.notifications(published);
CREATE INDEX IF NOT EXISTS idx_notifications_published_at ON public.notifications(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES: notifications
-- Public user hanya dapat membaca notifikasi yang berstatus published, sudah mencapai tanggal publish, dan belum expired
DROP POLICY IF EXISTS "Public users can view published notifications" ON public.notifications;
CREATE POLICY "Public users can view published notifications" ON public.notifications
    FOR SELECT TO anon, authenticated USING (
        (
            published = TRUE 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (published_at IS NULL OR published_at <= NOW())
        )
        OR EXISTS (
            SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Owner authenticated memiliki kontrol penuh (Create, Edit, Delete, Publish/Unpublish)
DROP POLICY IF EXISTS "Owners have full access to notifications" ON public.notifications;
CREATE POLICY "Owners have full access to notifications" ON public.notifications
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

-- 4. SEED INITIAL OFFICIAL ANNOUNCEMENTS
INSERT INTO public.notifications (title, message, type, published, published_at, action_label, action_url, target_version)
VALUES 
    (
        'Selamat Datang di ALCO Hub Desktop',
        'ALCO Hub resmi dirilis sebagai pusat katalog terpusat, instalasi desktop, dan ekosistem aplikasi Aladzan Corpora. Seluruh aplikasi Anda dapat diakses dan dikelola dalam satu pintu.',
        'general',
        TRUE,
        NOW() - INTERVAL '2 days',
        'Jelajahi Ekosistem',
        'https://aladzancorpora.com',
        '1.0.0'
    ),
    (
        'Pemberitahuan Sistem Pembaruan ALCO Hub',
        'Untuk menjaga stabilitas sistem dan integritas binary, pembaruan resmi ALCO Hub di masa mendatang akan diumumkan melalui Notification Center ini dengan tautan unduhan langsung ke rilis resmi Aladzan Corpora.',
        'hub_update',
        TRUE,
        NOW() - INTERVAL '1 day',
        'Pelajari Mekanisme Rilis',
        'https://aladzancorpora.com/updates',
        '1.0.0'
    ),
    (
        'Ecosystem Pack Baru: Prodigi Suite Siap Rilis',
        'Founder telah menambahkan rangkaian paket produk baru untuk automasi konten dan alur kerja kreatif digital. Pantau terus menu Packs untuk pembaruan modul terbaru.',
        'new_product',
        TRUE,
        NOW() - INTERVAL '12 hours',
        'Buka Menu Packs',
        NULL,
        NULL
    )
ON CONFLICT DO NOTHING;
