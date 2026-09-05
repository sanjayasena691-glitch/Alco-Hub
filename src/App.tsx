/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ALCO Hub - Ecosystem Launcher & Product Library
 */

import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  ContentEngineUpdateStatus,
  ContentEngineUpdateResult,
  EcosystemApp,
  EcosystemPack,
} from './types';
import { ECOSYSTEM_APPS, HUB_META } from './config/ecosystemApps';
import { ECOSYSTEM_PACKS } from './config/ecosystemPacks';
import { getUserApiKey } from './services/aiNavigatorService';

import { HeaderNav } from './components/HeaderNav';
import { HomeView } from './components/HomeView';
import { AppsView } from './components/AppsView';
import { PacksView } from './components/PacksView';
import { UpdatesView } from './components/UpdatesView';
import { SettingsView } from './components/SettingsView';
import { ApiKeyModal } from './components/ApiKeyModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Update Checker States
  const [contentEngineUpdate, setContentEngineUpdate] = useState<ContentEngineUpdateResult | null>(null);
  const [contentEngineUpdateStatus, setContentEngineUpdateStatus] = useState<ContentEngineUpdateStatus>('checking');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Load API Key on initial mount
  useEffect(() => {
    const key = getUserApiKey();
    setApiKey(key);
  }, []);

  // Check update on initial load
  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = () => {
    setIsCheckingUpdate(true);
    if (!window.alcoHub?.checkContentEngineUpdate) {
      setContentEngineUpdateStatus('unable-to-check');
      setIsCheckingUpdate(false);
      return;
    }

    window.alcoHub
      .checkContentEngineUpdate()
      .then((result) => {
        setContentEngineUpdate(result);
        setContentEngineUpdateStatus(result.status || 'unable-to-check');
      })
      .catch((err) => {
        console.warn('Update check failed:', err);
        setContentEngineUpdateStatus('unable-to-check');
      })
      .finally(() => {
        setIsCheckingUpdate(false);
      });
  };

  const handleOpenApp = (app: EcosystemApp) => {
    if (app.comingSoon || app.status === 'coming-soon') {
      return;
    }

    if (app.launchMode === 'desktop') {
      if (!window.alcoHub?.openDesktopApp) {
        window.alert(
          `${app.name} desktop memerlukan runtime ALCO Hub Electron di Windows.\n\nJika Anda sedang berada di Preview Google AI Studio, jalankan aplikasi melalui build desktop ALCO Hub.exe.`
        );
        return;
      }

      window.alcoHub
        .openDesktopApp(app.id)
        .then((result) => {
          if (!result.success) {
            window.alert(result.error || `${app.name} tidak dapat dibuka.`);
          }
        })
        .catch(() => {
          window.alert(`${app.name} tidak dapat dibuka.`);
        });
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

  const handleUpdateApp = (app: EcosystemApp) => {
    if (app.id === 'content-engine') {
      const latestVer = contentEngineUpdate?.latestVersion || contentEngineUpdate?.registry?.latestVersion || '0.1.1';
      window.alert(
        `Update v${latestVer} tersedia untuk ${app.name}.\n\nInstaller otomatis akan diluncurkan pada rilis Stage 2. Untuk saat ini silakan unduh versi terbaru dari GitHub Releases.`
      );
    } else {
      window.alert(`Pengecekan update untuk ${app.name} belum tersedia di registry saat ini.`);
    }
  };

  const handleExplorePack = (pack: EcosystemPack) => {
    setActiveTab('packs');
  };

  const coreApps = ECOSYSTEM_APPS.filter((a) => a.packId === 'core-system');
  const recentApp = ECOSYSTEM_APPS.find((a) => a.id === 'content-engine');

  return (
    <div id="alco-hub-app" className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Header Navigation Bar */}
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        apiKey={apiKey}
        onRequestApiKey={() => setIsApiKeyModalOpen(true)}
        updateStatus={contentEngineUpdateStatus}
      />

      {/* 2. Main Content Canvas */}
      <main id="alco-main-container" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'home' && (
          <HomeView
            coreApps={coreApps}
            packs={ECOSYSTEM_PACKS}
            allApps={ECOSYSTEM_APPS}
            recentApp={recentApp}
            onOpenApp={handleOpenApp}
            onUpdateApp={handleUpdateApp}
            onExplorePack={handleExplorePack}
            onNavigateTab={(tab) => setActiveTab(tab)}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
            apiKey={apiKey}
            onRequestApiKey={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'apps' && (
          <AppsView
            apps={ECOSYSTEM_APPS}
            packs={ECOSYSTEM_PACKS}
            onOpenApp={handleOpenApp}
            onUpdateApp={handleUpdateApp}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
          />
        )}

        {activeTab === 'packs' && (
          <PacksView
            packs={ECOSYSTEM_PACKS}
            apps={ECOSYSTEM_APPS}
            onOpenApp={handleOpenApp}
            onUpdateApp={handleUpdateApp}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
          />
        )}

        {activeTab === 'updates' && (
          <UpdatesView
            apps={ECOSYSTEM_APPS}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
            onRefreshUpdates={checkUpdates}
            onUpdateApp={handleUpdateApp}
            isChecking={isCheckingUpdate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            apiKey={apiKey}
            onApiKeyChange={(newKey) => setApiKey(newKey)}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onOpenExternalUrl={(url) => {
              if (window.alcoHub?.openExternal) window.alcoHub.openExternal(url);
              else window.open(url, '_blank', 'noopener,noreferrer');
            }}
          />
        )}
      </main>

      {/* 3. Control Center Footer */}
      <footer id="alco-footer" className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">{HUB_META.name}</span>
            <span>•</span>
            <span>{HUB_META.ecosystem}</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">v{HUB_META.version}</span>
          </div>
          <p className="text-slate-400 text-center sm:text-right">
            {HUB_META.principles}
          </p>
        </div>
      </footer>

      {/* 4. Gemini API Key Management Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={(newKey) => setApiKey(newKey)}
        onOpenExternalUrl={(url) => {
          if (window.alcoHub?.openExternal) window.alcoHub.openExternal(url);
          else window.open(url, '_blank', 'noopener,noreferrer');
        }}
      />
    </div>
  );
}
