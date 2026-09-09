/**
 * ALCO Hub - Installer & Desktop Application Service
 * Menjembatani komunikasi React UI dengan Electron IPC Main Process untuk
 * download installer GitHub Releases, verifikasi SHA-256, reusable installer caching,
 * deteksi proses aktif, eksekusi installer, dan deteksi status installed.
 */

import { EcosystemApp, AppLocalInstallation, AppInstallProgress, InstallResult, LocalInstallerCacheInfo } from '../types';
import { fetchFreshAppMetadata, updateCachedAppDownloadUrl } from './storeService';

/**
 * Memeriksa apakah aplikasi terpasang di sistem desktop lokal.
 */
export async function checkAppInstallation(appId: string): Promise<AppLocalInstallation> {
  const canonicalId = (appId || '').toLowerCase().trim();
  if (window.alcoHub && typeof window.alcoHub.checkAppInstalled === 'function') {
    try {
      const res = await window.alcoHub.checkAppInstalled(canonicalId);
      return res || { isInstalled: false, version: null, executablePath: null };
    } catch (err) {
      console.warn(`[ALCO Hub] checkAppInstalled error for ${canonicalId}:`, err);
      return { isInstalled: false, version: null, executablePath: null };
    }
  }

  return { isInstalled: false, version: null, executablePath: null };
}

/**
 * Memeriksa seluruh aplikasi ALCO yang terpasang di sistem desktop.
 */
export async function checkAllAppsInstallation(): Promise<Record<string, AppLocalInstallation>> {
  if (window.alcoHub && typeof window.alcoHub.checkAllAppsInstalled === 'function') {
    try {
      const res = await window.alcoHub.checkAllAppsInstalled();
      return res || {};
    } catch (err) {
      console.warn('[ALCO Hub] checkAllAppsInstalled error:', err);
      return {};
    }
  }

  return {};
}

/**
 * Memeriksa ketersediaan installer yang sudah diunduh dan diverifikasi di cache lokal.
 */
export async function checkInstallerCache(
  appId: string,
  version: string,
  sha256?: string
): Promise<{ cached: boolean; installerPath?: string; isValid?: boolean; fileSize?: number }> {
  const canonicalId = (appId || '').toLowerCase().trim();
  if (window.alcoHub && typeof window.alcoHub.getInstallerCacheInfo === 'function') {
    try {
      const res = await window.alcoHub.getInstallerCacheInfo({
        appId: canonicalId,
        version,
        sha256,
      });
      return res || { cached: false };
    } catch (err) {
      console.warn(`[ALCO Hub] checkInstallerCache error for ${canonicalId}:`, err);
      return { cached: false };
    }
  }
  return { cached: false };
}

/**
 * Memeriksa apakah proses aplikasi target sedang berjalan di komputer.
 */
export async function checkTargetAppRunning(
  appId: string
): Promise<{ isRunning: boolean; appName?: string }> {
  const canonicalId = (appId || '').toLowerCase().trim();
  if (window.alcoHub && typeof window.alcoHub.checkAppRunning === 'function') {
    try {
      const res = await window.alcoHub.checkAppRunning(canonicalId);
      return res || { isRunning: false };
    } catch {
      return { isRunning: false };
    }
  }
  return { isRunning: false };
}

/**
 * Menutup proses aplikasi target secara aman sebelum instalasi/update.
 */
