/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ALCO Hub - Private App Store & Official Distribution Center
 * Ekosistem Software Resmi Aladzan Corpora
 */

import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  EcosystemApp,
  EcosystemPack,
  ContactAlcoConfig,
  SyncMeta,
  AdminAuthSession,
  AppLocalInstallation,
  AppInstallProgress,
  BroadcastNotification,
} from './types';
import { HUB_META } from './config/ecosystemApps';
import { getUserApiKey } from './services/aiNavigatorService';
import {
  getCachedApps,
  getCachedPacks,
  saveCatalogToCache,
  syncCatalogWithSupabase,
  syncProductPacksWithSupabase,
  getSyncMeta,
  getAdminSession,
  checkAndRestoreOwnerSession,
  getContactConfig,
} from './services/storeService';
import {
  getCachedNotifications,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  syncNotificationsWithSupabase,
} from './services/notificationService';
import {
  checkAllAppsInstallation,
  checkAppInstallation,
  startAppInstallation,
  subscribeToInstallProgress,
  launchDesktopApp,
} from './services/installerService';
import { getSupabase } from './services/supabaseClient';

import { HeaderNav } from './components/HeaderNav';
import { HomeView } from './components/HomeView';
import { AppsView } from './components/AppsView';
import { LibraryView } from './components/LibraryView';
import { PacksView } from './components/PacksView';
import { UpdatesView } from './components/UpdatesView';
import { AdminView } from './components/AdminView';
import { SettingsView } from './components/SettingsView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Store & Catalog States
  const [apps, setApps] = useState<EcosystemApp[]>(getCachedApps());
  const [packs, setPacks] = useState<EcosystemPack[]>(getCachedPacks());
  const [contactConfig, setContactConfig] = useState<ContactAlcoConfig>(getContactConfig());
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(getSyncMeta());
  const [adminSession, setAdminSession] = useState<AdminAuthSession>(getAdminSession());

  // Broadcast Notification States
  const [notifications, setNotifications] = useState<BroadcastNotification[]>(getCachedNotifications());
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(getReadNotificationIds());
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Desktop Local Installations & Progress State
  const [localInstallations, setLocalInstallations] = useState<Record<string, AppLocalInstallation>>({});
  const [installProgressMap, setInstallProgressMap] = useState<Record<string, AppInstallProgress>>({});
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);

  // 1. Initial Load: Restore Owner session from Supabase Auth + admin_users, load cache, then sync Supabase catalog
  useEffect(() => {
    // Read local cache immediately for zero-delay UI rendering
    setApps(getCachedApps());
    setPacks(getCachedPacks());
    setContactConfig(getContactConfig());
    setSyncMeta(getSyncMeta());
    setApiKey(getUserApiKey());

    const initAuthAndCatalog = async () => {
      // Validasi session Owner terhadap Supabase Auth & public.admin_users
      const restored = await checkAndRestoreOwnerSession();
      setAdminSession(restored);

      // Public user hanya menerima published = true, Owner menerima semua draft
      const [catalogRes, syncedPacks, syncedNotifs] = await Promise.all([
        syncCatalogWithSupabase({
          force: false,
          isAdmin: restored.isAuthenticated,
        }),
        syncProductPacksWithSupabase(),
        syncNotificationsWithSupabase(restored.isAuthenticated),
      ]);
      setApps(catalogRes.apps);
      setSyncMeta(catalogRes.syncMeta);
      setPacks(syncedPacks);
      setNotifications(syncedNotifs);
    };

    initAuthAndCatalog();

    // Check installed desktop applications from Electron
    const refreshInstallations = async () => {
      const installed = await checkAllAppsInstallation();
      setLocalInstallations(installed);
    };
    refreshInstallations();

    // Subscribe to real-time installer progress pushed from Electron main process
    const unsubscribeProgress = subscribeToInstallProgress((progress) => {
      setInstallProgressMap((prev) => ({
        ...prev,
        [progress.appId]: progress,
      }));

      // If installer executed or ready, trigger a background poll to detect newly installed executable
      if (progress.status === 'ready-to-install' || progress.status === 'installer-opened') {
        const interval = setInterval(async () => {
          const info = await checkAppInstallation(progress.appId);
          if (info.isInstalled) {
            setLocalInstallations((prev) => ({
              ...prev,
              [progress.appId]: info,
            }));
            setInstallProgressMap((prev) => {
              const copy = { ...prev };
              delete copy[progress.appId];
              return copy;
            });
            clearInterval(interval);
          }
        }, 3000);

        // After 180s of waiting without executable detected, transition to waiting-completion state with Check Again button
        setTimeout(() => {
          clearInterval(interval);
          setInstallProgressMap((prev) => {
            const current = prev[progress.appId];
            if (current && (current.status === 'installer-opened' || current.status === 'ready-to-install')) {
              return {
                ...prev,
                [progress.appId]: {
                  ...current,
                  status: 'waiting-completion',
                  message: 'Menunggu instalasi selesai. Silakan klik Check Again saat setup selesai.',
                },
              };
            }
            return prev;
          });
        }, 180000);
      }
    });

    // Listen to Supabase Auth changes (signOut / token refresh)
    const client = getSupabase();
    let authSub: any = null;
    if (client) {
      const { data } = client.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          const guestSession: AdminAuthSession = {
            isAuthenticated: false,
            userId: null,
            email: null,
            role: 'guest',
            mode: 'none',
          };
          setAdminSession(guestSession);
          // Public user: reload catalog and notifications to hide drafts
          const [catalogRes, syncedPacks, syncedNotifs] = await Promise.all([
            syncCatalogWithSupabase({ force: true, isAdmin: false }),
            syncProductPacksWithSupabase(),
            syncNotificationsWithSupabase(false),
          ]);
          setApps(catalogRes.apps);
          setSyncMeta(catalogRes.syncMeta);
          setPacks(syncedPacks);
          setNotifications(syncedNotifs);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const verified = await checkAndRestoreOwnerSession();
          setAdminSession(verified);
          const [catalogRes, syncedPacks, syncedNotifs] = await Promise.all([
            syncCatalogWithSupabase({ force: true, isAdmin: verified.isAuthenticated }),
            syncProductPacksWithSupabase(),
            syncNotificationsWithSupabase(verified.isAuthenticated),
          ]);
          setApps(catalogRes.apps);
          setSyncMeta(catalogRes.syncMeta);
          setPacks(syncedPacks);
          setNotifications(syncedNotifs);
        }
      });
      authSub = data.subscription;
    }

    return () => {
      authSub?.unsubscribe?.();
      unsubscribeProgress();
    };
  }, []);

  const handleCatalogSync = async (force: boolean = false) => {
    const [catalogRes, syncedPacks, syncedNotifs] = await Promise.all([
      syncCatalogWithSupabase({
        force,
        isAdmin: adminSession.isAuthenticated,
      }),
      syncProductPacksWithSupabase(),
      syncNotificationsWithSupabase(adminSession.isAuthenticated),
    ]);
    setApps(catalogRes.apps);
    setSyncMeta(catalogRes.syncMeta);
    setPacks(syncedPacks);
    setNotifications(syncedNotifs);

    // Refresh installation states
    const installed = await checkAllAppsInstallation();
    setLocalInstallations(installed);
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    await handleCatalogSync(true);
    const installed = await checkAllAppsInstallation();
    setLocalInstallations(installed);
    setIsCheckingUpdates(false);
  };

  const handleInstallApp = async (app: EcosystemApp) => {
    const appId = app.appId || app.id;
    setInstallProgressMap((prev) => ({
      ...prev,
      [appId]: {
        appId,
        status: 'downloading',
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
      },
    }));

    const result = await startAppInstallation(app, (prog) => {
      setInstallProgressMap((prev) => ({
        ...prev,
        [appId]: prog,
      }));
    });

    if (result.success) {
      // Recheck installation after installer execution
      setTimeout(async () => {
        const info = await checkAppInstallation(appId);
        if (info.isInstalled) {
          setLocalInstallations((prev) => ({
            ...prev,
            [appId]: info,
          }));
          setInstallProgressMap((prev) => {
            const copy = { ...prev };
            delete copy[appId];
            return copy;
          });
        }
      }, 5000);
    }
  };

  const handleCheckAppInstallation = async (appId: string): Promise<boolean> => {
    const canonicalId = (appId || '').toLowerCase().trim();
    const info = await checkAppInstallation(canonicalId);
    if (info.isInstalled) {
      setLocalInstallations((prev) => ({
        ...prev,
        [canonicalId]: info,
        [appId]: info,
      }));
      setInstallProgressMap((prev) => {
        const copy = { ...prev };
        delete copy[canonicalId];
        delete copy[appId];
        return copy;
      });
      return true;
    }
    return false;
  };

  const handleOpenApp = (app: EcosystemApp) => {
    if (app.comingSoon || app.pricingType === 'coming-soon' || app.status === 'coming-soon') {
      return;
    }

    const canonicalId = app.appId || app.id;
    const isLocalInstalled = localInstallations[canonicalId]?.isInstalled || localInstallations[app.id]?.isInstalled;

    if (app.launchMode === 'desktop' || isLocalInstalled) {
      launchDesktopApp(canonicalId).then((result) => {
        if (!result.success) {
          if (!window.alcoHub?.openDesktopApp) {
            window.alert(
              `${app.name} desktop memerlukan runtime ALCO Hub Electron di Windows.\n\nJika Anda sedang berada di Preview Google AI Studio, jalankan aplikasi melalui build desktop ALCO Hub.exe.`
            );
          } else {
            window.alert(result.error || `${app.name} tidak dapat dibuka.`);
          }
        }
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

  const handlePerformUpdate = (app: EcosystemApp) => {
    // If installer download exists, trigger installer flow
    if (app.downloadUrl && app.sha256) {
      handleInstallApp(app);
      return;
    }

    // Update local app version in catalog
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

  const coreApps = apps.filter((a) => a.packId === 'core-system');
  const recentApp = apps.find((a) => a.id === 'content-engine') || apps[0];
  const installedCount = (Object.values(localInstallations) as AppLocalInstallation[]).filter((i) => i && i.isInstalled).length;
  const unreadNotificationCount = notifications.filter((n) => {
    if (!n.published) return false;
    if (n.expiresAt && new Date(n.expiresAt).getTime() < Date.now()) return false;
    return !readNotificationIds.includes(n.id);
  }).length;

  const hasAnyUpdate = apps.some((app) => {
    const canonicalId = app.appId || app.id;
    const inst = localInstallations[canonicalId] || localInstallations[app.id];
    return Boolean(inst?.isInstalled && app.latestVersion && inst.version && app.latestVersion !== inst.version);
  });

  return (
    <div id="alco-hub-app" className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-200">
      {/* 1. Header Navigation Bar */}
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        apiKey={apiKey}
        onRequestApiKey={() => setIsApiKeyModalOpen(true)}
        hasUpdateAvailable={hasAnyUpdate}
        installedCount={installedCount}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
      />

      {/* 2. Main Content Canvas */}
      <main id="alco-main-container" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'home' && (
          <HomeView
            coreApps={coreApps}
            packs={packs}
            allApps={apps}
            localInstallations={localInstallations}
            installProgressMap={installProgressMap}
            recentApp={recentApp}
            onOpenApp={handleOpenApp}
            onInstallApp={handleInstallApp}
            onUpdateApp={handlePerformUpdate}
            onCheckInstalled={handleCheckAppInstallation}
            onExplorePack={() => setActiveTab('packs')}
            onNavigateTab={(tab) => setActiveTab(tab)}
            apiKey={apiKey}
            onRequestApiKey={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'store' && (
          <AppsView
            apps={apps}
            packs={packs}
            localInstallations={localInstallations}
            installProgressMap={installProgressMap}
            syncMeta={syncMeta}
            onOpenApp={handleOpenApp}
            onInstallApp={handleInstallApp}
            onUpdateApp={handlePerformUpdate}
            onCheckInstalled={handleCheckAppInstallation}
            onSyncCatalog={() => handleCatalogSync(true)}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            apps={apps}
            localInstallations={localInstallations}
            installProgressMap={installProgressMap}
            onOpenApp={handleOpenApp}
            onInstallApp={handleInstallApp}
            onUpdateApp={handlePerformUpdate}
            onCheckInstalled={handleCheckAppInstallation}
            onGoToStore={() => setActiveTab('store')}
          />
        )}

        {activeTab === 'packs' && (
          <PacksView
            packs={packs}
            apps={apps}
            localInstallations={localInstallations}
            installProgressMap={installProgressMap}
            onOpenApp={handleOpenApp}
            onInstallApp={handleInstallApp}
            onUpdateApp={handlePerformUpdate}
          />
        )}

        {activeTab === 'updates' && (
          <UpdatesView
            apps={apps}
            localInstallations={localInstallations}
            installProgressMap={installProgressMap}
            isCheckingUpdates={isCheckingUpdates}
            onCheckUpdate={handleCheckUpdates}
            onPerformUpdate={handlePerformUpdate}
            onInstallApp={handleInstallApp}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            apps={apps}
            packs={packs}
            contactConfig={contactConfig}
            adminSession={adminSession}
            syncMeta={syncMeta}
            notifications={notifications}
            onRefreshCatalog={() => handleCatalogSync(true)}
            onUpdateCatalog={(newApps) => setApps(newApps)}
            onUpdatePacks={(newPacks) => setPacks(newPacks)}
            onUpdateContactConfig={(newCfg) => setContactConfig(newCfg)}
            onAdminAuthChange={(session) => {
              setAdminSession(session);
              handleCatalogSync(true);
            }}
            onUpdateNotifications={(updated) => setNotifications(updated)}
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
      <footer id="alco-footer" className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 py-6 mt-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">{HUB_META.name}</span>
            <span>•</span>
            <span>{HUB_META.ecosystem}</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">v{HUB_META.version}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-center sm:text-right">
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

      {/* 5. Broadcast Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications.filter((n) => (adminSession.isAuthenticated ? true : n.published))}
        readIds={readNotificationIds}
        onMarkAsRead={(id) => {
          const updated = markNotificationAsRead(id);
          setReadNotificationIds(updated);
        }}
        onMarkAllAsRead={() => {
          const allIds = notifications.map((n) => n.id);
          const updated = markAllNotificationsAsRead(allIds);
          setReadNotificationIds(updated);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsNotificationCenterOpen(false);
        }}
      />
    </div>
  );
}
