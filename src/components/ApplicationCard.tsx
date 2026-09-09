/**
 * ALCO Hub - Application Card Component
 * Priority hierarchy:
 * 1. Icon (Accent matched)
 * 2. Product Name & Function
 * 3. Status Badge, Price & Version
 * 4. Primary Action (Open / Get License / Coming Soon / Update)
 */

import React, { useState } from 'react';
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
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
  RefreshCw,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import {
  EcosystemApp,
  ProductAccent,
  ProductIconName,
  AppLocalInstallation,
  AppInstallProgress,
} from '../types';
import { AppIcon } from './AppIcon';

interface ApplicationCardProps {
  app: EcosystemApp;
  installation?: AppLocalInstallation;
  installProgress?: AppInstallProgress;
  onOpenApp: (app: EcosystemApp) => void;
  onInstallApp?: (app: EcosystemApp) => void;
  onUpdateApp?: (app: EcosystemApp) => void;
  onCheckInstalled?: (appId: string) => Promise<boolean> | void;
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
    iconBg: 'bg-purple-50 dark:bg-purple-500/10',
    iconBorder: 'border-purple-200 dark:border-purple-500/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    glowBorder: 'hover:border-purple-300 dark:hover:border-purple-500/40',
    badgeBg: 'bg-purple-50 dark:bg-purple-500/10',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-500/20',
    primaryBtn: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  cyan: {
    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
    iconBorder: 'border-cyan-200 dark:border-cyan-500/30',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    glowBorder: 'hover:border-cyan-300 dark:hover:border-cyan-500/40',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-500/10',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    badgeBorder: 'border-cyan-200 dark:border-cyan-500/20',
    primaryBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
  },
  blue: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconBorder: 'border-blue-200 dark:border-blue-500/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    glowBorder: 'hover:border-blue-300 dark:hover:border-blue-500/40',
    badgeBg: 'bg-blue-50 dark:bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-500/20',
    primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  orange: {
    iconBg: 'bg-orange-50 dark:bg-orange-500/10',
    iconBorder: 'border-orange-200 dark:border-orange-500/30',
    iconText: 'text-orange-600 dark:text-orange-400',
    glowBorder: 'hover:border-orange-300 dark:hover:border-orange-500/40',
    badgeBg: 'bg-orange-50 dark:bg-orange-500/10',
    badgeText: 'text-orange-700 dark:text-orange-300',
    badgeBorder: 'border-orange-200 dark:border-orange-500/20',
    primaryBtn: 'bg-orange-600 hover:bg-orange-500 text-white',
  },
  emerald: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconBorder: 'border-emerald-200 dark:border-emerald-500/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    glowBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-500/20',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  indigo: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    iconBorder: 'border-indigo-200 dark:border-indigo-500/30',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    glowBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/40',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-500/20',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  },
  teal: {
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
    iconBorder: 'border-teal-200 dark:border-teal-500/30',
    iconText: 'text-teal-600 dark:text-teal-400',
    glowBorder: 'hover:border-teal-300 dark:hover:border-teal-500/40',
    badgeBg: 'bg-teal-50 dark:bg-teal-500/10',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-500/20',
    primaryBtn: 'bg-teal-600 hover:bg-teal-500 text-white',
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconBorder: 'border-amber-200 dark:border-amber-500/30',
    iconText: 'text-amber-600 dark:text-amber-400',
    glowBorder: 'hover:border-amber-300 dark:hover:border-amber-500/40',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-500/20',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950',
  },
  rose: {
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconBorder: 'border-rose-200 dark:border-rose-500/30',
    iconText: 'text-rose-600 dark:text-rose-400',
    glowBorder: 'hover:border-rose-300 dark:hover:border-rose-500/40',
    badgeBg: 'bg-rose-50 dark:bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-500/20',
    primaryBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  app,
  installation,
  installProgress,
  onOpenApp,
  onInstallApp,
  onUpdateApp,
  onCheckInstalled,
  featured = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const accent = ACCENT_STYLES[app.accent || 'purple'] || ACCENT_STYLES.purple;

  const isInstalled = Boolean(installation?.isInstalled);
  const isComingSoon = app.status === 'coming-soon' || app.comingSoon;
  const isFree = app.pricingType === 'free';

  // Live installer progress states
  const isDownloading = installProgress?.status === 'downloading';
  const isVerifying = installProgress?.status === 'verifying';
  const isInstallerReady = installProgress?.status === 'installer-ready';
  const isAppRunning = installProgress?.status === 'app-running';
  const isClosingApp = installProgress?.status === 'closing-app';
  const isLaunching = installProgress?.status === 'launching-installer';
  const isInstallerOpened = installProgress?.status === 'installer-opened';
  const isWaitingCompletion = installProgress?.status === 'waiting-completion';
  const isFailed = installProgress?.status === 'failed' || installProgress?.status === 'installation-failed';
  const isBusy = isDownloading || isVerifying || isInstallerReady || isAppRunning || isClosingApp || isLaunching;
  const hasCachedInstaller = Boolean(installProgress?.fromCache || installProgress?.installerPath);

  const hasUpdate =
    isInstalled &&
    Boolean(app.latestVersion && installation?.version && app.latestVersion !== installation.version);

  const renderIcon = (name: ProductIconName) => {
    switch (name) {
      case 'target':
        return <Target className="w-5 h-5" aria-hidden="true" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" aria-hidden="true" />;
      case 'video':
        return <Video className="w-5 h-5" aria-hidden="true" />;
      case 'package':
        return <Package className="w-5 h-5" aria-hidden="true" />;
      case 'trending-up':
        return <TrendingUp className="w-5 h-5" aria-hidden="true" />;
      case 'layout':
        return <Layout className="w-5 h-5" aria-hidden="true" />;
      case 'search':
        return <Search className="w-5 h-5" aria-hidden="true" />;
      default:
        return <Layers className="w-5 h-5" aria-hidden="true" />;
    }
  };

  return (
    <article
      id={`app-card-${app.id}`}
      className={`relative rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden min-w-0 ${
        isComingSoon
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-75'
          : `bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 ${accent.glowBorder} shadow-sm dark:shadow-lg dark:shadow-black/20`
      } ${featured ? 'p-6' : 'p-5'}`}
    >
      {/* Subtle top edge accent highlight */}
      {!isComingSoon && (
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] opacity-60 dark:opacity-40 transition-opacity group-hover:opacity-100 ${
            app.accent === 'purple'
              ? 'bg-purple-500'
              : app.accent === 'cyan'
                ? 'bg-cyan-500'
                : app.accent === 'orange'
                  ? 'bg-orange-500'
                  : app.accent === 'rose'
                    ? 'bg-rose-500'
                    : app.accent === 'emerald'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
          }`}
        />
      )}

      <div className="space-y-4">
        {/* Top Header Row: Icon & Status / Price */}
        <div className="flex items-start justify-between gap-3">
          {/* Official App Icon with Lucide fallback */}
          <div
            id={`app-icon-${app.id}`}
            className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden ${accent.iconBg} ${accent.iconBorder} ${accent.iconText}`}
          >
            <AppIcon
              iconUrl={app.iconUrl}
              iconName={app.iconName}
              name={app.name}
              iconClassName="w-5 h-5"
            />
          </div>

          {/* Status Badge */}
          <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
            {hasUpdate && (
              <span
                id={`app-status-badge-update-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shadow-xs"
              >
                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>Update Available</span>
              </span>
            )}

            {isComingSoon ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
              >
                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                <span>Coming Soon</span>
              </span>
            ) : isDownloading ? (
              <span
                id={`app-status-badge-downloading-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 animate-pulse"
              >
                <RefreshCw className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-spin shrink-0" />
                <span>Downloading {installProgress?.progress || 0}%</span>
              </span>
            ) : isVerifying ? (
              <span
                id={`app-status-badge-verifying-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 animate-pulse"
              >
                <FileCheck2 className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Verifying SHA-256</span>
              </span>
            ) : isInstallerReady ? (
              <span
                id={`app-status-badge-ready-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-xs"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Installer Ready (Cache)</span>
              </span>
            ) : isClosingApp || isAppRunning ? (
              <span
                id={`app-status-badge-closing-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
              >
                <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                <span>Menutup App Aktif...</span>
              </span>
            ) : isLaunching ? (
              <span
                id={`app-status-badge-launching-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
              >
                <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                <span>Membuka Installer...</span>
              </span>
            ) : isInstallerOpened ? (
              <span
                id={`app-status-badge-opened-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 shadow-xs"
              >
                <ExternalLink className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Installer Dibuka</span>
              </span>
            ) : isWaitingCompletion ? (
              <span
                id={`app-status-badge-waiting-${app.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shadow-xs"
              >
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Menunggu Instalasi</span>
              </span>
            ) : isFailed ? (
              <span
                id={`app-status-badge-failed-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
              >
                <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Gagal Pasang</span>
              </span>
            ) : isInstalled ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Installed {installation?.version ? `v${installation.version}` : ''}</span>
              </span>
            ) : isFree ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Free Tool</span>
              </span>
            ) : app.pricingType === 'trial' ? (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20"
              >
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>Trial {app.trialDurationDays ? `${app.trialDurationDays}D` : ''}</span>
              </span>
            ) : (
              <span
                id={`app-status-badge-${app.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/25"
              >
                <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                <span>Licensed Product</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Identity */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3
              id={`app-title-${app.id}`}
              className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-white"
            >
              {app.name}
            </h3>
            {app.priceLabel && !isComingSoon && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                {app.priceLabel}
              </span>
            )}
          </div>
          <p
            id={`app-function-${app.id}`}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-normal"
          >
            {app.functionLabel}
          </p>
        </div>

        {/* Short Description */}
        <p
          id={`app-desc-${app.id}`}
          className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words"
        >
          {app.description}
        </p>

        {/* Download & Verification Live Progress Box */}
        {isDownloading && (
          <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-800 dark:text-cyan-200">
              <span className="font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-bounce" />
                <span>Mengunduh Installer...</span>
              </span>
              <span className="font-mono font-bold">{installProgress?.progress || 0}%</span>
            </div>
            {/* Progress Bar Track */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-slate-700">
              <div
                className="bg-cyan-500 dark:bg-cyan-400 h-full rounded-full transition-all duration-150 shadow-sm"
                style={{ width: `${installProgress?.progress || 0}%` }}
              />
            </div>
            {installProgress?.totalBytes ? (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex justify-between">
                <span>{((installProgress.bytesReceived || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                <span>{((installProgress.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            ) : null}
          </div>
        )}

        {isVerifying && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 space-y-1 text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Memverifikasi Checksum SHA-256...</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">Menjamin integritas dan keaslian binary dari GitHub.</p>
            </div>
          </div>
        )}

        {isInstallerReady && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 space-y-1 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Installer Siap (Cache Terverifikasi)</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Menggunakan file installer lokal yang sudah terunduh dan lolos uji SHA-256.</p>
            </div>
          </div>
        )}

        {(isClosingApp || isAppRunning) && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 space-y-1 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Menutup Aplikasi Lama...</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">Menutup proses aplikasi target agar update file berjalan lancar.</p>
            </div>
          </div>
        )}

        {isLaunching && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 space-y-1 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Membuka Setup Installer...</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">Menjalankan wizard instalasi di Windows...</p>
            </div>
          </div>
        )}

        {isInstallerOpened && (
          <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 space-y-2 text-xs text-cyan-800 dark:text-cyan-200">
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">Installer Dibuka</p>
                <p className="text-[11px] text-cyan-700 dark:text-cyan-300/90 leading-relaxed mt-0.5">
                  Selesaikan instalasi melalui Windows Setup. ALCO Hub mendeteksi otomatis saat aplikasi selesai dipasang.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-cyan-200 dark:border-cyan-500/20">
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                Memantau instalasi...
              </span>
              {onCheckInstalled && (
                <button
                  type="button"
                  onClick={() => onCheckInstalled(app.appId || app.id)}
                  className="text-[11px] font-semibold text-slate-900 dark:text-white underline hover:text-cyan-600 dark:hover:text-cyan-200 cursor-pointer"
                >
                  Cek Sekarang
                </button>
              )}
            </div>
          </div>
        )}

        {isWaitingCompletion && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 space-y-2 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-900 dark:text-amber-100">Menunggu instalasi selesai</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed mt-0.5">
                  Jika Anda sudah menyelesaikan wizard Windows Setup, klik tombol di bawah untuk mendeteksi aplikasi.
                </p>
              </div>
            </div>
            {onCheckInstalled && (
              <button
                type="button"
                onClick={() => onCheckInstalled(app.appId || app.id)}
                className="w-full py-1.5 px-3 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Check Again</span>
              </button>
            )}
          </div>
        )}

        {isFailed && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 space-y-2 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-900 dark:text-rose-100">Instalasi Belum Selesai</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed mt-0.5">
                  {installProgress?.error || 'Proses instalasi belum tuntas atau dibatalkan.'}
                </p>
              </div>
            </div>
            {hasCachedInstaller && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                ✓ Installer valid tersimpan di cache lokal. Anda dapat mencoba pasang ulang tanpa download ulang.
              </p>
            )}
          </div>
        )}

        {/* Update Notification Box */}
        {hasUpdate && !isBusy && (
          <div
            id={`update-notification-box-${app.id}`}
            className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider block">
                Versi Baru v{app.latestVersion}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                Terpasang: v{installation?.version || app.version}
              </span>
            </div>
            {onUpdateApp && (
              <button
                id="app-card-direct-update-btn"
                type="button"
                onClick={() => onUpdateApp(app)}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shrink-0 cursor-pointer"
              >
                Lihat Update
              </button>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
        {isComingSoon ? (
          <button
            id={`app-btn-${app.id}`}
            type="button"
            disabled
            aria-disabled="true"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-800"
          >
            <span>Coming Soon</span>
          </button>
        ) : isBusy ? (
          <button
            id={`app-btn-busy-${app.id}`}
            type="button"
            disabled
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold cursor-wait border border-slate-200 dark:border-slate-700/80"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
            <span>
              {isDownloading
                ? `Mengunduh (${installProgress?.progress || 0}%)...`
                : isVerifying
                  ? 'Memverifikasi SHA-256...'
                  : 'Membuka Setup Installer...'}
            </span>
          </button>
        ) : isInstalled ? (
          <button
            id={`app-btn-${app.id}`}
            type="button"
            onClick={() => onOpenApp(app)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            <span>Buka {app.shortName}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" aria-hidden="true" />
          </button>
        ) : isInstallerOpened ? (
          <button
            id={`app-btn-opened-${app.id}`}
            type="button"
            onClick={() => onCheckInstalled && onCheckInstalled(app.appId || app.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-200" />
            <span>Cek Status Instalasi</span>
          </button>
        ) : isWaitingCompletion ? (
          <button
            id={`app-btn-waiting-${app.id}`}
            type="button"
            onClick={() => onCheckInstalled && onCheckInstalled(app.appId || app.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-200" />
            <span>Check Again</span>
          </button>
        ) : isFailed ? (
          <div className="w-full flex items-center gap-2">
            <button
              id={`app-btn-retry-${app.id}`}
              type="button"
              onClick={() => onInstallApp && onInstallApp(app)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{hasCachedInstaller ? 'Pasang Ulang (Cache)' : 'Coba Lagi'}</span>
            </button>
            {onCheckInstalled && (
              <button
                id={`app-btn-check-failed-${app.id}`}
                type="button"
                onClick={() => onCheckInstalled(app.appId || app.id)}
                className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
              >
                <span>Cek Status</span>
              </button>
            )}
          </div>
        ) : app.downloadUrl && app.sha256 ? (
          <button
            id={`app-btn-install-${app.id}`}
            type="button"
            onClick={() => onInstallApp && onInstallApp(app)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install {app.shortName} (v{app.latestVersion || app.version})</span>
          </button>
        ) : (
          <button
            id={`app-btn-no-download-${app.id}`}
            type="button"
            disabled
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700/50"
          >
            <span>Download Belum Tersedia</span>
          </button>
        )}
      </div>
    </article>
  );
};
