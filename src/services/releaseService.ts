/**
 * ALCO Hub - Release Publisher & Management Service
 * 
 * Official Primary Workflow:
 * 1. Owner memilih aplikasi dan file installer Windows (.exe).
 * 2. Menghitung SHA-256 Checksum lokal secara instan.
 * 3. Electron Main Process mengeksekusi GitHub CLI (gh) secara aman (spawn tanpa shell injection).
 * 4. GitHub Release dibuat/diverifikasi dan installer diunggah dengan opsi --clobber.
 * 5. Metadata rilis (versi terbaru, downloadUrl, sha256) disinkronkan otomatis ke Supabase public.apps.
 * 6. Tidak memerlukan PAT, terminal manual, atau binary upload Edge Function.
 * 
 * Legacy / Advanced Fallback:
 * - Direct In-App Browser Stream (via GitHub Personal Access Token) ditandai sebagai @deprecated dan hanya dapat diakses melalui menu Advanced Tools.
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
 * @deprecated Legacy Fallback: Eksekusi Alur Rilis Direct ke GitHub Releases via Browser HTTP PAT Stream & Update Supabase.
 * Workflow resmi dan default adalah One-Click GitHub CLI (`executeOneClickRelease`).
 * Jalur ini hanya disediakan di bawah menu "Advanced Tools" untuk situasi khusus di luar desktop runtime.
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
 * Discovered GitHub Release Asset info from live GitHub API
 */
export interface DiscoveredReleaseAsset {
  tag: string;
  version: string;
  fileName: string;
  browserDownloadUrl: string;
  fileSize: number;
  releaseHtmlUrl: string;
  releaseName: string;
  publishedAt?: string;
}

/**
 * Mengambil informasi release & binary asset aktual dari GitHub API secara aman (Source of Truth).
 * Tidak lagi menebak release tag atau asset filename.
 */
