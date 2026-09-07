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
