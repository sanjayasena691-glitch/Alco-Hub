/**
 * ALCO Hub - User Library (Owned & Active Apps)
 * Menampilkan aplikasi yang sudah berlisensi aktif atau aplikasi gratis yang siap digunakan.
 */

import React from 'react';
import {
  Grid,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import {
  EcosystemApp,
  UserLicense,
  ContentEngineUpdateResult,
  ContentEngineUpdateStatus,
} from '../types';
import { isAppLicensed } from '../services/storeService';
import { ApplicationCard } from './ApplicationCard';

interface LibraryViewProps {
  apps: EcosystemApp[];
  userLicenses: Record<string, UserLicense>;
  onOpenApp: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  onRequestLicense: (app: EcosystemApp) => void;
  onGoToStore: () => void;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  apps,
  userLicenses,
  onOpenApp,
  onUpdateApp,
  onRequestLicense,
  onGoToStore,
  updateResult,
  updateStatus,
}) => {
  const ownedApps = apps.filter((app) => isAppLicensed(app, userLicenses));

  return (
    <div id="alco-library-view" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            My App Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar seluruh aplikasi ALCO yang sudah Anda miliki atau memiliki lisensi resmi aktif di perangkat ini.
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

      {ownedApps.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Aplikasi Siap Digunakan ({ownedApps.length})</span>
          </div>

          <div id="library-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ownedApps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                userLicenses={userLicenses}
                onOpenApp={onOpenApp}
                onUpdateApp={onUpdateApp}
                onRequestLicense={onRequestLicense}
                updateResult={updateResult}
                updateStatus={updateStatus}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 space-y-4 max-w-lg mx-auto">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-200">Belum Ada Aplikasi Terlisensi</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Jelajahi Private App Store untuk melihat aplikasi gratis atau aktivasi lisensi resmi untuk membuka alat produktivitas ALCO.
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