export async function discoverAndVerifyGitHubReleaseAsset({
  appId,
  appName,
  version,
  tagHint,
  fileNameHint,
  repoOwner = DEFAULT_GITHUB_REPO_OWNER,
  repoName = DEFAULT_GITHUB_REPO_NAME,
  token,
}: {
  appId: string;
  appName?: string;
  version?: string;
  tagHint?: string;
  fileNameHint?: string;
  repoOwner?: string;
  repoName?: string;
  token?: string;
}): Promise<{
  success: boolean;
  data?: DiscoveredReleaseAsset;
  error?: string;
}> {
  const cleanOwner = (repoOwner || DEFAULT_GITHUB_REPO_OWNER).trim();
  const cleanRepo = (repoName || DEFAULT_GITHUB_REPO_NAME).trim();
  const cleanAppId = (appId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanVersion = (version || '').trim().replace(/^v/i, '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const sessionToken = token || sessionStorage.getItem(STORAGE_KEY_GITHUB_TOKEN) || '';
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken.trim()}`;
  }

  try {
    // 1. Jika ada tagHint spesifik, coba ambil langsung detail tag rilis tersebut
    if (tagHint) {
      try {
        const directTagUrl = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/releases/tags/${encodeURIComponent(tagHint.trim())}`;
        const directRes = await fetch(directTagUrl, { headers });
        if (directRes.ok) {
          const releaseJson = await directRes.json();
          if (Array.isArray(releaseJson.assets) && releaseJson.assets.length > 0) {
            // Temukan asset .exe yang cocok
            const matchedAsset =
              releaseJson.assets.find(
                (a: any) => fileNameHint && a.name?.toLowerCase() === fileNameHint.toLowerCase()
              ) ||
              releaseJson.assets.find((a: any) => a.name?.toLowerCase().endsWith('.exe')) ||
              releaseJson.assets[0];

            if (matchedAsset && matchedAsset.browser_download_url) {
              return {
                success: true,
                data: {
                  tag: releaseJson.tag_name,
                  version: cleanVersion || releaseJson.tag_name.replace(/.*v/i, ''),
                  fileName: matchedAsset.name,
                  browserDownloadUrl: matchedAsset.browser_download_url,
                  fileSize: matchedAsset.size || 0,
                  releaseHtmlUrl: releaseJson.html_url,
                  releaseName: releaseJson.name || releaseJson.tag_name,
                  publishedAt: releaseJson.published_at,
                },
              };
            }
          }
        }
      } catch (directErr) {
        console.warn('[Release Discovery] Direct tag fetch error:', directErr);
      }
    }

    // 2. Query daftar seluruh releases dari repo GitHub aktual
    const releasesListUrl = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/releases?per_page=100`;
    const listRes = await fetch(releasesListUrl, { headers });

    if (!listRes.ok) {
      if (listRes.status === 404) {
        return {
          success: false,
          error: `Repository GitHub "${cleanOwner}/${cleanRepo}" tidak ditemukan atau berstatus privat.`,
        };
      }
      return {
        success: false,
        error: `Gagal membaca releases dari GitHub (HTTP ${listRes.status}).`,
      };
    }

    const releases = await listRes.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      return {
        success: false,
        error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    // Helper keywords untuk pencocokan toleran (menghandle variasi nama atau typo seperti sytem / system)
    const appKeywords = [
      cleanAppId,
      cleanAppId.replace(/^alco-/, ''),
      appName?.toLowerCase() || '',
    ]
      .flatMap((s) => s.split(/[^a-z0-9]+/))
      .filter((w) => w.length >= 3);

    // Filter candidate release
    let bestRelease: any = null;

    // Prioritas 1: Tag name persis atau memuat cleanAppId + version
    for (const rel of releases) {
      const relTag = (rel.tag_name || '').toLowerCase();
      const relTitle = (rel.name || '').toLowerCase();

      // Cek apakah tagHint cocok
      if (tagHint && relTag === tagHint.toLowerCase()) {
        bestRelease = rel;
        break;
      }

      // Cek apakah memuat version dan appId / app keywords
      const hasVersion = cleanVersion ? relTag.includes(cleanVersion) || relTitle.includes(cleanVersion) : true;
      const hasAppKeyword = appKeywords.some((kw) => relTag.includes(kw) || relTitle.includes(kw));

      if (hasVersion && hasAppKeyword) {
        bestRelease = rel;
        break;
      }
    }

    // Prioritas 2: Fallback ke rilis yang memuat version jika hanya ada satu
    if (!bestRelease && cleanVersion) {
      bestRelease = releases.find((rel: any) => (rel.tag_name || '').toLowerCase().includes(cleanVersion));
    }

    if (!bestRelease) {
      return {
        success: false,
        error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    // 3. Cari asset installer (.exe) aktual di dalam release
    if (!Array.isArray(bestRelease.assets) || bestRelease.assets.length === 0) {
      return {
        success: false,
        error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    const matchedAsset =
      bestRelease.assets.find(
        (a: any) => fileNameHint && a.name?.toLowerCase() === fileNameHint.toLowerCase()
      ) ||
      bestRelease.assets.find((a: any) => a.name?.toLowerCase().endsWith('.exe')) ||
      bestRelease.assets[0];

    if (!matchedAsset || !matchedAsset.browser_download_url) {
      return {
        success: false,
        error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    // Ekstrak versi dari tag jika memungkinkan (misal: "alco-creative-sytem-v1.0.2" -> "1.0.2")
    const extractedVerMatch = (bestRelease.tag_name || '').match(/v?([0-9]+(\.[0-9]+)+)/i);
    const extractedVer = extractedVerMatch ? extractedVerMatch[1] : cleanVersion || '1.0.0';

    return {
      success: true,
      data: {
        tag: bestRelease.tag_name,
        version: extractedVer,
        fileName: matchedAsset.name,
        browserDownloadUrl: matchedAsset.browser_download_url,
        fileSize: matchedAsset.size || 0,
        releaseHtmlUrl: bestRelease.html_url,
        releaseName: bestRelease.name || bestRelease.tag_name,
        publishedAt: bestRelease.published_at,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Koneksi ke GitHub Releases API gagal.',
    };
  }
}

/**
 * 1-Click Sync Metadata Supabase setelah rilis via GitHub CLI berhasil
 * Menggunakan browser_download_url aktual dari GitHub sebagai Source of Truth.
 */
export async function syncCliReleaseToSupabase({
  app,
  version,
  fileName,
  sha256,
  releaseNotes,
  repoOwner = DEFAULT_GITHUB_REPO_OWNER,
  repoName = DEFAULT_GITHUB_REPO_NAME,
  explicitDownloadUrl,
  explicitTag,
}: {
  app: EcosystemApp;
  version: string;
  fileName?: string;
  sha256: string;
  releaseNotes?: string;
  repoOwner?: string;
  repoName?: string;
  explicitDownloadUrl?: string;
  explicitTag?: string;
}): Promise<{
  success: boolean;
  message: string;
  updatedApp?: EcosystemApp;
  discoveredData?: DiscoveredReleaseAsset;
}> {
  const cleanVersion = version.replace(/^v/i, '').trim();
  const cleanSha256 = (sha256 || '').trim().toLowerCase();

  if (!cleanSha256 || cleanSha256.length !== 64) {
    return {
      success: false,
      message: 'SHA-256 Checksum tidak valid (harus 64 karakter hex). Hitung checksum file terlebih dahulu.',
    };
  }

  let finalDownloadUrl = explicitDownloadUrl;
  let finalTag = explicitTag;
  let finalFileName = fileName;
  let finalVersion = cleanVersion;
  let discoveredInfo: DiscoveredReleaseAsset | undefined = undefined;

  // Jika download URL belum terverifikasi dari data aktual, lakukan discovery dari GitHub Releases
  if (!finalDownloadUrl) {
    const discovery = await discoverAndVerifyGitHubReleaseAsset({
      appId: app.appId || app.id,
      appName: app.name,
      version: cleanVersion,
      tagHint: explicitTag,
      fileNameHint: fileName,
      repoOwner,
      repoName,
    });

    if (!discovery.success || !discovery.data) {
      return {
        success: false,
        message: discovery.error || 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    discoveredInfo = discovery.data;
    finalDownloadUrl = discovery.data.browserDownloadUrl;
    finalTag = discovery.data.tag;
    finalFileName = discovery.data.fileName;
    finalVersion = discovery.data.version || cleanVersion;
  }

  // Validasi ketat: pastikan final download URL valid HTTPS dan tidak kosong
  if (!finalDownloadUrl || !finalDownloadUrl.startsWith('https://')) {
    return {
      success: false,
      message: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
    };
  }

  const cleanNotes = releaseNotes?.trim() || `Rilis resmi ${app.name} versi v${finalVersion}.`;

  const updatedApp: EcosystemApp = {
    ...app,
    latestVersion: finalVersion,
    downloadUrl: finalDownloadUrl,
    sha256: cleanSha256,
    releaseNotes: cleanNotes,
    updatedAt: new Date().toISOString(),
  };

  const cloudSaveRes = await saveAppToCloud(updatedApp, false);

  if (cloudSaveRes.success) {
    return {
      success: true,
      message: `Metadata rilis v${finalVersion} (${app.name}) berhasil disinkronkan ke Supabase! (Tag: ${finalTag || 'verified'}, File: ${finalFileName || 'installer.exe'})`,
      updatedApp,
      discoveredData: discoveredInfo,
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

    // Validasi ketat: pastikan binary asset terverifikasi dan download URL valid HTTPS
    if (!ghData.downloadUrl || !ghData.downloadUrl.startsWith('https://')) {
      const errorMsg = 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.';
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: 0,
        currentStepMessage: 'Verifikasi asset gagal.',
        error: errorMsg,
      });
      return {
        success: false,
        stage: 'github_failed',
        message: errorMsg,
        error: errorMsg,
      };
    }

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
