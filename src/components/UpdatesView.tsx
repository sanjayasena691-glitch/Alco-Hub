/**
 * ALCO Hub - Updates View
 * Mengelola pembaruan aplikasi ekosistem dan memastikan lisensi pengguna tetap utuh setelah update.
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import {
  EcosystemApp,
  ContentEngineUpdateResult,
  ContentEngineUpdateStatus,
  UserLicense,
} from '../types';
import { isAppLicensed } from '../services/storeService';

interface UpdatesViewProps {
  apps: EcosystemApp[];
  userLicenses: Record<string, UserLicense>;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
  onCheckUpdate: () => void;
  onPerformUpdate: (app: EcosystemApp) => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  apps,
  userLicenses,
  updateResult,
  updateStatus,
  onCheckUpdate,
  onPerformUpdate,
}) => {
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [updatedNotice, setUpdatedNotice] = useState<string | null>(null);

  const appsWithUpdates = apps.filter(
    (app) => app.latestVersion !== app.version || (app.id === 'content-engine' && updateStatus === 'update-available')
  );

  const handleUpdate = (app: EcosystemApp) => {
    setUpdatingAppId(app.id);
    setTimeout(() => {
      onPerformUpdate(app);
      setUpdatingAppId(null);
      setUpdatedNotice(`Aplikasi ${app.name} berhasil diperbarui ke versi v${app.latestVersion}. Lisensi Anda tetap aktif.`);
      setTimeout(() => setUpdatedNotice(null), 4000);
    }, 1200);
  };

  return (
    <div id="alco-updates-view" className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Software Updates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pusat pembaruan otomatis untuk seluruh aplikasi resmi Aladzan Corpora.
          </p>
        </div>

        <button
          id="manual-check-all-updates-btn"
          type="button"
          onClick={onCheckUpdate}
          disabled={updateStatus === 'checking'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{updateStatus === 'checking' ? 'Memeriksa Server...' : 'Periksa Update'}</span>
        </button>
      </div>

      {/* Safety & Persistence Notice */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Jaminan Keamanan Lisensi ALCO</p>
          <p className="text-slate-300 leading-relaxed">
            Pembaruan versi aplikasi tidak akan pernah menghapus, mereset, atau mengubah status kepemilikan lisensi Anda. Seluruh kunci aktivasi tetap tersimpan aman.
          </p>
        </div>
      </div>

      {updatedNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{updatedNotice}</span>
        </div>
      )}

      {/* List of Pending Updates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pembaruan Tersedia ({appsWithUpdates.length})
          </h2>
        </div>

        {appsWithUpdates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {appsWithUpdates.map((app) => {
              const isUpdating = updatingAppId === app.id;
              const isLicensed = isAppLicensed(app, userLicenses);

              return (
                <div
                  key={app.id}
                  id={`update-card-${app.id}`}
                  className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl shadow-amber-500/5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{app.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Update Available
                        </span>
                        {isLicensed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Lisensi Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{app.functionLabel}</p>
                      <p className="text-xs font-mono text-slate-300 pt-1">
                        Versi Saat Ini: <span className="text-slate-400 font-semibold">v{app.version}</span> → Versi Baru: <span className="text-emerald-400 font-bold">v{app.latestVersion}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdate(app)}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-tight transition-all shadow-md disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin" />
                            <span>Memproses Update...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Update Sekarang</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {app.releaseNotes && (
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-300 block">Catatan Rilis (Changelog):</span>
                      <p className="text-slate-400 leading-relaxed">{app.releaseNotes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Semua Aplikasi Sudah Menggunakan Versi Terbaru</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada pembaruan baru yang tertunda. ALCO Hub akan memberi tahu Anda secara otomatis saat owner merilis versi baru.
            </p>
          </div>
        )}
      </div>

      {/* Version Registry Table */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Installed Applications Inventory ({apps.length})
        </h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
          {apps.map((app) => (
            <div key={app.id} className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">{app.name}</span>
                <span className="text-slate-500 text-[11px] block">{app.functionLabel}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-slate-300 font-semibold">v{app.version}</span>
                <span className="text-[10px] text-emerald-400 block font-medium">Up to date</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
