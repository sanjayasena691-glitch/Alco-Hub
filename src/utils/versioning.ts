/**
 * ALCO Hub - Semantic Versioning & Tag Utilities
 * Standarisasi sanitasi App ID, format tag GitHub Releases, dan manajemen versi otomatis.
 */

/**
 * Sanitasi string menjadi format App ID resmi ALCO (kebab-case aman)
 * Contoh: "ALCO Content Engine" -> "alco-content-engine"
 * Contoh: "ALCO Meta Ads Analyst" -> "alco-meta-ads-analyst"
 */
export function sanitizeAppId(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Ganti karakter non-alphanumeric dengan dash
    .replace(/^-+|-+$/g, '') // Hapus dash di awal dan akhir
    .replace(/-+/g, '-'); // Gabungkan dash ganda
}

/**
 * Normalisasi string nomor versi menjadi standar semver bersih (tanpa awalan 'v' atau spasi)
 * Contoh: " v0.1.1 " -> "0.1.1"
 */
export function normalizeVersion(ver: string): string {
  if (!ver) return '0.1.0';
  const cleaned = ver.trim().replace(/^v/i, '').trim();
  // Hanya simpan angka dan titik
  const sanitized = cleaned.replace(/[^0-9.]/g, '');
  return sanitized || '0.1.0';
}

/**
 * Format tag GitHub Releases resmi: {sanitized-app-id}-v{normalized-version}
 * Contoh: alco-content-engine-v0.1.1
 */
export function generateGitHubTag(appId: string, version: string): string {
  const cleanAppId = sanitizeAppId(appId) || 'alco-app';
  const cleanVersion = normalizeVersion(version);
  return `${cleanAppId}-v${cleanVersion}`;
}

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * Parse nomor versi semver
 */
export function parseSemver(ver: string): ParsedSemver | null {
  const clean = normalizeVersion(ver);
  const parts = clean.split('.');
  if (parts.length < 2) return null;

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parts.length >= 3 ? parseInt(parts[2], 10) : 0;

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;

  return { major, minor, patch, raw: clean };
}

/**
 * Otomatis menambah versi Patch (+0.0.1) untuk perbaikan kecil / bug fixes
 * Contoh: 0.1.0 -> 0.1.1
 */