export async function closeTargetApp(
  appId: string
): Promise<{ success: boolean; stillRunning?: boolean; error?: string }> {
  const canonicalId = (appId || '').toLowerCase().trim();
  if (window.alcoHub && typeof window.alcoHub.closeAppProcess === 'function') {
    try {
      const res = await window.alcoHub.closeAppProcess(canonicalId);
      return res || { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
  return { success: true };
}

// Track in-flight installation attempts to prevent redundant duplicate calls
const inFlightInstalls = new Set<string>();

export function isAppInstalling(appId: string): boolean {
  return inFlightInstalls.has((appId || '').toLowerCase().trim());
}

export interface StartInstallOptions {
  forceRedownload?: boolean;
}

/**
 * Memulai alur instalasi resmi untuk sebuah aplikasi ALCO:
 * 1. Memeriksa keberadaan installer di cache lokal (jika valid, skip download)
 * 2. Jika belum ada, download binary stream dengan progress bar
 * 3. Verifikasi SHA-256 binary installer
 * 4. Simpan ke reusable cache lokal
 * 5. Deteksi & tutup aplikasi lama yang sedang aktif secara aman
 * 6. Jalankan installer Windows Setup
 */
export async function startAppInstallation(
  app: EcosystemApp,
  onProgress?: (progress: AppInstallProgress) => void,
  options: StartInstallOptions = {}
): Promise<InstallResult> {
  const appId = app.appId || app.id;
  const canonicalId = (appId || '').toLowerCase().trim();

  if (inFlightInstalls.has(canonicalId)) {
    const errorMsg = 'Instalasi untuk aplikasi ini sedang diproses. Harap tunggu.';
    return { success: false, error: errorMsg };
  }

  inFlightInstalls.add(canonicalId);

  // 1. Audit Cache: Ambil metadata cloud terbaru untuk aplikasi ini langsung dari Supabase
  let freshApp: EcosystemApp | null = null;
  try {
    freshApp = await fetchFreshAppMetadata(appId);
  } catch {}

  const activeApp = freshApp || app;
  const downloadUrl = (activeApp.downloadUrl || app.downloadUrl || '').trim();
  const sha256 = (activeApp.sha256 || app.sha256 || '').trim();
  const latestVersion = activeApp.latestVersion || activeApp.version || app.latestVersion || app.version || '1.0.0';

  try {
    if (!downloadUrl) {
      const errorMsg = 'Download URL installer belum tersedia untuk aplikasi ini di rilis resmi.';
      if (onProgress) {
        onProgress({
          appId,
          status: 'failed',
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          error: errorMsg,
        });
      }
      return { success: false, error: errorMsg };
    }

    if (!sha256) {
      const errorMsg = 'SHA-256 Checksum resmi belum dikonfigurasi di katalog Supabase untuk memverifikasi keamanan file ini.';
      if (onProgress) {
        onProgress({
          appId,
          status: 'failed',
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          error: errorMsg,
        });
      }
      return { success: false, error: errorMsg };
    }

    if (!window.alcoHub?.downloadAndInstallApp) {
      const errorMsg = 'Instalasi desktop memerlukan runtime ALCO Hub Electron di Windows. Buka aplikasi via executable ALCO Hub.';
      if (onProgress) {
        onProgress({
          appId,
          status: 'failed',
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          error: errorMsg,
        });
      }
      return { success: false, error: errorMsg };
    }

    const result = await window.alcoHub.downloadAndInstallApp({
      appId,
      downloadUrl,
      sha256,
      latestVersion,
      appName: activeApp.name,
      forceRedownload: options.forceRedownload,
    });

    // Perbarui local cache jika Electron meresolve URL download yang lebih akurat
    if (result.resolvedDownloadUrl && result.resolvedDownloadUrl !== downloadUrl) {
      updateCachedAppDownloadUrl(appId, result.resolvedDownloadUrl, latestVersion, sha256);
    }

    if (!result.success && result.error && onProgress) {
      onProgress({
        appId,
        status: 'installation-failed',
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        error: result.error,
        fromCache: result.fromCache,
        installerPath: result.installerPath,
      });
    }

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || 'Gagal memulai instalasi melalui Electron IPC.';
    if (onProgress) {
      onProgress({
        appId,
        status: 'installation-failed',
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        error: errorMsg,
      });
    }
    return { success: false, error: errorMsg };
  } finally {
    inFlightInstalls.delete(canonicalId);
  }
}

/**
 * Mengulang proses instalasi menggunakan installer lokal yang sudah terunduh & terverifikasi (tanpa download ulang).
 */
export async function retryAppInstallation(
  app: EcosystemApp,
  onProgress?: (progress: AppInstallProgress) => void
): Promise<InstallResult> {
  return startAppInstallation(app, onProgress, { forceRedownload: false });
}

/**
 * Membuka aplikasi desktop yang sudah terpasang.
 */
export async function launchDesktopApp(appId: string): Promise<{ success: boolean; error?: string }> {
  const canonicalId = (appId || '').toLowerCase().trim();
  if (!window.alcoHub?.openDesktopApp) {
    return {
      success: false,
      error: 'Fitur peluncuran aplikasi memerlukan ALCO Hub runtime desktop.',
    };
  }

  return window.alcoHub.openDesktopApp(canonicalId);
}

/**
 * Mendengarkan event progress instalasi dari Electron Main process.
 */
export function subscribeToInstallProgress(
  callback: (data: AppInstallProgress) => void
): () => void {
  if (window.alcoHub && typeof window.alcoHub.onInstallProgress === 'function') {
    return window.alcoHub.onInstallProgress(callback);
  }
  return () => {};
}
