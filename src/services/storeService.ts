/**
 * ALCO Hub - Store & License Service
 * Mengelola katalog aplikasi, lisensi pengguna, persistensi, dan kontak resmi Aladzan Corpora.
 */

import { EcosystemApp, UserLicense, ContactAlcoConfig } from '../types';
import { ECOSYSTEM_APPS as DEFAULT_APPS } from '../config/ecosystemApps';

const STORAGE_KEY_CUSTOM_APPS = 'alco_hub_custom_catalog_v1';
const STORAGE_KEY_USER_LICENSES = 'alco_hub_user_licenses_v1';
const STORAGE_KEY_CONTACT_CONFIG = 'alco_hub_contact_config_v1';
const STORAGE_KEY_INSTALLED_VERSIONS = 'alco_hub_installed_versions_v1';

export const DEFAULT_CONTACT_CONFIG: ContactAlcoConfig = {
  whatsappNumber: '6281234567890',
  supportEmail: 'contact@aladzancorpora.com',
  companyName: 'Aladzan Corpora',
  ownerName: 'ALCO Licensing Division',
};

/**
 * Mendapatkan seluruh katalog aplikasi (default + yang dipublish oleh owner)
 */
export function getCatalogApps(): EcosystemApp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_APPS);
    if (!raw) return DEFAULT_APPS;
    const parsed = JSON.parse(raw) as EcosystemApp[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load custom catalog apps:', err);
  }
  return DEFAULT_APPS;
}

/**
 * Menyimpan seluruh katalog aplikasi (digunakan oleh Owner saat publish/edit app)
 */
export function saveCatalogApps(apps: EcosystemApp[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_APPS, JSON.stringify(apps));
  } catch (err) {
    console.error('Failed to save custom catalog apps:', err);
  }
}

/**
 * Mereset katalog ke default
 */
export function resetCatalogToDefault(): EcosystemApp[] {
  localStorage.removeItem(STORAGE_KEY_CUSTOM_APPS);
  return DEFAULT_APPS;
}

/**
 * Mendapatkan daftar lisensi aktif pengguna dari localStorage
 */
export function getUserLicenses(): Record<string, UserLicense> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_LICENSES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load user licenses:', err);
    return {};
  }
}

/**
 * Memeriksa apakah pengguna memiliki lisensi aktif untuk app tertentu
 */
export function isAppLicensed(app: EcosystemApp, userLicenses: Record<string, UserLicense>): boolean {
  if (app.pricingType === 'free') return true;
  if (app.pricingType === 'coming-soon') return false;

  const license = userLicenses[app.id] || (app.requiredLicenseAppId ? userLicenses[app.requiredLicenseAppId] : undefined);
  return Boolean(license && license.status === 'active');
}

/**
 * Mengaktifkan lisensi baru untuk pengguna
 */
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
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan lisensi ke storage lokal.' };
  }
}

/**
 * Menghapus/mencabut lisensi pengguna
 */
export function revokeLicense(appId: string): void {
  const licenses = getUserLicenses();
  delete licenses[appId];
  localStorage.setItem(STORAGE_KEY_USER_LICENSES, JSON.stringify(licenses));
}

/**
 * Helper untuk membuat License Key resmi ALCO (digunakan oleh Owner di Admin Panel)
 */
export function generateLicenseKey(appId: string): string {
  const prefix = appId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'APP';
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part3 = Math.floor(1000 + Math.random() * 9000);
  return `ALCO-${prefix}-${part1}-${part2}-${part3}`;
}

/**
 * Mengambil konfigurasi kontak ALCO
 */
export function getContactConfig(): ContactAlcoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACT_CONFIG);
    if (!raw) return DEFAULT_CONTACT_CONFIG;
    return { ...DEFAULT_CONTACT_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULT_CONTACT_CONFIG;
  }
}

/**
 * Menyimpan konfigurasi kontak ALCO
 */
export function saveContactConfig(config: ContactAlcoConfig): void {
  localStorage.setItem(STORAGE_KEY_CONTACT_CONFIG, JSON.stringify(config));
}

/**
 * Helper untuk membuat link WhatsApp pemesanan lisensi
 */
export function createWhatsAppOrderLink(app: EcosystemApp, contact: ContactAlcoConfig): string {
  const message = `Halo ${contact.companyName}, saya ingin membeli/mengaktifkan Lisensi Resmi untuk aplikasi:\n\n*Aplikasi:* ${app.name}\n*App ID:* ${app.id}\n*Fungsi:* ${app.functionLabel}\n*Harga/Paket:* ${app.priceLabel || 'Lisensi Resmi'}\n\nMohon informasi prosedur aktivasi lisensi ALCO Hub saya. Terima kasih!`;
  const cleanPhone = contact.whatsappNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Versi lokal yang di-update user
 */
export function getInstalledVersions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INSTALLED_VERSIONS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setInstalledVersion(appId: string, version: string): void {
  const versions = getInstalledVersions();
  versions[appId] = version;
  localStorage.setItem(STORAGE_KEY_INSTALLED_VERSIONS, JSON.stringify(versions));
}
