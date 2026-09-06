/**
 * ALCO Hub - Centralized Store & License Service
 * Mengelola sinkronisasi katalog Supabase, cache lokal hemat request, manajemen lisensi, dan otentikasi Owner.
 */

import {
  EcosystemApp,
  UserLicense,
  ContactAlcoConfig,
  SyncMeta,
  AdminAuthSession,
  ProductAccent,
  ProductIconName,
  PricingType,
  AppStatus,
} from '../types';
import { ECOSYSTEM_APPS as DEFAULT_APPS } from '../config/ecosystemApps';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_CATALOG_CACHE = 'alco_hub_catalog_cache_v2';
const STORAGE_KEY_SYNC_META = 'alco_hub_sync_meta_v2';
const STORAGE_KEY_USER_LICENSES = 'alco_hub_user_licenses_v2';
const STORAGE_KEY_CONTACT_CONFIG = 'alco_hub_contact_config_v2';
const STORAGE_KEY_INSTALLED_VERSIONS = 'alco_hub_installed_versions_v2';
const STORAGE_KEY_ADMIN_SESSION = 'alco_hub_admin_session_v2';

export const DEFAULT_CONTACT_CONFIG: ContactAlcoConfig = {
  whatsappNumber: '6281234567890',
  supportEmail: 'contact@aladzancorpora.com',
  companyName: 'Aladzan Corpora',
  ownerName: 'ALCO Licensing & Distribution Division',
  defaultPurchaseMessage: 'Halo Aladzan Corpora, saya ingin membeli/mengaktifkan Lisensi Resmi untuk aplikasi ALCO Hub.',
};

/**
 * Cache in-memory untuk mencegah duplicate sync dalam satu render/sesi
 */
let inMemoryCatalog: EcosystemApp[] | null = null;
let inMemorySyncMeta: SyncMeta = {
  status: 'idle',
  lastSyncedAt: null,
  source: 'cache',
};
let isSyncInProgress = false;

// ==============================================================================
// 1. DATA MAPPING (SUPABASE DB ROW <-> REACT EcosystemApp)
// ==============================================================================

function mapDbRowToApp(row: any): EcosystemApp {
  const isComingSoon = Boolean(row.coming_soon ?? row.pricing_type === 'coming-soon');
  const pricingType = (row.pricing_type || (isComingSoon ? 'coming-soon' : 'licensed')) as PricingType;
  
  let features: string[] = [];
  if (Array.isArray(row.features)) {
    features = row.features;
  } else if (typeof row.features === 'string') {
    try {
      features = JSON.parse(row.features);
    } catch {
      features = [row.features];
    }
  }

  return {
    id: row.id || row.app_id,
    appId: row.app_id || row.id,
    name: row.name || 'ALCO Application',
    shortName: row.short_name || row.name || 'ALCO App',
    functionLabel: row.function_label || 'Specialized Business Tool',
    description: row.description || '',
    packId: row.pack_id || 'core-system',
    accent: (row.accent || 'purple') as ProductAccent,
    iconName: (row.icon_name || 'target') as ProductIconName,
    pricingType,
    priceLabel: row.price_label || (pricingType === 'free' ? 'FREE' : 'Rp 499.000 / Lifetime'),
    currency: 'IDR',
    published: row.published !== false,
    publishedAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-09-01',
    version: row.status === 'coming-soon' || isComingSoon ? (row.latest_version || '0.9.0-beta') : (row.status === 'installed' ? (row.version || row.latest_version || '1.0.0') : '1.0.0'),
    latestVersion: row.latest_version || '1.0.0',
    releaseNotes: row.release_notes || 'Stable official release from Aladzan Corpora.',
    downloadUrl: row.download_url || undefined,
    sha256: row.sha256 || undefined,
    launchMode: isComingSoon ? 'disabled' : 'desktop',
    comingSoon: isComingSoon,
    status: (row.status || (isComingSoon ? 'coming-soon' : 'installed')) as AppStatus,
    features,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppToDbRow(app: EcosystemApp): any {
  return {
    id: app.id,
    app_id: app.appId || app.id,
    name: app.name,
    short_name: app.shortName,
    description: app.description || '',
    function_label: app.functionLabel || '',
    pack_id: app.packId || 'core-system',
    pricing_type: app.pricingType,
    price_label: app.priceLabel || '',
    status: app.status || (app.pricingType === 'coming-soon' ? 'coming-soon' : 'installed'),
    coming_soon: app.comingSoon ?? (app.pricingType === 'coming-soon'),
    published: app.published !== false,
    latest_version: app.latestVersion || '1.0.0',
    release_notes: app.releaseNotes || '',
    download_url: app.downloadUrl || null,
    sha256: app.sha256 || null,
    accent: app.accent || 'purple',
    icon_name: app.iconName || 'target',
    features: app.features || [],
    updated_at: new Date().toISOString(),
  };
}

// ==============================================================================
// 2. LOCAL CACHE OPERATIONS (INSTANT UI & OFFLINE FALLBACK)
// ==============================================================================

/**
 * Membaca katalog dari cache lokal (Instan tanpa network delay)
 */
export function getCachedApps(): EcosystemApp[] {
  if (inMemoryCatalog && inMemoryCatalog.length > 0) {
    return inMemoryCatalog;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCatalog = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ALCO Hub] Failed to read cached catalog:', err);
  }

  inMemoryCatalog = DEFAULT_APPS;
  return DEFAULT_APPS;
}

/**
 * Menyimpan katalog ke cache lokal
 */
export function saveCatalogToCache(apps: EcosystemApp[]): void {
  try {
    inMemoryCatalog = apps;
    localStorage.setItem(STORAGE_KEY_CATALOG_CACHE, JSON.stringify(apps));
  } catch (err) {
    console.error('[ALCO Hub] Failed to write catalog to cache:', err);
  }
}

/**
 * Membaca status metadata sinkronisasi terakhir
 */
export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNC_META);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemorySyncMeta = parsed;
      return parsed;
    }
  } catch {}
  return inMemorySyncMeta;
}

