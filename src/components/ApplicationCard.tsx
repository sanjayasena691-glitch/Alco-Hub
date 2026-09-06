/**
 * ALCO Hub - Application Card Component
 * Priority hierarchy:
 * 1. Icon (Accent matched)
 * 2. Product Name
 * 3. Function
 * 4. Status Badge & Version
 * 5. Primary Action
 */

import React from 'react';
import {
  Target,
  Sparkles,
  Video,
  TrendingUp,
  Layout,
  Search,
  Package,
  Layers,
  ArrowUpRight,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkle,
} from 'lucide-react';
import { EcosystemApp, ProductAccent, ProductIconName, ContentEngineUpdateResult } from '../types';

interface ApplicationCardProps {
  app: EcosystemApp;
  onOpenApp: (app: EcosystemApp) => void;
  onUpdateApp?: (app: EcosystemApp) => void;
  updateResult?: ContentEngineUpdateResult | null;
  updateStatus?: 'checking' | 'up-to-date' | 'update-available' | 'unable-to-check';
  featured?: boolean;
}

const ACCENT_STYLES: Record<
  ProductAccent,
  {
    iconBg: string;
    iconBorder: string;
    iconText: string;
    glowBorder: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    primaryBtn: string;
  }
> = {
  purple: {
    iconBg: 'bg-purple-500/10',
    iconBorder: 'border-purple-500/30',
    iconText: 'text-purple-400',
    glowBorder: 'hover:border-purple-500/40',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/20',
    primaryBtn: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconBorder: 'border-cyan-500/30',
    iconText: 'text-cyan-400',
    glowBorder: 'hover:border-cyan-500/40',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/20',
    primaryBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconBorder: 'border-blue-500/30',
    iconText: 'text-blue-400',
    glowBorder: 'hover:border-blue-500/40',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/20',
    primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  orange: {
    iconBg: 'bg-orange-500/10',
    iconBorder: 'border-orange-500/30',
    iconText: 'text-orange-400',
    glowBorder: 'hover:border-orange-500/40',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/20',
    primaryBtn: 'bg-orange-600 hover:bg-orange-500 text-white',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/30',
    iconText: 'text-emerald-400',
    glowBorder: 'hover:border-emerald-500/40',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/20',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  teal: {
    iconBg: 'bg-teal-500/10',
    iconBorder: 'border-teal-500/30',
    iconText: 'text-teal-400',
    glowBorder: 'hover:border-teal-500/40',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/20',
    primaryBtn: 'bg-teal-600 hover:bg-teal-500 text-white',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10',
    iconBorder: 'border-indigo-500/30',
    iconText: 'text-indigo-400',
    glowBorder: 'hover:border-indigo-500/40',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/20',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/30',
    iconText: 'text-amber-400',
    glowBorder: 'hover:border-amber-500/40',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/20',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-white',
  },
  rose: {
    iconBg: 'bg-rose-500/10',
    iconBorder: 'border-rose-500/30',
    iconText: 'text-rose-400',
    glowBorder: 'hover:border-rose-500/40',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/20',
    primaryBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  app,
  onOpenApp,
  onUpdateApp,
  updateResult,
  updateStatus,
  featured = false,
}) => {
  const accent = ACCENT_STYLES[app.accent] || ACCENT_STYLES.purple;
  const isContentEngine = app.id === 'content-engine';
  const hasUpdate = isContentEngine && updateStatus === 'update-available';
  const isUpToDate = isContentEngine && updateStatus === 'up-to-date';
  const isChecking = isContentEngine && updateStatus === 'checking';
  const isComingSoon = app.status === 'coming-soon' || app.comingSoon;

  const renderIcon = (name: ProductIconName) => {
    switch (name) {
      case 'target':
        return <Target className="w-5 h-5" aria-hidden="true" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" aria-hidden="true" />;
      case 'video':
        return <Video className="w-5 h-5" aria-hidden="true" />;
      case 'trending-up':
        return <TrendingUp className="w-5 h-5" aria-hidden="true" />;
      case 'layout':
        return <Layout className="w-5 h-5" aria-hidden="true" />;
      case 'search':
        return <Search className="w-5 h-5" aria-hidden="true" />;
      case 'package':
        return <Package className="w-5 h-5" aria-hidden="true" />;
      default:
        return <Layers className="w-5 h-5" aria-hidden="true" />;
    }
  };

  return (
    <article
      id={`app-card-${app.id}`}
      className={`relative rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden min-w-0 ${
        isComingSoon
          ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
          : `bg-slate-900/90 border-slate-800 hover:border-slate-700 ${accent.glowBorder} shadow-lg shadow-black/20`
      } ${featured ? 'p-6' : 'p-5'}`}
    >
      {/* Subtle top edge accent highlight */}
      {!isComingSoon && (
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] opacity-40 transition-opacity group-hover:opacity-100 ${
            app.accent === 'purple'
              ? 'bg-purple-500'
              : app.accent === 'cyan'
                ? 'bg-cyan-500'
                : app.accent === 'orange'
                  ? 'bg-orange-500'
                  : app.accent === 'emerald'
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
          }`}
        />
      )}

      <div className="space-y-4">
        {/* Top Header Row: Icon & Status */}
        <div className="flex items-start justify-between gap-3">
          <div
            id={`app-icon-${app.id}`}
            className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${accent.iconBg} ${accent.iconBorder} ${accent.iconText}`}
          >
            {renderIcon(app.iconName)}
          </div>

          {/* Status Badge */}
          <div className="shrink-0 flex items-center gap-1.5">
            {hasUpdate ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs"
              >
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Update Available</span>
              </span>
            ) : isChecking ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
              >
                <Clock className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" aria-hidden="true" />
                <span>Checking</span>
              </span>
            ) : isUpToDate ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Up to Date</span>
              </span>
            ) : isComingSoon ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60"
              >
                <Clock className="w-3 h-3 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Coming Soon</span>
              </span>
            ) : (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
                <span>Installed</span>
                {app.version && (
                  <span className="text-slate-400 font-mono text-[10px]">· v{app.version}</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Product Identity */}
        <div>
          <h3
            id={`app-title-${app.id}`}
            className="text-base font-bold text-slate-100 tracking-tight leading-snug group-hover:text-white"
          >
            {app.name}
          </h3>
          <p
            id={`app-function-${app.id}`}
            className="text-xs font-semibold text-slate-400 mt-1 leading-normal"
          >
            {app.functionLabel}
          </p>
        </div>

        {/* Short Description */}
        <p
          id={`app-desc-${app.id}`}
          className="text-xs text-slate-400 leading-relaxed break-words"
        >
          {app.description}
        </p>

        {/* Special Update Info Pill for Content Engine */}
        {hasUpdate && (
          <div
            id={`update-notification-box-${app.id}`}
            className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                New Version Available
              </span>
              <span className="text-xs font-semibold">
                v{updateResult?.localVersion || '0.1.0'} → v{updateResult?.latestVersion || '0.1.1'}
              </span>
            </div>
            {onUpdateApp && (
              <button
                id="app-card-direct-update-btn"
                type="button"
                onClick={() => onUpdateApp(app)}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shrink-0"
              >
                Update
              </button>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center gap-2">
        {isComingSoon ? (
          <button
            id={`app-btn-${app.id}`}
            type="button"
            disabled
            aria-disabled="true"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/50 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-800"
          >
            <span>Coming Soon</span>
          </button>
        ) : (
          <button
            id={`app-btn-${app.id}`}
            type="button"
            onClick={() => onOpenApp(app)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-950 hover:bg-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <span>Open {app.shortName}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};
