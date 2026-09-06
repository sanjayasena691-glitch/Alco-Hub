/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ALCO Hub - Private App Store & Official Distribution Center
 * Ekosistem Software Resmi Aladzan Corpora
 */

import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  ContentEngineUpdateStatus,
  ContentEngineUpdateResult,
  EcosystemApp,
  UserLicense,
  ContactAlcoConfig,
  SyncMeta,
  AdminAuthSession,
} from './types';
import { HUB_META } from './config/ecosystemApps';
import { ECOSYSTEM_PACKS } from './config/ecosystemPacks';
import { getUserApiKey } from './services/aiNavigatorService';
import {
  getCachedApps,
  saveCatalogToCache,
  syncCatalogWithSupabase,
  getSyncMeta,
  getAdminSession,
  getUserLicenses,
  getContactConfig,
  isAppLicensed,
} from './services/storeService';

import { HeaderNav } from './components/HeaderNav';
import { HomeView } from './components/HomeView';
import { AppsView } from './components/AppsView';
import { LibraryView } from './components/LibraryView';
import { PacksView } from './components/PacksView';
import { UpdatesView } from './components/UpdatesView';
import { AdminView } from './components/AdminView';
import { SettingsView } from './components/SettingsView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { LicenseModal } from './components/LicenseModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Store & Licensing States
  const [apps, setApps] = useState<EcosystemApp[]>(getCachedApps());
  const [userLicenses, setUserLicenses] = useState<Record<string, UserLicense>>(getUserLicenses());
  const [contactConfig, setContactConfig] = useState<ContactAlcoConfig>(getContactConfig());
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(getSyncMeta());
  const [adminSession, setAdminSession] = useState<AdminAuthSession>(getAdminSession());
  const [selectedAppForLicense, setSelectedAppForLicense] = useState<EcosystemApp | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Update Checker States
  const [contentEngineUpdate, setContentEngineUpdate] = useState<ContentEngineUpdateResult | null>(null);
  const [contentEngineUpdateStatus, setContentEngineUpdateStatus] = useState<ContentEngineUpdateStatus>('checking');

  // 1. Initial Load: Load local cache immediately, then perform background Supabase catalog sync
  useEffect(() => {
    // Read local states
    setApps(getCachedApps());
    setUserLicenses(getUserLicenses());
    setContactConfig(getContactConfig());
    setSyncMeta(getSyncMeta());
    setAdminSession(getAdminSession());
    setApiKey(getUserApiKey());

    // Background sync catalog with Supabase
    handleCatalogSync(false);
  }, []);

  // 2. Check local binary updates on initial load
  useEffect(() => {
    checkUpdates();
  }, []);

  const handleCatalogSync = async (force: boolean = false) => {
    const res = await syncCatalogWithSupabase({
      force,
      isAdmin: adminSession.isAuthenticated,
    });
    setApps(res.apps);
    setSyncMeta(res.syncMeta);
  };

  const checkUpdates = () => {
    if (!window.alcoHub?.checkContentEngineUpdate) {
      setContentEngineUpdateStatus('unable-to-check');
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
      });
  };

  const handleOpenApp = (app: EcosystemApp) => {
    if (app.comingSoon || app.pricingType === 'coming-soon' || app.status === 'coming-soon') {
      return;
    }

    // License Check
    const hasLicense = isAppLicensed(app, userLicenses);
    if (!hasLicense && app.pricingType === 'licensed') {
      setSelectedAppForLicense(app);
      setIsLicenseModalOpen(true);
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

  const handleRequestLicense = (app: EcosystemApp) => {
    setSelectedAppForLicense(app);
    setIsLicenseModalOpen(true);
  };

  const handlePerformUpdate = (app: EcosystemApp) => {
    // Update local app version in catalog while preserving licenses!
    const updatedApps = apps.map((a) => {
      if (a.id === app.id) {
        return {
          ...a,
          version: a.latestVersion,
        };
      }
      return a;
    });

    saveCatalogToCache(updatedApps);
    setApps(updatedApps);
  };

  const handleLicenseActivated = (appId: string) => {
    setUserLicenses(getUserLicenses());
  };

  const coreApps = apps.filter((a) => a.packId === 'core-system');
  const recentApp = apps.find((a) => a.id === 'content-engine') || apps[0];
  const activeLicensesCount = Object.keys(userLicenses).length;

  return (
    <div id="alco-hub-app" className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Header Navigation Bar */}
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        apiKey={apiKey}
        onRequestApiKey={() => setIsApiKeyModalOpen(true)}
        updateStatus={contentEngineUpdateStatus}
        activeLicensesCount={activeLicensesCount}
      />

      {/* 2. Main Content Canvas */}
      <main id="alco-main-container" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'home' && (
          <HomeView
            coreApps={coreApps}
            packs={ECOSYSTEM_PACKS}
            allApps={apps}
            userLicenses={userLicenses}
            recentApp={recentApp}
            onOpenApp={handleOpenApp}
            onUpdateApp={handlePerformUpdate}
            onRequestLicense={handleRequestLicense}
            onExplorePack={() => setActiveTab('packs')}
            onNavigateTab={(tab) => setActiveTab(tab)}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
            apiKey={apiKey}
            onRequestApiKey={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'store' && (
          <AppsView
            apps={apps}
            packs={ECOSYSTEM_PACKS}
            userLicenses={userLicenses}
            syncMeta={syncMeta}
            onOpenApp={handleOpenApp}
            onUpdateApp={handlePerformUpdate}
            onRequestLicense={handleRequestLicense}
            onSyncCatalog={() => handleCatalogSync(true)}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            apps={apps}
            userLicenses={userLicenses}
            onOpenApp={handleOpenApp}
            onUpdateApp={handlePerformUpdate}
            onRequestLicense={handleRequestLicense}
            onGoToStore={() => setActiveTab('store')}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
          />
        )}

        {activeTab === 'packs' && (
          <PacksView
            packs={ECOSYSTEM_PACKS}
            apps={apps}
            userLicenses={userLicenses}
            onOpenApp={handleOpenApp}
            onUpdateApp={handlePerformUpdate}
            onRequestLicense={handleRequestLicense}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
          />
        )}

        {activeTab === 'updates' && (
          <UpdatesView
            apps={apps}
            userLicenses={userLicenses}
            updateResult={contentEngineUpdate}
            updateStatus={contentEngineUpdateStatus}
            onCheckUpdate={checkUpdates}
            onPerformUpdate={handlePerformUpdate}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            apps={apps}
            contactConfig={contactConfig}
            adminSession={adminSession}
            syncMeta={syncMeta}
            onRefreshCatalog={() => handleCatalogSync(true)}
            onUpdateCatalog={(newApps) => setApps(newApps)}
            onUpdateContactConfig={(newCfg) => setContactConfig(newCfg)}
            onAdminAuthChange={(session) => {
              setAdminSession(session);
              handleCatalogSync(true);
            }}
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

      {/* 5. Official License Activation & Purchase Modal */}
      <LicenseModal
        app={selectedAppForLicense}
        isOpen={isLicenseModalOpen}
        onClose={() => {
          setIsLicenseModalOpen(false);
          setSelectedAppForLicense(null);
        }}
        userLicense={selectedAppForLicense ? userLicenses[selectedAppForLicense.id] : undefined}
        contactConfig={contactConfig}
        onLicenseActivated={handleLicenseActivated}
      />
    </div>
  );
}