export function saveSyncMeta(meta: SyncMeta): void {
  inMemorySyncMeta = meta;
  try {
    localStorage.setItem(STORAGE_KEY_SYNC_META, JSON.stringify(meta));
  } catch {}
}

// ==============================================================================
// 3. EFFICIENT CENTRALIZED CATALOG SYNC (SUPABASE CLOUD)
// ==============================================================================

export interface SyncOptions {
  force?: boolean;
  isAdmin?: boolean;
}

/**
 * Melakukan sinkronisasi katalog dengan Supabase.
 * Prinsip:
 * 1. Tidak fetch ulang jika baru saja di-sync (< 5 menit) kecuali force = true
 * 2. Fallback aman ke cache lokal jika offline / Supabase down
 * 3. Public user hanya mengambil `published = true`
 * 4. Admin mengambil semua data (published & draft)
 */
export async function syncCatalogWithSupabase(
  options: SyncOptions = {}
): Promise<{
  apps: EcosystemApp[];
  syncMeta: SyncMeta;
}> {
  const { force = false, isAdmin = false } = options;

  // 1. Cek konfigurasi Supabase
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    const cached = getCachedApps();
    const meta: SyncMeta = {
      status: 'unconfigured',
      lastSyncedAt: getSyncMeta().lastSyncedAt,
      source: 'cache',
      message: 'Supabase belum dikonfigurasi. Menggunakan katalog lokal Aladzan Corpora.',
    };
    saveSyncMeta(meta);
    return { apps: cached, syncMeta: meta };
  }

  // 2. Cek waktu cache (hemat request)
  const currentMeta = getSyncMeta();
  const now = Date.now();
  if (!force && currentMeta.lastSyncedAt && currentMeta.status === 'synced') {
    const lastTime = new Date(currentMeta.lastSyncedAt).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (now - lastTime < FIVE_MINUTES && inMemoryCatalog && inMemoryCatalog.length > 0) {
      return { apps: inMemoryCatalog, syncMeta: currentMeta };
    }
  }

  // Cegah duplicate parallel requests
  if (isSyncInProgress) {
    return { apps: getCachedApps(), syncMeta: inMemorySyncMeta };
  }

  isSyncInProgress = true;
  saveSyncMeta({
    status: 'syncing',
    lastSyncedAt: currentMeta.lastSyncedAt,
    source: currentMeta.source,
    message: 'Memeriksa pembaruan katalog ke Supabase...',
  });

  try {
    // 3. Query tabel apps
    let query = client.from('apps').select('*').order('name', { ascending: true });

    // Jika bukan admin, hanya ambil app yang sudah dipublish
    if (!isAdmin) {
      query = query.eq('published', true);
    }

    const { data: dbApps, error: appsError } = await query;

    if (appsError) {
      console.warn('[ALCO Hub] Supabase query error:', appsError);
      throw new Error(appsError.message);
    }

    // 4. Query tabel kontak ALCO (public.alco_contact)
    try {
      const { data: contactData, error: contactError } = await client
        .from('alco_contact')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (contactData && !contactError) {
        const updatedContact: ContactAlcoConfig = {
          whatsappNumber: contactData.whatsapp || contactData.whatsapp_number || DEFAULT_CONTACT_CONFIG.whatsappNumber,
          supportEmail: contactData.email || contactData.support_email || DEFAULT_CONTACT_CONFIG.supportEmail,
          companyName: contactData.company_name || DEFAULT_CONTACT_CONFIG.companyName,
          ownerName: DEFAULT_CONTACT_CONFIG.ownerName,
          defaultPurchaseMessage: contactData.default_purchase_message || DEFAULT_CONTACT_CONFIG.defaultPurchaseMessage,
        };
        saveContactConfigLocal(updatedContact);
      } else {
        // Fallback to alco_config if alco_contact is not yet created
        const { data: fallbackContact } = await client
          .from('alco_config')
          .select('*')
          .eq('id', 'contact')
          .maybeSingle();

        if (fallbackContact) {
          const updatedContact: ContactAlcoConfig = {
            whatsappNumber: fallbackContact.whatsapp || DEFAULT_CONTACT_CONFIG.whatsappNumber,
            supportEmail: fallbackContact.email || DEFAULT_CONTACT_CONFIG.supportEmail,
            companyName: fallbackContact.company_name || DEFAULT_CONTACT_CONFIG.companyName,
            ownerName: DEFAULT_CONTACT_CONFIG.ownerName,
            defaultPurchaseMessage: fallbackContact.default_purchase_message,
          };
          saveContactConfigLocal(updatedContact);
        }
      }
    } catch (contactErr) {
      console.warn('[ALCO Hub] Error querying alco_contact:', contactErr);
    }

    // 5. Transform data dan update cache
    let newAppsList: EcosystemApp[] = [];
    if (dbApps && dbApps.length > 0) {
      newAppsList = dbApps.map(mapDbRowToApp);
    } else {
      // Jika tabel di Supabase kosong, gunakan default apps
      newAppsList = DEFAULT_APPS;
    }

    saveCatalogToCache(newAppsList);

    const successMeta: SyncMeta = {
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      source: 'supabase',
      message: `Katalog tersinkronisasi (${newAppsList.length} aplikasi tersedia)`,
    };
    saveSyncMeta(successMeta);
    isSyncInProgress = false;

    return { apps: newAppsList, syncMeta: successMeta };
  } catch (err: any) {
    console.warn('[ALCO Hub] Offline fallback triggered:', err);
    const cached = getCachedApps();
    const offlineMeta: SyncMeta = {
      status: navigator.onLine === false ? 'offline' : 'error',
      lastSyncedAt: currentMeta.lastSyncedAt,
      source: 'cache',
      message: `Gagal terhubung ke Cloud (${err.message || 'Offline'}). Menggunakan cache lokal.`,
      error: err.message,
    };
    saveSyncMeta(offlineMeta);
    isSyncInProgress = false;
    return { apps: cached, syncMeta: offlineMeta };
  }
}

