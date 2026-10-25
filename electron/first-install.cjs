const { parseVersion, validateReleaseUrl } = require('./safe-upgrade.cjs');

// Interactive first installation is a separate operation, never a fallback for a blocked upgrade.
function createFirstInstallRunner(io) {
  return async (params, emit = () => {}) => {
    let release;
    try {
      if (params.operation !== 'install') throw new Error('Operasi instalasi pertama harus dipilih secara eksplisit.');
      if (typeof params.appId !== 'string' || !/^(?:alco-)?[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.appId)) throw new Error('App ID tidak valid.');
      if (!parseVersion(params.latestVersion) || !/^[a-f0-9]{64}$/i.test(params.sha256 || '') || !validateReleaseUrl(params.downloadUrl)) {
        throw new Error('Metadata installer resmi tidak valid.');
      }
      release = await io.acquire(params);
      const absent = async () => {
        const state = await io.discover(params);
        if (state.isInstalled || state.discoveryStatus !== 'NOT_INSTALLED') {
          throw new Error(state.error || 'Instalasi sudah ada atau belum dapat dipastikan. Gunakan operasi Update untuk aplikasi terpasang.');
        }
        if (await io.running(params)) throw new Error('Aplikasi sedang aktif. Tutup secara manual sebelum instalasi pertama.');
      };
      await absent();
      emit('DOWNLOADING');
      const file = await io.prepare(params, emit);
      emit('VERIFYING');
      if (!(await io.verify(file, params.sha256))) throw new Error('SHA-256 installer tidak cocok.');
      await absent(); // Prevent changing intent if an installation appeared during download.
      emit('INSTALLING');
      const exit = await io.install(file, []); // Interactive, no /S and no forced scope/directory.
      if (exit !== 0) throw new Error('Installer gagal atau dibatalkan (exit ' + exit + ').');
      emit('VERIFYING_INSTALLATION');
      const installed = await io.discover(params);
      if (installed.discoveryStatus !== 'INSTALLED_KNOWN_VERSION' || !installed.isInstalled || !installed.executablePath
        || installed.version?.trim().replace(/^v/, '') !== params.latestVersion.trim().replace(/^v/, '')) {
        throw new Error('Instalasi belum terverifikasi: identitas, executable atau versi target belum ditemukan. Periksa wizard Windows dan coba pemeriksaan lagi.');
      }
      emit('INSTALL_SUCCESS');
      return { success: true, installed: true, version: installed.version, executablePath: installed.executablePath };
    } catch (error) {
      emit('INSTALL_FAILED', { error: error.message });
      return { success: false, error: error.message };
    } finally { if (release) release(); }
  };
}
module.exports = { createFirstInstallRunner };
