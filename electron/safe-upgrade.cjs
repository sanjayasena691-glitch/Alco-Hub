// All operating-system effects are injected so failures can be tested without running installers.
const crypto = require('crypto');
const path = require('path').win32;
const APP_ID = 'com.alco.contentengine';
function builderGuid(id) {
  const ns = Buffer.from('50e065bc313411e69bab38c9862bdaf3', 'hex');
  const bytes = crypto.createHash('sha1').update(ns).update(id).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const identity = Object.freeze({ catalogId: 'alco-content-engine', appId: APP_ID,
  guid: builderGuid(APP_ID), name: 'ALCO Content Engine', exe: 'ALCO Content Engine.exe' });
const { parseVersion, compareVersions } = require('./upgrade-version.cjs');
const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();
function safeDirectory(p) {
  return typeof p === 'string' && /^[A-Za-z]:\\/.test(p) && !/["\r\n\x00]/.test(p)
    && !p.split(/[\\/]/).some(s => ['..', '.', 'dist-electron', 'win-unpacked'].includes(s.toLowerCase()))
    && path.parse(p).root !== p;
}
function discover(entries, fallback, exists) {
  const base = { isInstalled: false, version: null, executablePath: null };
  // A matching key with conflicting fields is an obstruction, never a reason to try another path.
  const matches = entries.filter(e => e.key.toLowerCase() === identity.guid || e.key.toLowerCase() === identity.appId
    || e.name === identity.name || (typeof e.name === 'string' && e.name.startsWith(identity.name + ' ')));
  if (matches.length > 1) return { ...base, discoveryStatus: 'MULTIPLE_INSTALLATIONS', error: 'Beberapa instalasi ditemukan. Pilih dan rapikan instalasi secara manual.' };
  if (matches.length) {
    const e = matches[0];
    const executablePath = safeDirectory(e.location) ? path.join(e.location, identity.exe) : null;
    if (e.key.toLowerCase() !== identity.guid || ![identity.name, identity.name + ' ' + e.version].includes(e.name) || !executablePath || !exists(executablePath)
      || !samePath(e.installLocation, e.location) || !['user', 'machine'].includes(e.scope)) {
      return { ...base, discoveryStatus: 'UNSUPPORTED_INSTALLATION', error: 'Identitas/lokasi registry tidak konsisten. Periksa instalasi Windows secara manual.' };
    }
    return { isInstalled: true, version: parseVersion(e.version) && compareVersions(e.version, e.executableVersion) === 0 ? e.version : null, executablePath,
      discoveryStatus: parseVersion(e.version) && compareVersions(e.version, e.executableVersion) === 0 ? 'INSTALLED_KNOWN_VERSION' : 'INSTALLED_UNKNOWN_VERSION',
      directory: e.location, scope: e.scope, registryKey: e.key, registryView: e.view, source: 'registry', appId: identity.appId };
  }
  const candidates = [...new Set(fallback.filter(p => safeDirectory(path.dirname(p)) && path.basename(p) === identity.exe && exists(p)).map(p => path.normalize(p).toLowerCase()))];
  if (candidates.length) return { ...base, isInstalled: true, executablePath: candidates.length === 1 ? candidates[0] : null,
    discoveryStatus: candidates.length > 1 ? 'MULTIPLE_INSTALLATIONS' : 'UNSUPPORTED_INSTALLATION',
    error: 'Executable ditemukan tanpa identitas registry NSIS. Perbaiki instalasi secara manual.' };
  return { ...base, discoveryStatus: 'NOT_INSTALLED' };
}
function assertUpgradeable(before, target) {
  if (before.discoveryStatus !== 'INSTALLED_KNOWN_VERSION') throw new Error(before.error || 'Upgrade memerlukan instalasi registry dengan versi dan lokasi yang diketahui.');
  const cmp = compareVersions(target, before.version);
  if (cmp === null) throw new Error('Versi rilis tidak valid.');
  if (cmp <= 0) throw new Error(cmp === 0 ? 'Versi terpasang sudah terbaru.' : 'Downgrade otomatis ditolak.');
}
function validateReleaseUrl(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && !u.port
    && u.hostname === 'github.com' && /^\/yaladzan92-creator\/Alco-Releases\/releases\/download\/[^/]+\/[^/]+\.exe$/i.test(u.pathname); } catch { return false; }
}
function createUpgradeRunner(io) {
  const active = new Set();
  return async function run(params, emit = () => {}) {
    const id = params.appId === 'content-engine' ? identity.catalogId : params.appId;
    if (active.has(id)) return { success: false, error: 'Upgrade aplikasi sedang berjalan.' };
    active.add(id);
    let releaseLock;
    const status = (s, detail) => emit(s, detail);
    try {
      if (id !== identity.catalogId) throw new Error('Silent upgrade belum didukung untuk aplikasi ini.');
      if (io.acquire) releaseLock = await io.acquire();
      if (!parseVersion(params.latestVersion) || !/^[a-f0-9]{64}$/i.test(params.sha256 || '') || !validateReleaseUrl(params.downloadUrl)) throw new Error('Metadata installer resmi tidak valid.');
      const before = await io.discover();
      assertUpgradeable(before, params.latestVersion);
      status('UPDATE_AVAILABLE');
      status('DOWNLOADING');
      const artifact = await io.prepare(params, status);
      status('VERIFYING');
      if (!(await io.verify(artifact, params.sha256))) throw new Error('SHA-256 installer tidak cocok.');
      // Approval is bound to the exact bytes, never supplied by the renderer or publisher.
      if (!io.supports(params.sha256, params.latestVersion, before.scope)) throw new Error(before.scope === 'machine'
        ? 'Silent upgrade per-machine belum didukung dengan koordinasi lintas pengguna Windows. Gunakan installer resmi secara manual.'
        : 'Perilaku installer NSIS rilis ini belum disetujui. Validasi profil rilis untuk pengujian Windows terlebih dahulu.');
      if (await io.running()) {
        status('AWAITING_USER_CONFIRMATION');
        if (!(await io.confirm())) throw new Error('Pengguna membatalkan penutupan aplikasi.');
        status('CLOSING_APPLICATION');
        await io.close();
      }
      if (await io.running()) throw new Error('Aplikasi masih berjalan. Simpan pekerjaan dan tutup aplikasi secara manual, lalu coba lagi.');
      const current = await io.discover();
      if (!sameInstallation(before, current) || compareVersions(before.version, current.version) !== 0) throw new Error('Instalasi berubah selama persiapan. Coba lagi.');
      if (!(await io.verify(artifact, params.sha256))) throw new Error('Installer cache berubah setelah verifikasi.');
      status('INSTALLING');
      // The reviewed builder template reads Software/<GUID>/InstallLocation in this exact scope.
      // Avoid /D: Windows argument quoting can otherwise change custom paths containing spaces.
      const code = await io.install(artifact, ['/S', before.scope === 'user' ? '/currentuser' : '/allusers']);
      if (code !== 0) throw new Error(`Installer gagal atau dibatalkan (exit ${code}).`);
      status('VERIFYING_INSTALLATION');
      const after = await io.discover();
      if (!sameInstallation(before, after) || after.version.trim().replace(/^v/, '') !== params.latestVersion.trim().replace(/^v/, '')) throw new Error('Verifikasi gagal: identitas, lokasi, scope, executable, atau versi terpasang tidak sesuai target.');
      status('UPDATE_SUCCESS');
      return { success: true, installed: true, version: after.version, executablePath: after.executablePath };
    } catch (error) {
      status('UPDATE_FAILED');
      return { success: false, error: error.message };
    } finally {
      try { if (releaseLock) releaseLock(); }
      finally { active.delete(id); }
    }
  };
}
function sameInstallation(a, b) {
  return b.discoveryStatus === 'INSTALLED_KNOWN_VERSION' && a.appId === b.appId && a.registryKey === b.registryKey
    && a.registryView === b.registryView && a.scope === b.scope && samePath(a.executablePath, b.executablePath) && samePath(a.directory, b.directory);
}
module.exports = { identity, builderGuid, parseVersion, compareVersions, discover, safeDirectory, assertUpgradeable, validateReleaseUrl, createUpgradeRunner };