// ==============================================================================
// 4. OWNER / ADMIN ACTIONS (CLOUD MUTATIONS DIRECTLY TO SUPABASE)
// ==============================================================================

/**
 * Menyimpan / Menerbitkan aplikasi ke Supabase (public.apps)
 * Jika offline atau koneksi gagal, TIDAK pura-pura tersimpan ke server.
 */
export async function saveAppToCloud(
  app: EcosystemApp,
  isNew: boolean = false
): Promise<{ success: boolean; message: string; app: EcosystemApp }> {
  const client = getSupabase();

  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Koneksi Supabase belum dikonfigurasi. Perubahan tidak dapat disimpan ke server cloud.',
      app,
    };
  }

  try {
    const dbRow = mapAppToDbRow(app);
    const { error } = await client.from('apps').upsert(dbRow, { onConflict: 'id' });

    if (error) {
      console.warn('[ALCO Hub] Failed to save app to Supabase:', error);
      return {
        success: false,
        message: `Gagal menyimpan ke Supabase: ${error.message} (Periksa RLS / skema database).`,
        app,
      };
    }

    // Update local cache setelah berhasil di Supabase
    const cached = getCachedApps();
    let updatedList: EcosystemApp[];
    if (isNew) {
      const existingIndex = cached.findIndex((a) => a.id === app.id);
      if (existingIndex >= 0) {
        updatedList = cached.map((a) => (a.id === app.id ? app : a));
      } else {
        updatedList = [...cached, app];
      }
    } else {
      updatedList = cached.map((a) => (a.id === app.id ? app : a));
    }
    saveCatalogToCache(updatedList);

    return {
      success: true,
      message: `Aplikasi "${app.name}" berhasil disimpan ke Supabase! (Status: ${app.published ? 'Published' : 'Draft'})`,
      app,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Koneksi jaringan terputus: ${err.message || 'Offline'}. Perubahan belum dapat disimpan ke server.`,
      app,
    };
  }
}

/**
 * Menghapus aplikasi dari Supabase (public.apps) & Cache
 */
export async function deleteAppFromCloud(appId: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();

  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Koneksi Supabase belum dikonfigurasi. Tidak dapat menghapus dari server.',
    };
  }

  try {
    const { error } = await client.from('apps').delete().eq('id', appId);
    if (error) {
      return {
        success: false,
        message: `Gagal menghapus dari Supabase: ${error.message}`,
      };
    }

    const cached = getCachedApps();
    const updatedList = cached.filter((a) => a.id !== appId);
    saveCatalogToCache(updatedList);

    return { success: true, message: 'Aplikasi berhasil dihapus dari katalog Supabase.' };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghapus (Offline): ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Mengubah status publish/unpublish aplikasi di Supabase (public.apps) & Cache
 */
export async function togglePublishAppInCloud(
  appId: string,
  published: boolean
): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();

  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Koneksi Supabase belum dikonfigurasi. Tidak dapat mengubah status di server.',
    };
  }

  try {
    const { error } = await client
      .from('apps')
      .update({ published, updated_at: new Date().toISOString() })
      .eq('id', appId);

    if (error) {
      return {
        success: false,
        message: `Gagal mengubah status publish di Supabase: ${error.message}`,
      };
    }

    const cached = getCachedApps();
    const updatedList = cached.map((a) => (a.id === appId ? { ...a, published } : a));
    saveCatalogToCache(updatedList);

    return {
      success: true,
      message: published
        ? 'Aplikasi berhasil DITERBITKAN (Published)! Kini tampil di Store seluruh user.'
        : 'Aplikasi diubah menjadi DRAFT (Unpublished). Hanya terlihat oleh Owner.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mengubah status publish (Offline): ${err.message}`,
    };
  }
}

