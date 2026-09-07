/**
 * ALCO Hub - Release Publisher & Management Service (Direct GitHub Releases Architecture)
 * 
 * Arsitektur Rilis Resmi:
 * 1. Menghitung SHA-256 Checksum file installer di browser secara aman sebelum diunggah (Web Crypto API)
 * 2. Mengunggah binary installer .exe LANGSUNG ke GitHub Releases API via direct stream (Bebas dari limit memori Edge Function)
 * 3. Memantau progres unggahan secara real-time via XHR Progress Events
 * 4. Menerima browser_download_url resmi dari GitHub Releases
 * 5. Memperbarui metadata katalog di Supabase (public.apps) menggunakan sesi terautentikasi Owner
 * 6. Kredensial GitHub (PAT) disimpan hanya di sesi Owner lokal (sessionStorage/memory), tidak pernah dibundel ke installer publik.
 */

import { EcosystemApp, ReleaseUploadProgress } from '../types';
import { saveAppToCloud } from './storeService';
import { getSupabase } from './supabaseClient';

const STORAGE_KEY_GITHUB_TOKEN = 'alco_owner_gh_token_session';
const STORAGE_KEY_GITHUB_OWNER = 'alco_owner_gh_repo_owner';
const STORAGE_KEY_GITHUB_REPO = 'alco_owner_gh_repo_name';

export const DEFAULT_GITHUB_REPO_OWNER = 'yaladzan92-creator';
export const DEFAULT_GITHUB_REPO_NAME = 'Alco-Releases';

export interface GitHubPublishConfig {
  token: string;
  owner: string;
  repo: string;
  rememberInSession: boolean;
}

/**
 * Membaca konfigurasi GitHub Publisher khusus Owner dari sessionStorage
 */
export function getGitHubPublishConfig(): GitHubPublishConfig {
  const sessionToken = sessionStorage.getItem(STORAGE_KEY_GITHUB_TOKEN) || '';
  const sessionOwner = sessionStorage.getItem(STORAGE_KEY_GITHUB_OWNER) || DEFAULT_GITHUB_REPO_OWNER;
  const sessionRepo = sessionStorage.getItem(STORAGE_KEY_GITHUB_REPO) || DEFAULT_GITHUB_REPO_NAME;

  return {
    token: sessionToken,
    owner: sessionOwner,
    repo: sessionRepo,
    rememberInSession: Boolean(sessionToken),
  };
}

/**
 * Menyimpan konfigurasi GitHub Publisher di sessionStorage Owner
 */
export function saveGitHubPublishConfig(config: {
  token: string;
  owner: string;
  repo: string;
}): void {
  if (config.token) {
    sessionStorage.setItem(STORAGE_KEY_GITHUB_TOKEN, config.token.trim());
  } else {
    sessionStorage.removeItem(STORAGE_KEY_GITHUB_TOKEN);
  }

  if (config.owner) {
    sessionStorage.setItem(STORAGE_KEY_GITHUB_OWNER, config.owner.trim());
  }

  if (config.repo) {
    sessionStorage.setItem(STORAGE_KEY_GITHUB_REPO, config.repo.trim());
  }
}

/**
 * Menghapus token GitHub dari sesi
 */
export function clearGitHubPublishConfig(): void {
  sessionStorage.removeItem(STORAGE_KEY_GITHUB_TOKEN);
}

/**
 * Menghitung SHA-256 hash dari File lokal menggunakan Web Crypto API
 */
export async function calculateFileSha256(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (onProgress) onProgress(10);

  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(60);

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  if (onProgress) onProgress(90);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  if (onProgress) onProgress(100);
  return hashHex.toLowerCase();
}

export interface DirectPublishOptions {
  app: EcosystemApp;
  file: File;
  version: string;
  releaseNotes: string;
  githubConfig: GitHubPublishConfig;
  onProgress: (progress: ReleaseUploadProgress) => void;
}

