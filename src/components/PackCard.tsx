/**
 * ALCO Hub - Product Pack Card Component
 * Container besar untuk pack ekosistem (misal: Meta Ads Starter Pack)
 */

import React from 'react';
import {
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Layout,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { EcosystemPack, EcosystemApp } from '../types';

interface PackCardProps {
  pack: EcosystemPack;
  appsInPack: EcosystemApp[];
  onExplorePack: (pack: EcosystemPack) => void;
  featured?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  appsInPack,
  onExplorePack,
  featured = false,
}) => {
  return (
    <div
      id={`pack-card-${pack.id}`}
      className="relative rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-slate-700/90 p-6 sm:p-7 shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden group"
    >
      {/* Decorative accent background blur */}
      <div
        className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-15 transition-opacity group-hover:opacity-25 ${
          pack.accent === 'emerald'
            ? 'bg-emerald-500'
            : pack.accent === 'purple'
              ? 'bg-purple-500'
              : 'bg-indigo-500'
        }`}
      />

      <div className="relative z-10 space-y-5">
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              {pack.category}
            </span>
          </div>

          <span
            id={`pack-badge-${pack.id}`}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
          >
            {pack.toolCount} Tools Included
          </span>
        </div>

        {/* Title and tagline */}
        <div>
          <h3
            id={`pack-title-${pack.id}`}
            className="text-xl sm:text-2xl font-extrabold text-white tracking-tight"
          >
            {pack.name}
          </h3>
          <p className="text-sm font-medium text-slate-300 mt-1">
            {pack.tagline}
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {pack.description}
          </p>
        </div>

        {/* Tools list preview chips */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Tools inside this pack
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {appsInPack.map((app) => {
              const isComingSoon = app.status === 'coming-soon' || app.comingSoon;
              return (
                <div
                  key={app.id}
                  id={`pack-tool-chip-${app.id}`}
                  className={`px-3 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                    isComingSoon
                      ? 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isComingSoon ? 'bg-slate-600' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-semibold truncate">{app.shortName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {isComingSoon ? 'Coming Soon' : 'Ready'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          Integrated Marketing Workflow
        </span>
        <button
          id={`explore-pack-btn-${pack.id}`}
          type="button"
          onClick={() => onExplorePack(pack)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <span>Explore Pack</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
