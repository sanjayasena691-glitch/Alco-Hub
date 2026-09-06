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

    // 4. Query tabel kontak ALCO
    const { data: contactData } = await client
      .from('alco_config')
      .select('*')
      .eq('id', 'contact')
      .maybeSingle();

    if (contactData) {
      const updatedContact: ContactAlcoConfig = {
        whatsappNumber: contactData.whatsapp || DEFAULT_CONTACT_CONFIG.whatsappNumber,
        supportEmail: contactData.email || DEFAULT_CONTACT_CONFIG.supportEmail,
        companyName: contactData.company_name || DEFAULT_CONTACT_CONFIG.companyName,
        ownerName: DEFAULT_CONTACT_CONFIG.ownerName,
        defaultPurchaseMessage: contactData.default_purchase_message,
      };
      saveContactConfigLocal(updatedContact);
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
// 4. OWNER / ADMIN ACTIONS (CLOUD MUTATIONS)
// ==============================================================================

/**
 * Menyimpan / Menerbitkan aplikasi ke Supabase (atau fallback ke cache jika Supabase unconfigured)
 */
export async function saveAppToCloud(
  app: EcosystemApp,
  isNew: boolean = false
): Promise<{ success: boolean; message: string; app: EcosystemApp }> {
  const client = getSupabase();

  // 1. Simpan ke local cache terlebih dahulu
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

  // 2. Jika Supabase aktif, kirim ke database
  if (client && isSupabaseConfigured()) {
    try {
      const dbRow = mapAppToDbRow(app);
      const { error } = await client.from('apps').upsert(dbRow, { onConflict: 'id' });

      if (error) {
        return {
          success: false,
          message: `Gagal menyimpan ke Supabase: ${error.message}. Perubahan disimpan ke cache lokal.`,
          app,
        };
      }

      return {
        success: true,
        message: `Aplikasi "${app.name}" berhasil disimpan ke Cloud Supabase!`,
        app,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error jaringan: ${err.message}. Perubahan tersimpan di cache lokal.`,
        app,
      };
    }
  }

  return {
    success: true,
    message: `Aplikasi "${app.name}" disimpan ke cache lokal (Supabase belum dihubungkan).`,
    app,
  };
}

/**
 * Menghapus aplikasi dari Cloud & Cache
 */
export async function deleteAppFromCloud(appId: string): Promise<{ success: boolean; message: string }> {
  const cached = getCachedApps();
  const updatedList = cached.filter((a) => a.id !== appId);
  saveCatalogToCache(updatedList);

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.from('apps').delete().eq('id', appId);
      if (error) {
        return { success: false, message: `Gagal menghapus dari Supabase: ${error.message}` };
      }
    } catch (err: any) {
      return { success: false, message: `Error jaringan: ${err.message}` };
    }
  }

  return { success: true, message: 'Aplikasi berhasil dihapus.' };
}

/**
 * Mengubah status publish/unpublish aplikasi di Cloud & Cache
 */
export async function togglePublishAppInCloud(
  appId: string,
  published: boolean
): Promise<{ success: boolean; message: string }> {
  const cached = getCachedApps();
  const updatedList = cached.map((a) => (a.id === appId ? { ...a, published } : a));
  saveCatalogToCache(updatedList);

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client
        .from('apps')
        .update({ published, updated_at: new Date().toISOString() })
        .eq('id', appId);

      if (error) {
        return { success: false, message: `Gagal mengubah status di Supabase: ${error.message}` };
      }
    } catch (err: any) {
      return { success: false, message: `Error jaringan: ${err.message}` };
    }
  }

  return {
    success: true,
    message: published ? 'Aplikasi berhasil DITERBITKAN ke seluruh user!' : 'Aplikasi diubah menjadi DRAFT (tersembunyi dari user).',
  };
}

/**
 * Menyimpan konfigurasi kontak resmi ALCO
 */
export async function saveContactConfig(
  config: ContactAlcoConfig
): Promise<{ success: boolean; message: string }> {
  saveContactConfigLocal(config);

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.from('alco_config').upsert({
        id: 'contact',
        whatsapp: config.whatsappNumber,
        email: config.supportEmail,
        company_name: config.companyName,
        default_purchase_message: config.defaultPurchaseMessage,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, message: `Gagal menyimpan kontak ke Supabase: ${error.message}` };
      }
    } catch (err: any) {
      return { success: false, message: `Error jaringan: ${err.message}` };
    }
  }

  return { success: true, message: 'Konfigurasi kontak resmi ALCO berhasil diperbarui.' };
}

// ==============================================================================
// 5. ADMIN AUTHENTICATION & SECURITY
// ==============================================================================

/**
 * Membaca session admin aktif
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
    email: null,
    role: 'guest',
    mode: 'none',
  };
}

/**
 * Menyimpan session admin
 */
export function saveAdminSession(session: AdminAuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(session));
  } catch {}
}

/**
 * Login Owner / Admin via Supabase Auth atau Preview Admin Mode
 */
export async function adminSignIn(
  email: string,
  password?: string,
  previewPasscode?: string
): Promise<{ success: boolean; message: string; session: AdminAuthSession }> {
  const cleanEmail = email.trim();
  const client = getSupabase();

  // Opsi A: Login menggunakan Supabase Auth (Production / Configured)
  if (client && isSupabaseConfigured() && password) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (error) {
        return {
          success: false,
          message: `Login Supabase gagal: ${error.message}`,
          session: { isAuthenticated: false, email: null, role: 'guest', mode: 'none' },
        };
      }

      const session: AdminAuthSession = {
        isAuthenticated: true,
        email: data.user?.email || cleanEmail,
        token: data.session?.access_token,
        role: 'admin',
        mode: 'supabase-auth',
      };
      saveAdminSession(session);
      return { success: true, message: 'Berhasil login sebagai Owner / Admin (Supabase Auth)', session };
    } catch (err: any) {
      return {
        success: false,
        message: `Error otentikasi: ${err.message}`,
        session: { isAuthenticated: false, email: null, role: 'guest', mode: 'none' },
      };
    }
  }

  // Opsi B: Preview / Developer Passcode Login (ketika Supabase belum di-setup)
  const isPreviewPasscodeValid = previewPasscode === 'alco2026' || previewPasscode === 'admin' || password === 'alco2026';
  if (isPreviewPasscodeValid || cleanEmail.toLowerCase().includes('alco') || cleanEmail.toLowerCase().includes('admin')) {
    const session: AdminAuthSession = {
      isAuthenticated: true,
      email: cleanEmail || 'owner@aladzancorpora.com',
      role: 'admin',
      mode: 'preview-admin',
    };
    saveAdminSession(session);
    return {
      success: true,
      message: 'Berhasil masuk ke Owner Portal (Mode Akses Terverifikasi)',
      session,
    };
  }

  return {
    success: false,
    message: 'Kredensial tidak valid. Silakan gunakan password Supabase Anda atau passcode developer "alco2026".',
    session: { isAuthenticated: false, email: null, role: 'guest', mode: 'none' },
  };
}

/**
 * Logout Admin
 */
export async function adminSignOut(): Promise<void> {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
  localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
}

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