export interface PublishResult {
  success: boolean;
  data?: {
    appId: string;
    version: string;
    tag: string;
    releaseName: string;
    downloadUrl: string;
    sha256: string;
    htmlUrl?: string;
    fileName?: string;
    published?: boolean;
  };
  error?: string;
}

/**
 * Eksekusi Alur Rilis Direct ke GitHub Releases & Update Supabase
 */
export async function uploadAndPublishRelease({
  app,
  file,
  version,
  releaseNotes,
  githubConfig,
  onProgress,
}: DirectPublishOptions): Promise<PublishResult> {
  const appId = app.appId || app.id;
  const cleanAppId = appId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  const cleanVersion = version.trim().replace(/^v/i, '').replace(/[^0-9.]/g, '') || '0.1.0';
  const cleanNotes = releaseNotes.trim() || `Rilis resmi ${app.name} versi v${cleanVersion} didistribusikan melalui ALCO Hub.`;
  const ghToken = githubConfig.token.trim();
  const ghOwner = githubConfig.owner.trim() || DEFAULT_GITHUB_REPO_OWNER;
  const ghRepo = githubConfig.repo.trim() || DEFAULT_GITHUB_REPO_NAME;

  // 1. Validasi Input
  if (!ghToken) {
    const errorMsg = 'GitHub Personal Access Token (PAT) belum diisi. Masukkan token dengan scope "repo" di panel konfigurasi GitHub.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file?.size || 0,
      currentStepMessage: 'GitHub Token diperlukan.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  if (!file || !file.name.toLowerCase().endsWith('.exe')) {
    const errorMsg = 'File harus berupa installer Windows executable (.exe).';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file?.size || 0,
      currentStepMessage: 'Gagal validasi file.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // 2. Step: Menghitung SHA-256
  onProgress({
    status: 'preparing',
    progressPercent: 5,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: 'Menghitung SHA-256 Checksum file installer di browser...',
  });

  let sha256 = '';
  try {
    sha256 = await calculateFileSha256(file, (pct) => {
      onProgress({
        status: 'preparing',
        progressPercent: Math.round(5 + pct * 0.15), // 5% -> 20%
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: `Memverifikasi hash SHA-256 lokal (${pct}%)...`,
      });
    });
  } catch (err: any) {
    const errorMsg = `Gagal menghitung SHA-256: ${err?.message || 'Error tidak diketahui'}`;
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Gagal memproses file.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  const tagName = `${cleanAppId}-v${cleanVersion}`;
  const releaseTitle = `${app.name} v${cleanVersion}`;

  const githubApiHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 3. Step: Memeriksa apakah Tag / Release sudah ada di GitHub (Immutability Check)
  onProgress({
    status: 'creating_release',
    progressPercent: 25,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: `Memeriksa tag "${tagName}" di GitHub ${ghOwner}/${ghRepo}...`,
    sha256,
  });

  try {
    const checkTagUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/releases/tags/${encodeURIComponent(tagName)}`;
    const checkTagRes = await fetch(checkTagUrl, { headers: githubApiHeaders });

    if (checkTagRes.ok) {
      const errorMsg = `Versi ${cleanVersion} sudah pernah dirilis (GitHub Tag: "${tagName}"). Rilis lama bersifat permanen dan tidak dapat ditimpa. Silakan naikkan nomor versi.`;
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: 'Tag release sudah ada.',
        error: errorMsg,
        sha256,
      });
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    console.warn('Gagal cek tag rilis GitHub:', err);
  }

  // 4. Step: Membuat Release di GitHub
  onProgress({
    status: 'creating_release',
    progressPercent: 30,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: `Membuat Release "${releaseTitle}" di GitHub...`,
    sha256,
  });

  let uploadUrl = '';
  let releaseHtmlUrl = '';
  try {
    const createReleaseUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/releases`;
    const createRes = await fetch(createReleaseUrl, {
      method: 'POST',
      headers: {
        ...githubApiHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: releaseTitle,
        body: cleanNotes,
        draft: false,
        prerelease: false,
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.json().catch(() => ({}));
      const errorMsg = `Gagal membuat GitHub Release (HTTP ${createRes.status}): ${errBody.message || createRes.statusText}`;
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: 'Gagal membuat release di GitHub.',
        error: errorMsg,
        sha256,
      });
      return { success: false, error: errorMsg };
    }

    const releaseData = await createRes.json();
    uploadUrl = releaseData.upload_url;
    releaseHtmlUrl = releaseData.html_url;
  } catch (err: any) {
    const errorMsg = `Koneksi ke GitHub API gagal: ${err?.message || 'Network error'}`;
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Koneksi ke GitHub API gagal.',
      error: errorMsg,
      sha256,
    });
    return { success: false, error: errorMsg };
  }

  // 5. Step: Upload Binary Asset LANGSUNG ke GitHub Releases (uploads.github.com)
  // Format URL upload GitHub: https://uploads.github.com/repos/.../releases/.../assets{?name,label}
  const cleanUploadEndpoint = uploadUrl.replace(/\{\?name,label\}$/, '');
  const assetUploadUrl = `${cleanUploadEndpoint}?name=${encodeURIComponent(file.name)}`;

  onProgress({
    status: 'uploading',
    progressPercent: 35,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: `Mengunggah installer (.exe) langsung ke GitHub Releases CDN...`,
    sha256,
  });

  const uploadResult = await new Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', assetUploadUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${ghToken}`);
    xhr.setRequestHeader('Accept', 'application/vnd.github+json');
    xhr.setRequestHeader('X-GitHub-Api-Version', '2022-11-28');
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Progress dari 35% sampai 90%
        const percent = Math.min(90, Math.round(35 + (event.loaded / event.total) * 55));
        onProgress({
          status: 'uploading',
          progressPercent: percent,
          bytesUploaded: event.loaded,
          totalBytes: event.total,
          currentStepMessage: `Mengunggah ke GitHub (${Math.round((event.loaded / 1024 / 1024) * 10) / 10} MB / ${Math.round((event.total / 1024 / 1024) * 10) / 10} MB)...`,
          sha256,
        });
      }
    };

    xhr.onload = () => {
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(xhr.responseText);
      } catch {
        // not JSON
      }

      if (xhr.status >= 200 && xhr.status < 300 && responseJson?.browser_download_url) {
        resolve({
          success: true,
          downloadUrl: responseJson.browser_download_url,
        });
      } else {
        const errorMsg =
          responseJson?.message ||
          responseJson?.errors?.[0]?.message ||
          `Unggahan asset ke GitHub gagal (HTTP ${xhr.status}): ${xhr.statusText}`;
        resolve({
          success: false,
          error: errorMsg,
        });
      }
    };

    xhr.onerror = () => {
      resolve({
        success: false,
        error: 'Koneksi jaringan ke uploads.github.com terputus saat mengunggah file binary.',
      });
    };

    xhr.onabort = () => {
      resolve({
        success: false,
        error: 'Unggahan dibatalkan oleh pengguna.',
      });
    };

    // Kirim binary file langsung
    xhr.send(file);
  });

  if (!uploadResult.success || !uploadResult.downloadUrl) {
    const errorMsg = uploadResult.error || 'Gagal mengunggah binary asset ke GitHub Releases.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Gagal mengunggah file installer ke GitHub.',
      error: errorMsg,
      sha256,
    });
    return { success: false, error: errorMsg };
  }

  const officialDownloadUrl = uploadResult.downloadUrl;

  // 6. Step: Update Supabase Catalog (public.apps)
  onProgress({
    status: 'updating_catalog',
    progressPercent: 92,
    bytesUploaded: file.size,
    totalBytes: file.size,
    currentStepMessage: 'Menyimpan metadata rilis baru ke tabel Supabase public.apps...',
    sha256,
  });

  const updatedApp: EcosystemApp = {
    ...app,
    latestVersion: cleanVersion,
    downloadUrl: officialDownloadUrl,
    sha256: sha256,
    releaseNotes: cleanNotes,
    updatedAt: new Date().toISOString(),
  };

  const cloudSaveRes = await saveAppToCloud(updatedApp, false);

  if (!cloudSaveRes.success) {
    console.warn('[ALCO Hub] Gagal memperbarui Supabase secara otomatis:', cloudSaveRes.message);
  }

  // 7. Step: Selesai!
  const finalReleaseData = {
    appId: cleanAppId,
    version: cleanVersion,
    tag: tagName,
    releaseName: releaseTitle,
    downloadUrl: officialDownloadUrl,
    sha256: sha256,
    htmlUrl: releaseHtmlUrl,
    fileName: file.name,
    published: app.published,
  };

  onProgress({
    status: 'completed',
    progressPercent: 100,
    bytesUploaded: file.size,
    totalBytes: file.size,
    currentStepMessage: 'Rilis resmi berhasil dipublikasikan ke GitHub & Supabase!',
    sha256,
    releaseData: finalReleaseData,
  });

  return {
    success: true,
    data: finalReleaseData,
  };
}

