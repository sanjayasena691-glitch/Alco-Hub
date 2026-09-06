/**
 * ALCO Hub - Private App Store & Centralized Catalog (Apps View)
 * Menampilkan katalog lengkap aplikasi ALCO dengan filter kategori pack, model lisensi, dan pencarian.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShoppingBag,
  ShieldCheck,
  Lock,
  Clock,
  RefreshCw,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import {
  EcosystemApp,
  EcosystemPack,
  ContentEngineUpdateResult,
  ContentEngineUpdateStatus,
  UserLicense,
  SyncMeta,
} from '../types';
import { ApplicationCard } from './ApplicationCard';
import { isAppLicensed } from '../services/storeService';

interface AppsViewProps {
  apps: EcosystemApp[];
  packs: EcosystemPack[];
  userLicenses: Record<string, UserLicense>;
  syncMeta: SyncMeta;
  onOpenApp: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  onRequestLicense: (app: EcosystemApp) => void;
  onSyncCatalog: () => void;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
}

export const AppsView: React.FC<AppsViewProps> = ({
  apps,
  packs,
  userLicenses,
  syncMeta,
  onOpenApp,
  onUpdateApp,
  onRequestLicense,
  onSyncCatalog,
  updateResult,
  updateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>('all');
  const [selectedPricingFilter, setSelectedPricingFilter] = useState<string>('all');

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(query);
        const matchFunc = app.functionLabel.toLowerCase().includes(query);
        const matchDesc = app.description.toLowerCase().includes(query);
        if (!matchName && !matchFunc && !matchDesc) return false;
      }

      // 2. Pack Category Filter
      if (selectedPackFilter !== 'all' && app.packId !== selectedPackFilter) {
        return false;
      }

      // 3. Pricing / Ownership Filter
      if (selectedPricingFilter === 'free') {
        if (app.pricingType !== 'free') return false;
      } else if (selectedPricingFilter === 'licensed') {
        if (app.pricingType !== 'licensed') return false;
      } else if (selectedPricingFilter === 'owned') {
        if (!isAppLicensed(app, userLicenses)) return false;
      } else if (selectedPricingFilter === 'coming-soon') {
        if (app.pricingType !== 'coming-soon' && !app.comingSoon) return false;
      }

      return true;
    });
  }, [apps, searchQuery, selectedPackFilter, selectedPricingFilter, userLicenses]);

  return (
    <div id="alco-apps-view" className="space-y-8">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              ALCO App Store
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Official Catalog
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pusat distribusi resmi seluruh produk, modul otomatisasi, dan arsitektur bisnis Aladzan Corpora.
          </p>
        </div>

        {/* Sync status & Search bar */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={onSyncCatalog}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
            title="Sinkronisasi Katalog dari Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMeta.status === 'syncing' ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="apps-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps or functions..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-slate-800 pb-4">
        {/* Pack filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedPackFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              selectedPackFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            All Packs ({apps.length})
          </button>
          {packs.map((pack) => {
            const count = apps.filter((a) => a.packId === pack.id).length;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackFilter(pack.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedPackFilter === pack.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {pack.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Pricing / Licensing Quick Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Filter:</span>
          <select
            value={selectedPricingFilter}
            onChange={(e) => setSelectedPricingFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Semua Tipe Lisensi</option>
            <option value="owned">Aplikasi yang Saya Miliki</option>
            <option value="licensed">Berlisensi Resmi</option>
            <option value="free">Gratis (Free Tools)</option>
            <option value="coming-soon">Coming Soon</option>
          </select>
        </div>
      </div>

      {/* Grid of Apps */}
      {filteredApps.length > 0 ? (
        <div id="product-library-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
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
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-slate-800/80 p-8 space-y-3">
          <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Tidak ada aplikasi yang sesuai filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter untuk melihat katalog aplikasi lainnya.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedPackFilter('all');
              setSelectedPricingFilter('all');
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
};
