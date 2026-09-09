/**
 * ALCO Hub - Packs Directory & Pack Detail Inspector
 * Menampilkan katalog pack produk beserta status alat (INSTALLED, FREE, LICENSED, COMING SOON).
 */

import React, { useState } from 'react';
import {
  Layers,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  EcosystemPack,
  EcosystemApp,
  AppLocalInstallation,
  AppInstallProgress,
} from '../types';
import { FUTURE_PACK_CATEGORIES } from '../config/ecosystemPacks';
import { ApplicationCard } from './ApplicationCard';

interface PacksViewProps {
  packs: EcosystemPack[];
  apps: EcosystemApp[];
  localInstallations?: Record<string, AppLocalInstallation>;
  installProgressMap?: Record<string, AppInstallProgress>;
  onOpenApp: (app: EcosystemApp) => void;
  onInstallApp?: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
}

export const PacksView: React.FC<PacksViewProps> = ({
  packs,
  apps,
  localInstallations = {},
  installProgressMap = {},
  onOpenApp,
  onInstallApp,
  onUpdateApp,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const activePacks = packs.filter((pack) => pack.status === 'active');
  const comingSoonPacks = packs.filter((pack) => pack.status === 'coming-soon');

  // Filter static future categories so we do not duplicate packs created by Founder in Supabase
  const dynamicPackIds = new Set(packs.map((p) => p.id));
  const dynamicPackNames = new Set(packs.map((p) => p.name.trim().toLowerCase()));
  const uncreatedFutureCategories = FUTURE_PACK_CATEGORIES.filter(
    (fp) => !dynamicPackIds.has(fp.id) && !dynamicPackNames.has(fp.name.trim().toLowerCase())
  );

  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const selectedPackApps = selectedPack ? apps.filter((a) => a.packId === selectedPack.id) : [];

  return (
    <div id="alco-packs-view" className="space-y-8">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Product Packs
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Kumpulan aplikasi terintegrasi yang dikelompokkan sesuai tahapan pertumbuhan dan skala bisnis.
        </p>
      </div>

      {/* Active Packs Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Active Ecosystem Packs ({activePacks.length})
        </h2>

        {activePacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePacks.map((pack) => {
              const packApps = apps.filter((a) => a.packId === pack.id);
              return (
                <div
                  key={pack.id}
                  id={`pack-overview-card-${pack.id}`}
                  className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-6 flex flex-col justify-between space-y-6 transition-all shadow-sm dark:shadow-xl dark:shadow-black/20"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {pack.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                        {packApps.length || pack.toolCount} Applications
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {pack.name}
                      </h3>
                      {pack.tagline && (
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                          {pack.tagline}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                        {pack.description}
                      </p>
                    </div>

                    {/* App Chips inside this pack */}
                    <div className="pt-2 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Included Modules
                      </span>
                      {packApps.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {packApps.map((app) => {
                            const canonicalId = app.appId || app.id;
                            const isInstalled = Boolean(
                              localInstallations[canonicalId]?.isInstalled ||
                                localInstallations[app.id]?.isInstalled
                            );
                            return (
                              <div
                                key={app.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      app.comingSoon
                                        ? 'bg-slate-400 dark:bg-slate-600'
                                        : isInstalled
                                          ? 'bg-emerald-500 dark:bg-emerald-400'
                                          : 'bg-indigo-500 dark:bg-indigo-400'
                                    }`}
                                  />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {app.name}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                                  {app.comingSoon
                                    ? 'Coming Soon'
                                    : isInstalled
                                      ? 'Installed'
                                      : app.pricingType === 'free'
                                        ? 'Free'
                                        : app.priceLabel || 'Commercial'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Belum ada aplikasi yang terhubung.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      id={`open-pack-detail-btn-${pack.id}`}
                      type="button"
                      onClick={() => setSelectedPackId(pack.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold tracking-tight transition-all"
                    >
                      <span>View Pack Details</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Active Product Pack</p>
            <p className="text-xs text-slate-500">Aktifkan pack melalui Owner Portal untuk menampilkannya di sini.</p>
          </div>
        )}
      </div>

      {/* Coming Soon Packs & Future Roadmap */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coming Soon Packs ({comingSoonPacks.length + uncreatedFutureCategories.length})
          </h2>
          <span className="text-[11px] text-slate-500">Ecosystem Scalability</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Dynamic Coming Soon Packs Created by Founder in Supabase */}
          {comingSoonPacks.map((pack) => {
            const packApps = apps.filter((a) => a.packId === pack.id);
            return (
              <div
                key={pack.id}
                id={`coming-soon-pack-${pack.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 space-y-3 transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      {pack.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                      Coming Soon
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{pack.name}</h4>
                  {pack.tagline && (
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{pack.tagline}</p>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{pack.description}</p>

                  {packApps.length > 0 && (
                    <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>{packApps.length} Aplikasi Terjadwal</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
                  >
                    <span>Lihat Detail Modul</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* 2. Conceptual Future Suite Categories */}
          {uncreatedFutureCategories.map((fp) => (
            <div
              key={fp.id}
              className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 space-y-2 opacity-80 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Future Suite
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                    Coming Soon
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">{fp.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{fp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pack Detail Drawer/Modal */}
      {selectedPack && (
        <div
          id="pack-detail-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            id="pack-detail-modal"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            <button
              id="close-pack-detail-modal"
              type="button"
              onClick={() => setSelectedPackId(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-2 pr-8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {selectedPack.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedPack.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'
                  }`}
                >
                  {selectedPack.status === 'active' ? 'Active Pack' : 'Coming Soon'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {selectedPack.name}
              </h2>
              {selectedPack.tagline && (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedPack.tagline}
                </p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                {selectedPack.description}
              </p>
            </div>

            {/* Applications List */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Applications in this Pack ({selectedPackApps.length})
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {selectedPackApps.map((app) => {
                  const canonicalId = app.appId || app.id;
                  return (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      installation={localInstallations[canonicalId] || localInstallations[app.id]}
                      installProgress={installProgressMap[canonicalId] || installProgressMap[app.id]}
                      onOpenApp={(a) => {
                        setSelectedPackId(null);
                        onOpenApp(a);
                      }}
                      onInstallApp={(a) => {
                        setSelectedPackId(null);
                        onInstallApp && onInstallApp(a);
                      }}
                      onUpdateApp={(a) => {
                        setSelectedPackId(null);
                        onUpdateApp(a);
                      }}
                      featured
                    />
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPackId(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