/**
 * Menyimpan konfigurasi kontak resmi ALCO ke Supabase (public.alco_contact)
 */
export async function saveContactConfig(
  config: ContactAlcoConfig
): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();

  if (!client || !isSupabaseConfigured()) {
    saveContactConfigLocal(config);
    return {
      success: false,
      message: 'Koneksi Supabase belum aktif. Kontak hanya tersimpan secara lokal sementara.',
    };
  }

  try {
    // 1. Coba simpan ke tabel public.alco_contact
    const { error: contactError } = await client.from('alco_contact').upsert({
      id: 'contact',
      whatsapp: config.whatsappNumber,
      email: config.supportEmail,
      company_name: config.companyName,
      default_purchase_message: config.defaultPurchaseMessage,
      updated_at: new Date().toISOString(),
    });

    if (contactError) {
      // Fallback ke tabel alco_config jika alco_contact belum dibuat
      const { error: fallbackError } = await client.from('alco_config').upsert({
        id: 'contact',
        whatsapp: config.whatsappNumber,
        email: config.supportEmail,
        company_name: config.companyName,
        default_purchase_message: config.defaultPurchaseMessage,
        updated_at: new Date().toISOString(),
      });

      if (fallbackError) {
        return {
          success: false,
          message: `Gagal menyimpan kontak ke Supabase: ${contactError.message}`,
        };
      }
    }

    saveContactConfigLocal(config);
    return { success: true, message: 'Kontak resmi ALCO berhasil disimpan ke Supabase cloud!' };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menyimpan kontak (Offline): ${err.message}`,
    };
  }
}

// ==============================================================================
// 5. OWNER AUTHENTICATION & ROLE VALIDATION (SUPABASE AUTH + public.admin_users)
// ==============================================================================

/**
 * Membaca session admin/owner dari penyimpanan lokal
 */
export function getAdminSession(): AdminAuthSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    isAuthenticated: false,
    userId: null,
    email: null,
    role: 'guest',
    mode: 'none',
  };
}

/**
 * Menyimpan session admin/owner
 */
export function saveAdminSession(session: AdminAuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(session));
  } catch {}
}

/**
 * Memvalidasi apakah user_id terdaftar di tabel public.admin_users dengan role = 'owner'
 */
export async function validateAdminUser(
  userId: string
): Promise<{ isOwner: boolean; role?: string; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { isOwner: false, error: 'Supabase client belum terhubung' };
  }

  try {
    const { data, error } = await client
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[ALCO Hub] Error querying admin_users table:', error);
      return { isOwner: false, error: error.message };
    }

    if (!data) {
      return { isOwner: false, error: 'User tidak ditemukan di tabel admin_users' };
    }

    const role = (data.role || '').trim().toLowerCase();
    if (role === 'owner') {
      return { isOwner: true, role: 'owner' };
    }

    return { isOwner: false, role, error: `Role '${role}' bukan owner` };
  } catch (err: any) {
    return { isOwner: false, error: err.message || 'Gagal memverifikasi role admin_users' };
  }
}

export type OwnerAuthStatus =
  | 'signing-in'
  | 'connected'
  | 'invalid-credentials'
  | 'access-denied'
  | 'unconfigured'
  | 'error';

export interface OwnerAuthResult {
  success: boolean;
  status: OwnerAuthStatus;
  message: string;
  session: AdminAuthSession;
}

/**
 * Login Owner via Supabase Auth + Verifikasi public.admin_users
 */
export async function ownerSignIn(
  email: string,
  password: string
): Promise<OwnerAuthResult> {
  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      status: 'unconfigured',
      message: 'Supabase URL atau Anon Key belum dikonfigurasi di ALCO Hub.',
      session: { isAuthenticated: false, userId: null, email: null, role: 'guest', mode: 'none' },
    };
  }

  try {
    // 1. Otentikasi kredensial via Supabase Auth
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error || !data.user) {
      return {
        success: false,
        status: 'invalid-credentials',
        message: 'Invalid credentials. Email atau password salah.',
        session: { isAuthenticated: false, userId: null, email: null, role: 'guest', mode: 'none' },
      };
    }

    // 2. Verifikasi user_id di tabel public.admin_users dengan role = 'owner'
    const { isOwner, error: roleError } = await validateAdminUser(data.user.id);

    if (!isOwner) {
      // User valid di Supabase Auth, tetapi bukan Owner di admin_users -> Access Denied & Sign Out
      await client.auth.signOut();
      localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);

      return {
        success: false,
        status: 'access-denied',
        message: 'Access denied. Akun Anda berhasil diverifikasi tetapi tidak memiliki hak akses Owner pada tabel admin_users.',
        session: { isAuthenticated: false, userId: null, email: null, role: 'guest', mode: 'none' },
      };
    }

    // 3. Login sukses sebagai Owner
    const session: AdminAuthSession = {
      isAuthenticated: true,
      userId: data.user.id,
      email: data.user.email || cleanEmail,
      role: 'owner',
      token: data.session?.access_token,
      mode: 'supabase-auth',
    };

    saveAdminSession(session);

    return {
      success: true,
      status: 'connected',
      message: 'Connected as Owner. Selamat datang di Owner Portal Aladzan Corpora.',
      session,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'error',
      message: `Gagal login: ${err.message || 'Terjadi kesalahan jaringan'}`,
      session: { isAuthenticated: false, userId: null, email: null, role: 'guest', mode: 'none' },
    };
  }
}

/**
 * Validasi session saat app startup / reload
 * Memastikan token Supabase Auth masih valid dan role di public.admin_users tetap 'owner'.
 */
export async function checkAndRestoreOwnerSession(): Promise<AdminAuthSession> {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    const defaultSession: AdminAuthSession = {
      isAuthenticated: false,
      userId: null,
      email: null,
      role: 'guest',
      mode: 'none',
    };
    saveAdminSession(defaultSession);
    return defaultSession;
  }

  try {
    // 1. Ambil session aktif dari Supabase Auth
    const { data: { session }, error } = await client.auth.getSession();

    if (error || !session || !session.user) {
      const defaultSession: AdminAuthSession = {
        isAuthenticated: false,
        userId: null,
        email: null,
        role: 'guest',
        mode: 'none',
      };
      saveAdminSession(defaultSession);
      return defaultSession;
    }

    // 2. Validasi ulang ke tabel public.admin_users
    const { isOwner } = await validateAdminUser(session.user.id);

    if (!isOwner) {
      await client.auth.signOut();
      const defaultSession: AdminAuthSession = {
        isAuthenticated: false,
        userId: null,
        email: null,
        role: 'guest',
        mode: 'none',
      };
      saveAdminSession(defaultSession);
      return defaultSession;
    }

    // 3. Session Owner valid
    const ownerSession: AdminAuthSession = {
      isAuthenticated: true,
      userId: session.user.id,
      email: session.user.email || null,
      role: 'owner',
      token: session.access_token,
      mode: 'supabase-auth',
    };
    saveAdminSession(ownerSession);
    return ownerSession;
  } catch (err) {
    console.warn('[ALCO Hub] Error checking owner session on startup:', err);
    return getAdminSession();
  }
}

/**
 * Logout Owner / Admin
 */
export async function ownerSignOut(): Promise<void> {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn('[ALCO Hub] Error during signOut:', err);
    }
  }
  localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
}

// Aliases for compatibility
export const adminSignIn = (email: string, password?: string) => ownerSignIn(email, password || '');
export const adminSignOut = ownerSignOut;

// ==============================================================================
// 6. USER LICENSES & CONTACT (LOCAL PERSISTENCE)
// ==============================================================================

export function getUserLicenses(): Record<string, UserLicense> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_LICENSES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function isAppLicensed(app: EcosystemApp, userLicenses: Record<string, UserLicense>): boolean {
  if (app.pricingType === 'free') return true;
  if (app.pricingType === 'coming-soon' || app.comingSoon) return false;

  const license = userLicenses[app.id] || (app.appId ? userLicenses[app.appId] : undefined);
  return Boolean(license && license.status === 'active');
}

export function activateLicense(
  appId: string,
  licenseKey: string,
  licensedTo: string = 'Authorized ALCO User'
): { success: boolean; message: string } {
  const cleanKey = licenseKey.trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, message: 'License key tidak boleh kosong.' };
  }

  const isValidFormat = cleanKey.startsWith('ALCO-') && cleanKey.length >= 12;
  if (!isValidFormat) {
    return {
      success: false,
      message: 'Format License Key tidak valid. Contoh format resmi: ALCO-CREA-9821-4321',
    };
  }

  const licenses = getUserLicenses();
  licenses[appId] = {
    appId,
    licenseKey: cleanKey,
    licensedTo,
    activatedAt: new Date().toISOString(),
    status: 'active',
    tier: 'Lifetime License',
  };

  try {
    localStorage.setItem(STORAGE_KEY_USER_LICENSES, JSON.stringify(licenses));
    return { success: true, message: 'Lisensi resmi berhasil diaktifkan!' };
  } catch {
    return { success: false, message: 'Gagal menyimpan lisensi ke storage lokal.' };
  }
}

export function revokeLicense(appId: string): void {
  const licenses = getUserLicenses();
  delete licenses[appId];
  localStorage.setItem(STORAGE_KEY_USER_LICENSES, JSON.stringify(licenses));
}

export function generateLicenseKey(appId: string): string {
  const prefix = appId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'APP';
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part3 = Math.floor(1000 + Math.random() * 9000);
  return `ALCO-${prefix}-${part1}-${part2}-${part3}`;
}

export function getContactConfig(): ContactAlcoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACT_CONFIG);
    if (!raw) return DEFAULT_CONTACT_CONFIG;
    return { ...DEFAULT_CONTACT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONTACT_CONFIG;
  }
}

function saveContactConfigLocal(config: ContactAlcoConfig): void {
  localStorage.setItem(STORAGE_KEY_CONTACT_CONFIG, JSON.stringify(config));
}

export function createWhatsAppOrderLink(app: EcosystemApp, contact: ContactAlcoConfig): string {
  const defaultMsg = contact.defaultPurchaseMessage || 'Halo Aladzan Corpora, saya ingin membeli/mengaktifkan Lisensi Resmi untuk aplikasi:';
  const message = `${defaultMsg}\n\n*Aplikasi:* ${app.name}\n*App ID:* ${app.appId || app.id}\n*Fungsi:* ${app.functionLabel}\n*Harga/Paket:* ${app.priceLabel || 'Lisensi Resmi'}\n\nMohon informasi prosedur aktivasi lisensi ALCO Hub saya. Terima kasih!`;
  const cleanPhone = contact.whatsappNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function resetCatalogToDefault(): EcosystemApp[] {
  saveCatalogToCache(DEFAULT_APPS);
  return DEFAULT_APPS;
}
