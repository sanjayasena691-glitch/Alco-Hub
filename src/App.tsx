/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowRight,
  ExternalLink,
  Target,
  Sparkles,
  Package,
  CheckCircle2,
  Clock,
  HelpCircle,
  Compass,
  Key,
  AlertCircle,
  Download,
} from 'lucide-react';
import { ECOSYSTEM_CONFIG, EcosystemApp } from './config/ecosystemApps';
import { AlcoNavigator } from './components/AlcoNavigator';
import { ApiKeyModal } from './components/ApiKeyModal';
import { getUserApiKey, getMaskedApiKey } from './services/aiNavigatorService';

type ContentEngineUpdateStatus = 'checking' | 'up-to-date' | 'update-available' | 'unable-to-check';

interface ContentEngineUpdateResult {
  success: boolean;
  status: Exclude<ContentEngineUpdateStatus, 'checking'>;
  error?: string;
  localVersion?: string | null;
  latestVersion?: string;
  registry?: {
    latestVersion: string;
    status: string;
    downloadUrl: string;
    sha256: string;
  };
}

declare global {
  interface Window {
    alcoHub?: {
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      openDesktopApp: (appId: string) => Promise<{ success: boolean; error?: string }>;
      checkContentEngineUpdate?: () => Promise<ContentEngineUpdateResult>;
    };
  }
}

