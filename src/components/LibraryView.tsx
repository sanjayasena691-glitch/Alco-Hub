/**
 * ALCO Hub - User Library (Installed Desktop Apps)
 * Menampilkan aplikasi ALCO yang sudah terpasang di komputer ini dan siap dijalankan.
 */

import React from 'react';
import {
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import {
  EcosystemApp,
  AppLocalInstallation,
  AppInstallProgress,
} from '../types';
import { ApplicationCard } from './ApplicationCard';

interface LibraryViewProps {
  apps: EcosystemApp[];
  localInstallations?: Record<string, AppLocalInstallation>;
  installProgressMap?: Record<string, AppInstallProgress>;
  onOpenApp: (app: EcosystemApp) => void;
  onInstallApp?: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  onCheckInstalled?: (appId: string) => Promise<boolean> | void;
  onGoToStore: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  apps,
  localInstallations = {},
  installProgressMap = {},
  onOpenApp,
  onInstallApp,
  onUpdateApp,
  onCheckInstalled,
  onGoToStore,
}) => {
  const installedApps = apps.filter((app) => {
    const canonicalId = app.appId || app.id;
    return localInstallations[canonicalId]?.isInstalled || localInstallations[app.id]?.isInstalled;
  });

  return (
    <div id="alco-library-view" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            My Desktop Apps
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar seluruh aplikasi ALCO yang terpasang di komputer ini dan siap dijalankan.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToStore}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Jelajahi App Store</span>
        </button>
      </div>

      {installedApps.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplikasi Terpasang ({installedApps.length})</span>
          </div>

          <div id="library-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {installedApps.map((app) => {
              const canonicalId = app.appId || app.id;
              return (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  installation={localInstallations[canonicalId] || localInstallations[app.id]}
                  installProgress={installProgressMap[canonicalId] || installProgressMap[app.id]}
                  onOpenApp={onOpenApp}
                  onInstallApp={onInstallApp}
                  onUpdateApp={onUpdateApp}
                  onCheckInstalled={onCheckInstalled}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 space-y-4 max-w-lg mx-auto">
          <HardDrive className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-200">Belum Ada Aplikasi Terpasang</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Jelajahi App Store untuk mengunduh dan memasang aplikasi ALCO seperti Content Engine, Creative System, dan lainnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToStore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <span>Buka App Store</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
