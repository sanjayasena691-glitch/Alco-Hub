/**
 * ALCO Hub - Product Library (Apps View)
 * Menampilkan katalog lengkap aplikasi ALCO dengan filter kategori pack & status.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Grid,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { EcosystemApp, EcosystemPack, ContentEngineUpdateResult, ContentEngineUpdateStatus } from '../types';
import { ApplicationCard } from './ApplicationCard';

interface AppsViewProps {
  apps: EcosystemApp[];
  packs: EcosystemPack[];
  onOpenApp: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
}

export const AppsView: React.FC<AppsViewProps> = ({
  apps,
  packs,
  onOpenApp,
  onUpdateApp,
  updateResult,
  updateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

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

      // 3. Status Filter
      if (selectedStatusFilter === 'installed') {
        if (app.status === 'coming-soon' || app.comingSoon) return false;
      } else if (selectedStatusFilter === 'update-available') {
        if (app.id !== 'content-engine' || updateStatus !== 'update-available') return false;
      } else if (selectedStatusFilter === 'coming-soon') {
        if (app.status !== 'coming-soon' && !app.comingSoon) return false;
      }

      return true;
    });
  }, [apps, searchQuery, selectedPackFilter, selectedStatusFilter, updateStatus]);

  return (
    <div id="alco-apps-view" className="space-y-8">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Product Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Katalog lengkap seluruh aplikasi dan modul dalam Aladzan Corpora Ecosystem.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="apps-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications or functions..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
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

        {/* Status quick filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="installed">Installed & Ready</option>
            <option value="update-available">Update Available</option>
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
              onOpenApp={onOpenApp}
              onUpdateApp={onUpdateApp}
              updateResult={updateResult}
              updateStatus={updateStatus}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-slate-800/80 p-8 space-y-3">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Tidak ada aplikasi yang sesuai</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter untuk melihat katalog aplikasi lainnya.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedPackFilter('all');
              setSelectedStatusFilter('all');
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