/**
 * Generate GitHub CLI script untuk rilis lokal via terminal Owner
 */
export function generateGhCliCommand({
  appId,
  appName,
  version,
  fileName,
  notes,
  repoOwner,
  repoName,
}: {
  appId: string;
  appName: string;
  version: string;
  fileName: string;
  notes: string;
  repoOwner?: string;
  repoName?: string;
}): {
  cliCommand: string;
  tag: string;
  title: string;
} {
  const cleanAppId = appId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  const cleanVersion = version.replace(/^v/i, '').trim();
  const tag = `${cleanAppId}-v${cleanVersion}`;
  const title = `${appName} v${cleanVersion}`;
  const owner = repoOwner || DEFAULT_GITHUB_REPO_OWNER;
  const repo = repoName || DEFAULT_GITHUB_REPO_NAME;
  const cleanNotes = (notes || `Rilis resmi ${appName} v${cleanVersion}`).replace(/"/g, '\\"');

  const cliCommand = `gh release create "${tag}" "${fileName}" --repo "${owner}/${repo}" --title "${title}" --notes "${cleanNotes}"`;

  return {
    cliCommand,
    tag,
    title,
  };
}

/**
 * 1-Click Sync Metadata Supabase setelah rilis via GitHub CLI berhasil
 */
export async function syncCliReleaseToSupabase({
  app,
  version,
  fileName,
  sha256,
  releaseNotes,
  repoOwner,
  repoName,
}: {
  app: EcosystemApp;
  version: string;
  fileName: string;
  sha256: string;
  releaseNotes?: string;
  repoOwner?: string;
  repoName?: string;
}): Promise<{ success: boolean; message: string; updatedApp?: EcosystemApp }> {
  const cleanAppId = (app.appId || app.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  const cleanVersion = version.replace(/^v/i, '').trim();
  const tagName = `${cleanAppId}-v${cleanVersion}`;
  const owner = repoOwner || DEFAULT_GITHUB_REPO_OWNER;
  const repo = repoName || DEFAULT_GITHUB_REPO_NAME;
  
  // Format standar GitHub Releases direct asset download URL
  const officialDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${encodeURIComponent(tagName)}/${encodeURIComponent(fileName)}`;
  const cleanNotes = releaseNotes?.trim() || `Rilis resmi ${app.name} versi v${cleanVersion}.`;

  const updatedApp: EcosystemApp = {
    ...app,
    latestVersion: cleanVersion,
    downloadUrl: officialDownloadUrl,
    sha256: sha256.trim().toLowerCase(),
    releaseNotes: cleanNotes,
    updatedAt: new Date().toISOString(),
  };

  const cloudSaveRes = await saveAppToCloud(updatedApp, false);

  if (cloudSaveRes.success) {
    return {
      success: true,
      message: `Metadata rilis v${cleanVersion} (${app.name}) berhasil disinkronkan ke Supabase!`,
      updatedApp,
    };
  } else {
    return {
      success: false,
      message: cloudSaveRes.message || 'Gagal menyimpan metadata ke Supabase.',
      updatedApp,
    };
  }
}

export interface OneClickReleaseOptions {
  app: EcosystemApp;
  version: string;
  filePath: string;
  fileName?: string;
  releaseNotes?: string;
  repoOwner?: string;
  repoName?: string;
  onProgress: (progress: ReleaseUploadProgress) => void;
}

export interface OneClickReleaseResult {
  success: boolean;
  stage: 'completed' | 'supabase_sync_failed' | 'github_failed';
  data?: any;
  updatedApp?: EcosystemApp;
  message: string;
  error?: string;
}

/**
 * Eksekusi One-Click Release Pipeline melalui Electron Main Process GitHub CLI & Auto-Sync Supabase
 */
export async function executeOneClickRelease({
  app,
  version,
  filePath,
  fileName,
  releaseNotes,
  repoOwner = DEFAULT_GITHUB_REPO_OWNER,
  repoName = DEFAULT_GITHUB_REPO_NAME,
  onProgress,
}: OneClickReleaseOptions): Promise<OneClickReleaseResult> {
  const cleanAppId = (app.appId || app.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  const cleanVersion = version.replace(/^v/i, '').trim() || '1.0.0';
  const cleanNotes = (releaseNotes?.trim() || `Rilis resmi ${app.name} versi v${cleanVersion}.`);

  if (!window.alcoHub?.publishReleaseGhCli) {
    const errorMsg = 'Fitur One-Click Release membutuhkan aplikasi desktop ALCO Hub (Electron runtime). Di lingkungan web browser, silakan gunakan menu Advanced Tools -> Manual GitHub CLI.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      currentStepMessage: 'Electron runtime tidak tersedia.',
      error: errorMsg,
    });
    return {
      success: false,
      stage: 'github_failed',
      message: errorMsg,
      error: errorMsg,
    };
  }

  // Setup unlistener for IPC progress
  let cleanupProgressListener: (() => void) | null = null;
  if (typeof window.alcoHub?.onReleasePublishProgress === 'function') {
    cleanupProgressListener = window.alcoHub.onReleasePublishProgress((event) => {
      onProgress({
        status: event.step,
        progressPercent: event.progressPercent,
        bytesUploaded: 0,
        totalBytes: event.fileSize || 0,
        currentStepMessage: event.message,
        sha256: event.sha256,
        error: event.error,
        releaseData: event.releaseData
          ? {
              appId: event.releaseData.appId,
              version: event.releaseData.version,
              tag: event.releaseData.tag,
              releaseName: event.releaseData.releaseName,
              downloadUrl: event.releaseData.downloadUrl,
              sha256: event.releaseData.sha256,
              htmlUrl: event.releaseData.htmlUrl,
              fileName: event.releaseData.fileName,
              fileSize: event.releaseData.fileSize,
              published: app.published,
            }
          : undefined,
      });
    });
  }

  try {
    // 1. Jalankan proses One-Click GitHub CLI di Main Process
    onProgress({
      status: 'preparing',
      progressPercent: 5,
      bytesUploaded: 0,
      totalBytes: 0,
      currentStepMessage: 'Menghubungkan ke GitHub CLI di mesin Owner...',
    });

    const result = await window.alcoHub.publishReleaseGhCli({
      appId: cleanAppId,
      appName: app.name,
      version: cleanVersion,
      filePath,
      releaseNotes: cleanNotes,
      repoOwner,
      repoName,
    });

    if (cleanupProgressListener) {
      cleanupProgressListener();
    }

    if (!result.success || !result.data) {
      const errorMsg = result.error || 'Gagal mempublikasikan release melalui GitHub CLI.';
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: 0,
        currentStepMessage: 'Publikasi ke GitHub gagal.',
        error: errorMsg,
      });
      return {
        success: false,
        stage: 'github_failed',
        message: errorMsg,
        error: errorMsg,
      };
    }

    const ghData = result.data;

    // 2. Step Otomatis: Sync Metadata ke Supabase
    onProgress({
      status: 'syncing_metadata',
      progressPercent: 92,
      bytesUploaded: ghData.fileSize || 0,
      totalBytes: ghData.fileSize || 0,
      currentStepMessage: 'Binary berhasil diunggah ke GitHub! Menyinkronkan metadata ke Supabase public.apps...',
      sha256: ghData.sha256,
      releaseData: {
        appId: ghData.appId,
        version: ghData.version,
        tag: ghData.tag,
        releaseName: ghData.releaseName,
        downloadUrl: ghData.downloadUrl,
        sha256: ghData.sha256,
        htmlUrl: ghData.htmlUrl,
        fileName: ghData.fileName,
        fileSize: ghData.fileSize,
        published: app.published,
      },
    });

    const updatedApp: EcosystemApp = {
      ...app,
      latestVersion: ghData.version,
      downloadUrl: ghData.downloadUrl,
      sha256: ghData.sha256,
      releaseNotes: cleanNotes,
      updatedAt: new Date().toISOString(),
    };

    const cloudSaveRes = await saveAppToCloud(updatedApp, false);

    if (cloudSaveRes.success) {
      const successMsg = `Rilis resmi ${app.name} v${ghData.version} berhasil dipublikasikan ke GitHub Releases dan Supabase!`;
      onProgress({
        status: 'published',
        progressPercent: 100,
        bytesUploaded: ghData.fileSize || 0,
        totalBytes: ghData.fileSize || 0,
        currentStepMessage: 'Release berhasil dipublikasikan & metadata Supabase aktif!',
        sha256: ghData.sha256,
        releaseData: {
          appId: ghData.appId,
          version: ghData.version,
          tag: ghData.tag,
          releaseName: ghData.releaseName,
          downloadUrl: ghData.downloadUrl,
          sha256: ghData.sha256,
          htmlUrl: ghData.htmlUrl,
          fileName: ghData.fileName,
          fileSize: ghData.fileSize,
          published: app.published,
        },
      });

      return {
        success: true,
        stage: 'completed',
        data: ghData,
        updatedApp,
        message: successMsg,
      };
    } else {
      // Supabase failed, but GitHub binary is intact
      const failMsg = cloudSaveRes.message || 'Gagal menyimpan metadata ke Supabase.';
      onProgress({
        status: 'syncing_metadata',
        progressPercent: 92,
        bytesUploaded: ghData.fileSize || 0,
        totalBytes: ghData.fileSize || 0,
        currentStepMessage: 'Binary berhasil di GitHub, metadata belum tersinkron.',
        error: failMsg,
        sha256: ghData.sha256,
        releaseData: {
          appId: ghData.appId,
          version: ghData.version,
          tag: ghData.tag,
          releaseName: ghData.releaseName,
          downloadUrl: ghData.downloadUrl,
          sha256: ghData.sha256,
          htmlUrl: ghData.htmlUrl,
          fileName: ghData.fileName,
          fileSize: ghData.fileSize,
          published: app.published,
        },
      });

      return {
        success: false,
        stage: 'supabase_sync_failed',
        data: ghData,
        updatedApp,
        message: 'Binary berhasil di GitHub, metadata belum tersinkron.',
        error: failMsg,
      };
    }
  } catch (err) {
    if (cleanupProgressListener) {
      cleanupProgressListener();
    }
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat One-Click Release.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      currentStepMessage: 'Proses rilis terhenti.',
      error: errorMsg,
    });
    return {
      success: false,
      stage: 'github_failed',
      message: errorMsg,
      error: errorMsg,
    };
  }
}
