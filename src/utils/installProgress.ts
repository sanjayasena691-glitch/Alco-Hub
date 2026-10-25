// Both screens consume the same state projection. Only main's verified terminal events mean success.
export function getInstallProgressState(progress?: { status: string; message?: string; error?: string }) {
  const status = progress?.status;
  const downloading = status === 'DOWNLOADING' || status === 'downloading';
  const verifying = ['VERIFYING', 'VERIFYING_INSTALLATION', 'verifying'].includes(status || '');
  const closing = ['CLOSING_APPLICATION', 'closing-app', 'app-running'].includes(status || '');
  const installing = ['INSTALLING', 'installing', 'launching-installer'].includes(status || '');
  const awaiting = status === 'AWAITING_USER_CONFIRMATION';
  const ready = status === 'installer-ready';
  const opened = status === 'installer-opened';
  const waiting = status === 'waiting-completion';
  const failed = ['INSTALL_FAILED', 'UPDATE_FAILED', 'failed', 'installation-failed'].includes(status || '');
  const success = status === 'UPDATE_SUCCESS' || status === 'INSTALL_SUCCESS';
  const labels: Record<string, string> = {
    UPDATE_AVAILABLE: 'Menyiapkan update', DOWNLOADING: 'Mengunduh installer', VERIFYING: 'Memverifikasi SHA-256',
    AWAITING_USER_CONFIRMATION: 'Menunggu persetujuan penutupan', CLOSING_APPLICATION: 'Menunggu aplikasi ditutup',
    INSTALLING: 'Menunggu installer selesai', VERIFYING_INSTALLATION: 'Memverifikasi versi terpasang',
    UPDATE_SUCCESS: 'Update berhasil diverifikasi', INSTALL_SUCCESS: 'Instalasi berhasil diverifikasi',
    UPDATE_FAILED: 'Update gagal', INSTALL_FAILED: 'Instalasi gagal',
  };
  return { downloading, verifying, closing, installing, awaiting, ready, opened, waiting, failed, success,
    busy: downloading || verifying || closing || installing || awaiting || ready || status === 'UPDATE_AVAILABLE',
    label: progress?.message || labels[status || ''] || 'Memproses instalasi',
  };
}