export function bumpPatch(currentVer: string): string {
  const parsed = parseSemver(currentVer);
  if (!parsed) return '0.1.1';
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

/**
 * Otomatis menambah versi Minor (+0.1.0) untuk fitur baru
 * Contoh: 0.1.1 -> 0.2.0
 */
export function bumpMinor(currentVer: string): string {
  const parsed = parseSemver(currentVer);
  if (!parsed) return '0.2.0';
  return `${parsed.major}.${parsed.minor + 1}.0`;
}

/**
 * Otomatis menambah versi Major (+1.0.0) untuk rilis besar / stabil
 * Contoh: 0.1.1 -> 1.0.0
 */
export function bumpMajor(currentVer: string): string {
  const parsed = parseSemver(currentVer);
  if (!parsed) return '1.0.0';
  return `${parsed.major + 1}.0.0`;
}

/**
 * Membandingkan dua versi semver:
 * Return 1 jika v1 > v2
 * Return 0 jika v1 == v2
 * Return -1 jika v1 < v2
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (!p1 && !p2) return 0;
  if (!p1) return -1;
  if (!p2) return 1;

  if (p1.major > p2.major) return 1;
  if (p1.major < p2.major) return -1;

  if (p1.minor > p2.minor) return 1;
  if (p1.minor < p2.minor) return -1;

  if (p1.patch > p2.patch) return 1;
  if (p1.patch < p2.patch) return -1;

  return 0;
}

/**
 * Memberikan saran versi berikutnya berdasarkan versi saat ini.
 * Jika belum ada rilis atau '0.0.0' -> sarankan '0.1.0'.
 * Jika sudah ada versi (misal '0.1.0') -> sarankan patch bump ('0.1.1').
 */
export function suggestNextVersion(currentLatest?: string | null): string {
  if (!currentLatest || currentLatest === 'Belum ada release' || currentLatest === '0.0.0' || currentLatest === 'none') {
    return '0.1.0';
  }
  return bumpPatch(currentLatest);
}

export type UnifiedAppStatus =
  | 'NOT_INSTALLED'
  | 'INSTALLING'
  | 'WAITING_COMPLETION'
  | 'INSTALLED_UNKNOWN_VERSION'
  | 'UP_TO_DATE'
  | 'LOCAL_VERSION_NEWER'
  | 'UPDATE_AVAILABLE';

export interface AppStatusEvaluation {
  status: UnifiedAppStatus;
  isInstalled: boolean;
  installedVersion: string | null;
  latestVersion: string | null;
  hasUpdate: boolean;
  canLaunch: boolean;
  canInstall: boolean;
  canUpdate: boolean;
  badgeLabel: string;
  badgeType: 'success' | 'warning' | 'info' | 'neutral' | 'busy';
  description: string;
}

/**
 * Single source of truth untuk evaluasi status aplikasi di ALCO Hub.
 * Menggabungkan metadata Supabase, deteksi binary lokal Electron, dan live installer progress.
 */
export function evaluateAppStatus(
  app: { latestVersion?: string; version?: string; downloadUrl?: string; sha256?: string },
  installation?: { isInstalled: boolean; version?: string | null; executablePath?: string | null },
  progress?: { status: string; message?: string }
): AppStatusEvaluation {
  const isInstalled = Boolean(installation?.isInstalled);
  const installedVersion = installation?.version ? normalizeVersion(installation.version) : null;
  const latestVersion = app?.latestVersion ? normalizeVersion(app.latestVersion) : null;

  // 1. In-flight installation / update progress states
  if (progress) {
    if (progress.status === 'waiting-completion' || progress.status === 'installer-opened') {
      return {
        status: 'WAITING_COMPLETION',
        isInstalled,
        installedVersion,
        latestVersion,
        hasUpdate: false,
        canLaunch: false,
        canInstall: false,
        canUpdate: false,
        badgeLabel: 'Setup Terbuka',
        badgeType: 'info',
        description: 'Setup installer sedang terbuka di Windows. Selesaikan wizard instalasi.',
      };
    }

    const isBusy = [
      'downloading',
      'verifying',
      'installer-ready',
      'app-running',
      'closing-app',
      'launching-installer',
    ].includes(progress.status);

    if (isBusy) {
      return {
        status: 'INSTALLING',
        isInstalled,
        installedVersion,
        latestVersion,
        hasUpdate: false,
        canLaunch: false,
        canInstall: false,
        canUpdate: false,
        badgeLabel: 'Memproses...',
        badgeType: 'busy',
        description: progress.message || 'Sedang mengunduh dan menyiapkan instalasi.',
      };
    }
  }

  // 2. Not Installed
  if (!isInstalled) {
    return {
      status: 'NOT_INSTALLED',
      isInstalled: false,
      installedVersion: null,
      latestVersion,
      hasUpdate: false,
      canLaunch: false,
      canInstall: Boolean(app?.downloadUrl && app?.sha256),
      canUpdate: false,
      badgeLabel: 'Belum Terpasang',
      badgeType: 'neutral',
      description: 'Aplikasi belum terpasang di sistem desktop lokal.',
    };
  }

  // 3. Installed, but Version is Unknown or Null
  if (!installedVersion || !latestVersion) {
    return {
      status: 'INSTALLED_UNKNOWN_VERSION',
      isInstalled: true,
      installedVersion,
      latestVersion,
      hasUpdate: false,
      canLaunch: true,
      canInstall: false,
      canUpdate: false,
      badgeLabel: installedVersion ? `v${installedVersion}` : 'Terpasang',
      badgeType: 'neutral',
      description: 'Aplikasi terpasang di sistem.',
    };
  }

  // 4. Compare Semver
  const cmp = compareSemver(installedVersion, latestVersion);

  if (cmp < 0) {
    // installedVersion < latestVersion -> UPDATE_AVAILABLE
    return {
      status: 'UPDATE_AVAILABLE',
      isInstalled: true,
      installedVersion,
      latestVersion,
      hasUpdate: true,
      canLaunch: true,
      canInstall: false,
      canUpdate: true,
      badgeLabel: `Update v${latestVersion}`,
      badgeType: 'warning',
      description: `Versi baru v${latestVersion} tersedia (versi saat ini: v${installedVersion}).`,
    };
  }

  if (cmp > 0) {
    // installedVersion > latestVersion -> LOCAL_VERSION_NEWER
    return {
      status: 'LOCAL_VERSION_NEWER',
      isInstalled: true,
      installedVersion,
      latestVersion,
      hasUpdate: false,
      canLaunch: true,
      canInstall: false,
      canUpdate: false,
      badgeLabel: `v${installedVersion} (Terbaru)`,
      badgeType: 'info',
      description: `Versi terpasang (v${installedVersion}) lebih baru dari katalog rilis resmi (v${latestVersion}).`,
    };
  }

  // cmp === 0 -> UP_TO_DATE
  return {
    status: 'UP_TO_DATE',
    isInstalled: true,
    installedVersion,
    latestVersion,
    hasUpdate: false,
    canLaunch: true,
    canInstall: false,
    canUpdate: false,
    badgeLabel: `v${installedVersion} (Up to date)`,
    badgeType: 'success',
    description: `Aplikasi telah menggunakan versi terbaru (v${installedVersion}).`,
  };
}

/**
 * Menentukan apakah aplikasi memiliki update resmi yang valid untuk diinstal.
 * Mengembalikan true HANYA jika installedVersion < latestVersion.
 */
export function isAppUpdateAvailable(
  app: { latestVersion?: string },
  installation?: { isInstalled: boolean; version?: string | null }
): boolean {
  if (!installation?.isInstalled || !installation.version || !app?.latestVersion) {
    return false;
  }
  const installedVer = normalizeVersion(installation.version);
  const latestVer = normalizeVersion(app.latestVersion);
  return compareSemver(installedVer, latestVer) < 0;
}
