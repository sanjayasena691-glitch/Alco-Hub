/**
 * ALCO Hub - Installer & Desktop Application Service
 * Menjembatani komunikasi React UI dengan Electron IPC Main Process untuk
 * download installer GitHub Releases, verifikasi SHA-256, eksekusi installer, dan deteksi status installed.
 */

import { EcosystemApp, AppLocalInstallation, AppInstallProgress, InstallResult } from '../types';
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
 * Memulai alur instalasi resmi untuk sebuah aplikasi ALCO:
 * 1. Validasi URL HTTPS & SHA-256 Checksum
 * 2. Mengirim request ke Electron Main Process via IPC
 * 3. Electron mengunduh binary ke temp directory
 * 4. Electron menghitung & memverifikasi SHA-256
 * 5. Jika cocok, Electron mengeksekusi installer Windows
 */
export async function startAppInstallation(
  app: EcosystemApp,
  onProgress?: (progress: AppInstallProgress) => void
): Promise<InstallResult> {
  const appId = app.appId || app.id;

  // 1. Audit Cache: Ambil metadata cloud terbaru untuk aplikasi ini langsung dari Supabase
  // (bypassing 5-minute cache throttle) agar tidak memakai data stale
  let freshApp: EcosystemApp | null = null;
  try {
    freshApp = await fetchFreshAppMetadata(appId);
  } catch {}

  const activeApp = freshApp || app;
  const downloadUrl = (activeApp.downloadUrl || app.downloadUrl || '').trim();
  const sha256 = (activeApp.sha256 || app.sha256 || '').trim();
  const latestVersion = activeApp.latestVersion || activeApp.version || app.latestVersion || app.version || '1.0.0';

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

  try {
    const result = await window.alcoHub.downloadAndInstallApp({
      appId,
      downloadUrl,
      sha256,
      latestVersion,
      appName: activeApp.name,
    });

    // 2. Jika Electron berhasil meresolve actual download URL dari GitHub Releases:
    // Perbarui local cache agar tidak mempertahankan URL lama
    if (result.resolvedDownloadUrl && result.resolvedDownloadUrl !== downloadUrl) {
      updateCachedAppDownloadUrl(appId, result.resolvedDownloadUrl, latestVersion, sha256);
    }

    if (!result.success && result.error && onProgress) {
      onProgress({
        appId,
        status: 'failed',
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        error: result.error,
      });
    }

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || 'Gagal memulai instalasi melalui Electron IPC.';
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
