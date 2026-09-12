/**
 * ALCO Hub - Updates View
 * Mengelola pembaruan aplikasi ekosistem ALCO.
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
} from 'lucide-react';
import {
  EcosystemApp,
  AppLocalInstallation,
  AppInstallProgress,
} from '../types';
import { AppIcon } from './AppIcon';
import { isAppUpdateAvailable, normalizeVersion, evaluateAppStatus } from '../utils/versioning';

interface UpdatesViewProps {
  apps: EcosystemApp[];
  localInstallations?: Record<string, AppLocalInstallation>;
  installProgressMap?: Record<string, AppInstallProgress>;
  isCheckingUpdates?: boolean;
  onCheckUpdate: () => void;
  onPerformUpdate: (app: EcosystemApp) => void;
  onInstallApp?: (app: EcosystemApp) => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  apps,
  localInstallations = {},
  installProgressMap = {},
  isCheckingUpdates = false,
  onCheckUpdate,
  onPerformUpdate,
  onInstallApp,
}) => {
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [updatedNotice, setUpdatedNotice] = useState<string | null>(null);

  const appsWithUpdates = apps.filter((app) => {
    const canonicalId = app.appId || app.id;
    const inst = localInstallations[canonicalId] || localInstallations[app.id];
    return isAppUpdateAvailable(app, inst);
  });

  const handleUpdate = (app: EcosystemApp) => {
    if (onInstallApp && app.downloadUrl && app.sha256) {
      onInstallApp(app);
      return;
    }

    setUpdatingAppId(app.id);
    setTimeout(() => {
      onPerformUpdate(app);
      setUpdatingAppId(null);
      setUpdatedNotice(`Aplikasi ${app.name} berhasil diperbarui ke versi v${app.latestVersion}.`);
      setTimeout(() => setUpdatedNotice(null), 4000);
    }, 1200);
  };

  return (
    <div id="alco-updates-view" className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Software Updates
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Pusat pembaruan otomatis untuk seluruh aplikasi resmi Aladzan Corpora.
          </p>
        </div>

        <button
          id="manual-check-all-updates-btn"
          type="button"
          onClick={onCheckUpdate}
          disabled={isCheckingUpdates}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
          <span>{isCheckingUpdates ? 'Memeriksa Server...' : 'Periksa Update'}</span>
        </button>
      </div>

      {updatedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{updatedNotice}</span>
        </div>
      )}

      {/* List of Pending Updates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pembaruan Tersedia ({appsWithUpdates.length})
          </h2>
        </div>

        {appsWithUpdates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {appsWithUpdates.map((app) => {
              const appId = app.appId || app.id;
              const isUpdating = updatingAppId === app.id;
              const progress = installProgressMap[appId] || installProgressMap[app.id];
              const isDownloading = progress?.status === 'downloading';
              const isVerifying = progress?.status === 'verifying';
              const isInstallerReady = progress?.status === 'installer-ready';
              const isClosingApp = progress?.status === 'closing-app' || progress?.status === 'app-running';
              const isLaunching = progress?.status === 'launching-installer';
              const isOpened = progress?.status === 'installer-opened';
              const isFailed = progress?.status === 'failed' || progress?.status === 'installation-failed';
              const isBusy = isDownloading || isVerifying || isInstallerReady || isClosingApp || isLaunching;

              return (
                <div
                  key={app.id}
                  id={`update-card-${app.id}`}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 shadow-sm dark:shadow-xl dark:shadow-amber-500/5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden text-indigo-600 dark:text-indigo-400 mt-0.5">
                        <AppIcon
                          iconUrl={app.iconUrl}
                          iconName={app.iconName}
                          name={app.name}
                          iconClassName="w-5 h-5"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{app.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                            Update Available
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{app.functionLabel}</p>
                        <p className="text-xs font-mono text-slate-700 dark:text-slate-300 pt-1">
                          Versi Saat Ini: <span className="text-slate-500 dark:text-slate-400 font-semibold">v{localInstallations[appId]?.version ? normalizeVersion(localInstallations[appId].version!) : normalizeVersion(app.version)}</span> → Versi Baru: <span className="text-emerald-600 dark:text-emerald-400 font-bold">v{normalizeVersion(app.latestVersion)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isBusy ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-wait"
                        >
                          <RotateCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                          <span>
                            {isDownloading
                              ? `Mengunduh (${progress?.progress || 0}%)...`
                              : isVerifying
                                ? 'Memverifikasi Checksum...'
                                : isClosingApp
                                  ? 'Menutup Aplikasi Lama...'
                                  : 'Membuka Setup...'}
                          </span>
                        </button>
                      ) : isOpened ? (
                        <button
                          type="button"
                          onClick={() => onCheckUpdate()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold tracking-tight transition-all shadow-md cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Cek Status Instalasi</span>
                        </button>
                      ) : isFailed ? (
                        <button
                          type="button"
                          onClick={() => handleUpdate(app)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-tight transition-all shadow-md cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Pasang Ulang (Cache)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdate(app)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-tight transition-all shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Update Sekarang</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Progress Notice */}
                  {isDownloading && (
                    <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 space-y-1.5 text-xs text-cyan-800 dark:text-cyan-200">
                      <div className="flex justify-between font-semibold">
                        <span>Mengunduh update dari GitHub Releases...</span>
                        <span className="font-mono">{progress?.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full transition-all duration-150" style={{ width: `${progress?.progress || 0}%` }} />
                      </div>
                    </div>
                  )}

                  {isClosingApp && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                      <span>Menutup proses {app.name} yang sedang aktif agar file binary dapat diperbarui...</span>
                    </div>
                  )}

                  {isFailed && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-800 dark:text-rose-200">
                      <p className="font-bold">Update Belum Tuntas: {progress?.error || 'Instalasi dibatalkan atau terkendala.'}</p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">
                        File installer tersimpan di cache lokal. Anda dapat mengklik "Pasang Ulang (Cache)" untuk menjalankan ulang setup.
                      </p>
                    </div>
                  )}

                  {app.releaseNotes && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-800 dark:text-slate-300 block">Catatan Rilis (Changelog):</span>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{app.releaseNotes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Semua Aplikasi Sudah Menggunakan Versi Terbaru</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tidak ada pembaruan baru yang tertunda. ALCO Hub akan memberi tahu Anda secara otomatis saat owner merilis versi baru.
            </p>
          </div>
        )}
      </div>

      {/* Version Registry Table */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Applications Inventory ({apps.length})
        </h3>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800/80">
          {apps.map((app) => {
            const canonicalId = app.appId || app.id;
            const inst = localInstallations[canonicalId] || localInstallations[app.id];
            const evalRes = evaluateAppStatus(app, inst);
            return (
              <div key={app.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{app.name}</span>
                  <span className="text-slate-500 text-[11px] block">{app.functionLabel}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                    v{evalRes.installedVersion || normalizeVersion(app.version)}
                  </span>
                  <span
                    className={`text-[10px] block font-medium ${
                      evalRes.status === 'UPDATE_AVAILABLE'
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : evalRes.status === 'NOT_INSTALLED'
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    }`}
                  >
                    {evalRes.badgeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
