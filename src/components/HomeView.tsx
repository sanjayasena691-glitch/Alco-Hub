/**
 * ALCO Hub - Home View (Command Center)
 * Sections:
 * 1. Greeting & Ecosystem Context
 * 2. Continue Working (Recent App)
 * 3. Core System (Creative System, Content Engine, Auto Motion)
 * 4. Your Packs (Meta Ads Starter Pack)
 * 5. ALCO Navigator (AI Ecosystem Assistant)
 */

import React from 'react';
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
  Download,
} from 'lucide-react';
import {
  EcosystemApp,
  EcosystemPack,
  ContentEngineUpdateResult,
  ContentEngineUpdateStatus,
  NavigationTab,
  UserLicense,
  AppLocalInstallation,
  AppInstallProgress,
} from '../types';
import { ApplicationCard } from './ApplicationCard';
import { PackCard } from './PackCard';
import { AlcoNavigator } from './AlcoNavigator';

interface HomeViewProps {
  coreApps: EcosystemApp[];
  packs: EcosystemPack[];
  allApps: EcosystemApp[];
  userLicenses: Record<string, UserLicense>;
  localInstallations?: Record<string, AppLocalInstallation>;
  installProgressMap?: Record<string, AppInstallProgress>;
  recentApp: EcosystemApp | undefined;
  onOpenApp: (app: EcosystemApp) => void;
  onInstallApp?: (app: EcosystemApp) => void;
  onUpdateApp: (app: EcosystemApp) => void;
  onRequestLicense: (app: EcosystemApp) => void;
  onExplorePack: (pack: EcosystemPack) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  updateResult: ContentEngineUpdateResult | null;
  updateStatus: ContentEngineUpdateStatus;
  apiKey: string;
  onRequestApiKey: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  coreApps,
  packs,
  allApps,
  userLicenses,
  localInstallations = {},
  installProgressMap = {},
  recentApp,
  onOpenApp,
  onInstallApp,
  onUpdateApp,
  onRequestLicense,
  onExplorePack,
  onNavigateTab,
  updateResult,
  updateStatus,
  apiKey,
  onRequestApiKey,
}) => {
  const metaAdsApps = allApps.filter((a) => a.packId === 'meta-ads-starter');

  return (
    <div id="alco-home-view" className="space-y-10">
      {/* 1. Command Center Greeting Header */}
      <section
        id="home-greeting-section"
        className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aladzan Corpora Ecosystem Control</span>
          </div>
          <h1
            id="home-greeting-title"
            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight"
          >
            Your business ecosystem, in one place.
          </h1>
          <p
            id="home-greeting-subtitle"
            className="text-sm text-slate-400 leading-relaxed pt-1"
          >
            ALCO Hub mengatur ekosistem. Setiap ALCO App mengerjakan fungsi spesifiknya dari perancangan strategi, produksi konten, video motion, hingga optimasi campaign iklan.
          </p>
        </div>
      </section>

      {/* 2. CONTINUE WORKING (Recent App Quick-Launcher) */}
      {recentApp && (
        <section id="section-continue-working" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">
              Continue Working
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Quick Desktop Resume
            </span>
          </div>

          <div
            id="recent-app-banner"
            className="p-5 sm:p-6 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">
                    {recentApp.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                    Active Module
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {recentApp.functionLabel} • {recentApp.lastOpenedText || 'Last opened recently'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                id="continue-working-launch-btn"
                type="button"
                onClick={() => onOpenApp(recentApp)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. CORE SYSTEM (Creative System, Content Engine, Auto Motion) */}
      <section id="section-core-system" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="heading-core-system" className="text-lg font-bold text-white tracking-tight">
              Core System
            </h2>
            <p className="text-xs text-slate-400">
              Aplikasi fondasi utama untuk riset, produksi konten, dan video editing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('store')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
          >
            <span>View All Apps</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div id="core-system-grid" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coreApps.map((app) => {
            const canonicalId = app.appId || app.id;
            return (
              <ApplicationCard
                key={app.id}
                app={app}
                userLicenses={userLicenses}
                installation={localInstallations[canonicalId] || localInstallations[app.id]}
                installProgress={installProgressMap[canonicalId] || installProgressMap[app.id]}
                onOpenApp={onOpenApp}
                onInstallApp={onInstallApp}
                onUpdateApp={onUpdateApp}
                onRequestLicense={onRequestLicense}
                updateResult={updateResult}
                updateStatus={updateStatus}
              />
            );
          })}
        </div>
      </section>

      {/* 4. YOUR PACKS (Meta Ads Starter Pack) */}
      <section id="section-your-packs" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="heading-your-packs" className="text-lg font-bold text-white tracking-tight">
              Your Packs
            </h2>
            <p className="text-xs text-slate-400">
              Paket modular terintegrasi untuk kebutuhan akselerasi bisnis spesifik.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('packs')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
          >
            <span>Explore Packs Directory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div id="your-packs-grid" className="grid grid-cols-1 gap-6">
          {packs
            .filter((p) => p.id === 'meta-ads-starter')
            .map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                appsInPack={metaAdsApps}
                onExplorePack={onExplorePack}
              />
            ))}
        </div>
      </section>

      {/* 5. ALCO NAVIGATOR (Integrated Assistant) */}
      <section id="section-navigator" className="pt-2">
        <AlcoNavigator
          apiKey={apiKey}
          apps={allApps}
          onRequestApiKey={onRequestApiKey}
          onOpenAppUrl={onOpenApp}
        />
      </section>
    </div>
  );
};
