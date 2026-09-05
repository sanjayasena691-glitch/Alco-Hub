/**
 * ALCO Hub - Packs Directory & Pack Detail Inspector
 * Menampilkan katalog pack produk beserta status alat (INSTALLED, OWNED, NOT OWNED, COMING SOON).
 */

import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Layout,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { EcosystemPack, EcosystemApp, ContentEngineUpdateResult, ContentEngineUpdateStatus } from '../types';
import { FUTURE_PACK_CATEGORIES } from '../config/ecosystemPacks';
import { ApplicationCard } from './ApplicationCard';

interface PacksViewProps {
  packs: EcosystemPack[];
  apps: EcosystemApp[];
  onOpenApp: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
}

export const PacksView: React.FC<PacksViewProps> = ({
  packs,
  apps,
  onOpenApp,
  onUpdateApp,
  updateResult,
  updateStatus,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const selectedPackApps = selectedPack ? apps.filter((a) => a.packId === selectedPack.id) : [];

  return (
    <div id="alco-packs-view" className="space-y-8">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Product Packs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Kumpulan aplikasi terintegrasi yang dikelompokkan sesuai tahapan pertumbuhan dan skala bisnis.
        </p>
      </div>

      {/* Active Packs Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Ecosystem Packs ({packs.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packs.map((pack) => {
            const packApps = apps.filter((a) => a.packId === pack.id);
            return (
              <div
                key={pack.id}
                id={`pack-overview-card-${pack.id}`}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between space-y-6 transition-all shadow-xl shadow-black/20"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                      {pack.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {pack.toolCount} Applications
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {pack.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">
                      {pack.tagline}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  {/* App Chips inside this pack */}
                  <div className="pt-2 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Included Modules
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {packApps.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                app.comingSoon ? 'bg-slate-600' : 'bg-emerald-400'
                              }`}
                            />
                            <span className="font-semibold text-slate-200 truncate">
                              {app.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {app.comingSoon ? 'Coming Soon' : 'Installed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <button
                    id={`open-pack-detail-btn-${pack.id}`}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-tight transition-all"
                  >
                    <span>View Pack Details</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Future Product Packs (Scalability Architecture) */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Roadmap & Future Packs Architecture
          </h2>
          <span className="text-[11px] text-slate-500">Ecosystem Scalability</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUTURE_PACK_CATEGORIES.map((fp) => (
            <div
              key={fp.id}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-2 opacity-75"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Future Suite
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                  Coming Soon
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-300">{fp.name}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{fp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pack Detail Drawer/Modal */}
      {selectedPack && (
        <div
          id="pack-detail-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            id="pack-detail-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            <button
              id="close-pack-detail-modal"
              type="button"
              onClick={() => setSelectedPackId(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-2 pr-8">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                {selectedPack.category}
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {selectedPack.name}
              </h2>
              <p className="text-sm font-medium text-slate-300">
                {selectedPack.tagline}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {selectedPack.description}
              </p>
            </div>

            {/* Applications List */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Applications in this Pack ({selectedPackApps.length})
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {selectedPackApps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onOpenApp={(a) => {
                      setSelectedPackId(null);
                      onOpenApp(a);
                    }}
                    onUpdateApp={(a) => {
                      setSelectedPackId(null);
                      onUpdateApp(a);
                    }}
                    updateResult={updateResult}
                    updateStatus={updateStatus}
                    featured
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPackId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
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