export default function App() {
  const { hubName, hubSubtitle, flowDescription, apps, chooserAdvice } = ECOSYSTEM_CONFIG;
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [contentEngineUpdate, setContentEngineUpdate] = useState<ContentEngineUpdateResult | null>(null);
  const [contentEngineUpdateStatus, setContentEngineUpdateStatus] = useState<ContentEngineUpdateStatus>('checking');

  useEffect(() => {
    const key = getUserApiKey();
    setApiKey(key);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!window.alcoHub?.checkContentEngineUpdate) {
      setContentEngineUpdateStatus('unable-to-check');
      return () => {
        isMounted = false;
      };
    }

    window.alcoHub.checkContentEngineUpdate()
      .then((result) => {
        if (!isMounted) return;
        setContentEngineUpdate(result);
        setContentEngineUpdateStatus(result.status || 'unable-to-check');
      })
      .catch(() => {
        if (!isMounted) return;
        setContentEngineUpdateStatus('unable-to-check');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAppUrl = (app: EcosystemApp) => {
    if (app.launchMode === 'desktop') {
      if (!window.alcoHub?.openDesktopApp) {
        window.alert(`${app.name} desktop hanya dapat dibuka dari aplikasi ALCO Hub.`);
        return;
      }
      window.alcoHub.openDesktopApp(app.id).then((result) => {
        if (!result.success) window.alert(result.error || `${app.name} tidak dapat dibuka.`);
      }).catch(() => window.alert(`${app.name} tidak dapat dibuka.`));
      return;
    }

    const url = app.url;
    if (!url || !url.trim()) return;

    if (window.alcoHub && typeof window.alcoHub.openExternal === 'function') {
      window.alcoHub.openExternal(url).catch((err) => {
        console.error('Gagal membuka URL melalui Electron:', err);
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenApp = (e: React.MouseEvent<HTMLAnchorElement>, app: EcosystemApp) => {
    if (app.launchMode === 'desktop') {
      e.preventDefault();
      handleOpenAppUrl(app);
      return;
    }

    if (window.alcoHub && typeof window.alcoHub.openExternal === 'function') {
      e.preventDefault();
      handleOpenAppUrl(app);
    }
  };

  const handleUpdatePlaceholder = () => {
    window.alert('Update installer belum diaktifkan. Tahap ini hanya mengecek ketersediaan update.');
  };

  const renderIcon = (iconName: EcosystemApp['iconName']) => {
    switch (iconName) {
      case 'target':
        return <Target className="w-5 h-5 text-sky-600" aria-hidden="true" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden="true" />;
      case 'package':
        return <Package className="w-5 h-5 text-amber-600" aria-hidden="true" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" aria-hidden="true" />;
    }
  };

  return (
    <div id="alco-hub-app" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top compact navigation header */}
      <header id="alco-header" className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              id="alco-brand-badge"
              className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base tracking-tight shrink-0 shadow-xs"
            >
              A
            </div>
            <div className="min-w-0">
              <h1 id="alco-brand-title" className="text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                {hubName}
              </h1>
              <p id="alco-brand-subtitle" className="text-xs text-slate-500 font-medium truncate">
                {hubSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="header-api-key-indicator-btn"
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors"
              title="Pengaturan Kunci API AI Gemini"
            >
              <Key className="w-3 h-3 text-slate-600" />
              <span className="hidden sm:inline">
                {apiKey ? `AI: ${getMaskedApiKey(apiKey)}` : 'Set API Key'}
              </span>
              <span className="sm:hidden">
                {apiKey ? 'AI Aktif' : 'Set Key'}
              </span>
            </button>
            <span
              id="alco-ecosystem-status"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              Ekosistem ALCO
            </span>
          </div>
        </div>
      </header>

      {/* Main content container */}
      <main id="alco-main-container" className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        
        {/* Section 1: "Mulai dari sini" (Workflow recommendation) */}
        <section
          id="section-start-here"
          aria-labelledby="heading-start-here"
          className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2 id="heading-start-here" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Mulai dari sini
            </h2>
          </div>

          <p id="flow-description-text" className="text-sm text-slate-600 mb-5 leading-relaxed break-words">
            {flowDescription}
          </p>

          {/* Sequential workflow step pills */}
          <div
            id="workflow-step-flow"
            className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 pt-1"
          >
            {apps.map((app, index) => {
              return (
                <div
                  key={`flow-${app.id}`}
                  id={`flow-step-${app.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-200/90 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {app.stepNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {app.shortName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {app.stageLabel.replace(/Langkah \d • /, '')}
                      </p>
                    </div>
                  </div>
                  {index < apps.length - 1 ? (
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" aria-hidden="true" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 hidden md:block" title="Siklus Lengkap" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: "Tanya ALCO Navigator" (AI Assistant & Project Checker) */}
        <AlcoNavigator
          apiKey={apiKey}
          apps={apps}
          onRequestApiKey={() => setIsApiKeyModalOpen(true)}
          onOpenAppUrl={handleOpenAppUrl}
        />

        {/* Section 3: "Aplikasi ALCO" (App Cards Grid) */}
        <section id="section-alco-apps" aria-labelledby="heading-alco-apps" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="heading-alco-apps" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Aplikasi ALCO
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {apps.length} Modul Terintegrasi
            </span>
          </div>

          <div id="apps-card-grid" className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {apps.map((app) => {
              const isAvailable = app.launchMode === 'desktop' || Boolean(app.url && app.url.trim().length > 0);
              const isContentEngine = app.id === 'content-engine';
              const updateStatus = isContentEngine ? contentEngineUpdateStatus : null;
              const latestVersion = contentEngineUpdate?.latestVersion || contentEngineUpdate?.registry?.latestVersion;

              return (
                <article
                  key={app.id}
                  id={`app-card-${app.id}`}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all duration-150 min-w-0"
                >
                  <div className="space-y-4">
                    {/* Card Top: Stage Badge & Honest Status Indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        id={`app-stage-${app.id}`}
                        className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase truncate"
                      >
                        {app.stageLabel}
                      </span>
                      {isContentEngine && updateStatus === 'update-available' ? (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 shrink-0"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600" aria-hidden="true" />
                          Update Available
                        </span>
                      ) : isContentEngine && updateStatus === 'unable-to-check' ? (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
                        >
                          <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          Unable to Check
                        </span>
                      ) : isContentEngine && updateStatus === 'up-to-date' ? (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          Up to Date
                        </span>
                      ) : isContentEngine && updateStatus === 'checking' ? (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/70 shrink-0"
                        >
                          <Clock className="w-3 h-3 text-sky-500" aria-hidden="true" />
                          Checking
                        </span>
                      ) : isAvailable ? (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          Siap dibuka
                        </span>
                      ) : (
                        <span
                          id={`app-status-${app.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
                        >
                          <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          Segera hadir
                        </span>
                      )}
                    </div>

                    {/* App Title & Icon */}
                    <div className="flex items-start gap-3">
                      <div
                        id={`app-icon-${app.id}`}
                        className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5"
                      >
                        {renderIcon(app.iconName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          id={`app-title-${app.id}`}
                          className="text-base font-bold text-slate-900 leading-snug break-words"
                        >
                          {app.name}
                        </h3>
                      </div>
                    </div>

                    {/* App Description */}
                    <p
                      id={`app-desc-${app.id}`}
                      className="text-sm text-slate-600 leading-relaxed break-words text-left"
                    >
                      {app.description}
                    </p>

                    {isContentEngine && updateStatus !== 'checking' ? (
                      <div
                        id="content-engine-update-checker"
                        className={`rounded-lg border p-3 text-xs ${
                          updateStatus === 'update-available'
                            ? 'bg-amber-50 border-amber-200/80 text-amber-900'
                            : updateStatus === 'up-to-date'
                              ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="font-semibold">
                          {updateStatus === 'update-available'
                            ? 'Update tersedia untuk Content Engine.'
                            : updateStatus === 'up-to-date'
                              ? 'Content Engine sudah versi terbaru.'
                              : 'Update belum dapat dicek.'}
                        </div>
                        {updateStatus === 'update-available' ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide opacity-70">Installed Version</span>
                              <span className="font-bold">{contentEngineUpdate?.localVersion || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide opacity-70">Latest Version</span>
                              <span className="font-bold">{latestVersion || 'Unknown'}</span>
                            </div>
                          </div>
                        ) : null}
                        {updateStatus === 'unable-to-check' && contentEngineUpdate?.error ? (
                          <p className="mt-1.5 leading-relaxed">{contentEngineUpdate.error}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Card Bottom: Action Button */}
                  <div className="pt-6 mt-2 border-t border-slate-100 space-y-2.5">
                    {isContentEngine && updateStatus === 'update-available' ? (
                      <button
                        id="content-engine-update-placeholder-btn"
                        type="button"
                        onClick={handleUpdatePlaceholder}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-amber-950 hover:bg-amber-400 text-sm font-bold tracking-tight transition-colors shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      >
                        <span>Update</span>
                        <Download className="w-4 h-4 text-amber-950" aria-hidden="true" />
                      </button>
                    ) : null}
                    {isAvailable ? (
                      <a
                        id={`app-btn-${app.id}`}
                        href={app.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleOpenApp(e, app)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold tracking-tight transition-colors shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                      >
                        <span>{app.buttonLabel}</span>
                        <ExternalLink className="w-4 h-4 text-slate-300" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        id={`app-btn-${app.id}`}
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed border border-slate-200/80"
                      >
                        <span>Segera Hadir</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Section 4: "Butuh bantuan memilih?" (Beginner guidance) */}
        <section
          id="section-help-chooser"
          aria-labelledby="heading-help-chooser"
          className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-help-chooser" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Butuh bantuan memilih?
              </h2>
              <p className="text-xs text-slate-500">
                Panduan singkat untuk menentukan aplikasi pertama yang perlu Anda buka.
              </p>
            </div>
          </div>

          <div id="help-chooser-list" className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {chooserAdvice.map((item) => {
              const matchedApp = apps.find((a) => a.id === item.appId);
              return (
                <div
                  key={item.appId}
                  id={`help-item-${item.appId}`}
                  className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <span className="inline-block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {matchedApp?.shortName || item.appId}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug break-words">
                      {item.condition}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed break-words">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Clean, minimal Hub footer */}
      <footer id="alco-footer" className="border-t border-slate-200/80 bg-white py-6 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ALCO Hub</span>
            <span>•</span>
            <span>Gerbang Ekosistem Digital Marketing</span>
          </div>
          <p className="text-slate-400">
            Dibuat untuk memudahkan alur kerja digital marketer pemula.
          </p>
        </div>
      </footer>

      {/* Gemini API Key Management Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={(newKey) => setApiKey(newKey)}
        onOpenExternalUrl={handleOpenAppUrl}
      />
    </div>
  );
}
