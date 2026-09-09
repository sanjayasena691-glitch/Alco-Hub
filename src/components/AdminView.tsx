/**
 * ALCO Hub - Owner / Admin Management Portal
 * Centralized Catalog & Distribution Controller for Aladzan Corpora
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Key,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Cloud,
  FileCode,
  Copy,
  Check,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UploadCloud,
  Layers,
  Clock,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import {
  EcosystemApp,
  EcosystemPack,
  PricingType,
  ProductAccent,
  ProductIconName,
  ContactAlcoConfig,
  AdminAuthSession,
  SyncMeta,
  BroadcastNotification,
} from '../types';
import {
  saveAppToCloud,
  deleteAppFromCloud,
  togglePublishAppInCloud,
  saveContactConfig,
  ownerSignIn,
  ownerSignOut,
  OwnerAuthStatus,
  resetCatalogToDefault,
  syncProductPacksWithSupabase,
  saveProductPackToCloud,
  getCachedPacks,
} from '../services/storeService';
import { ReleaseManager } from './ReleaseManager';
import { ProductPacksManager } from './admin/ProductPacksManager';
import { NotificationManager } from './admin/NotificationManager';
import { AppRegistrationForm } from './admin/AppRegistrationForm';
import { SqlSchemaViewer } from './admin/SqlSchemaViewer';
import { ECOSYSTEM_PACKS } from '../config/ecosystemPacks';
import { sanitizeAppId } from '../utils/versioning';

interface AdminViewProps {
  apps: EcosystemApp[];
  packs: EcosystemPack[];
  contactConfig: ContactAlcoConfig;
  adminSession: AdminAuthSession;
  syncMeta: SyncMeta;
  notifications?: BroadcastNotification[];
  onRefreshCatalog: () => void;
  onUpdateCatalog: (newApps: EcosystemApp[]) => void;
  onUpdatePacks: (newPacks: EcosystemPack[]) => void;
  onUpdateContactConfig: (newConfig: ContactAlcoConfig) => void;
  onAdminAuthChange: (session: AdminAuthSession) => void;
  onUpdateNotifications?: (updated: BroadcastNotification[]) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  apps,
  packs,
  contactConfig,
  adminSession,
  syncMeta,
  notifications = [],
  onRefreshCatalog,
  onUpdateCatalog,
  onUpdatePacks,
  onUpdateContactConfig,
  onAdminAuthChange,
  onUpdateNotifications = () => {},
}) => {
  // Navigation & Subtabs
  const [activeTab, setActiveTab] = useState<
    'apps' | 'packs' | 'notifications' | 'releases' | 'updates' | 'contact' | 'supabase'
  >('apps');
  const [isEditing, setIsEditing] = useState(false);
  const [editingApp, setEditingApp] = useState<EcosystemApp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authStatus, setAuthStatus] = useState<OwnerAuthStatus | null>(null);

  // Update Publisher State
  const [selectedAppForUpdate, setSelectedAppForUpdate] = useState(apps[0]?.id || '');
  const [newVersionInput, setNewVersionInput] = useState('');
  const [updateReleaseNotes, setUpdateReleaseNotes] = useState('');
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState('');
  const [updateSha256, setUpdateSha256] = useState('');

  // Contact Form State
  const [waNumber, setWaNumber] = useState(contactConfig.whatsappNumber);
  const [supportEmail, setSupportEmail] = useState(contactConfig.supportEmail);
  const [companyName, setCompanyName] = useState(contactConfig.companyName);
  const [defaultMsg, setDefaultMsg] = useState(contactConfig.defaultPurchaseMessage || '');

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch dynamic packs on mount & when admin session is active
  useEffect(() => {
    const loadPacks = async () => {
      const packsData = await syncProductPacksWithSupabase();
      if (packsData && packsData.length > 0) {
        onUpdatePacks(packsData);
      }
    };
    loadPacks();
  }, [adminSession.isAuthenticated]);

  // --------------------------------------------------------------------------
  // AUTH HANDLERS (SUPABASE AUTH + public.admin_users)
  // --------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthStatus('signing-in');
    setIsSubmitting(true);

    const res = await ownerSignIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    setAuthStatus(res.status);

    if (res.success) {
      onAdminAuthChange(res.session);
      onRefreshCatalog();
      showNotification(res.message);
    } else {
      setLoginError(res.message);
    }
  };

  const handleLogout = async () => {
    await ownerSignOut();
    onAdminAuthChange({ isAuthenticated: false, userId: null, email: null, role: 'guest', mode: 'none' });
    onRefreshCatalog();
    showNotification('Anda telah keluar dari Owner Portal.');
  };

  // --------------------------------------------------------------------------
  // APP MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleOpenAddForm = () => {
    setEditingApp(null);
    setIsEditing(true);
  };

  const handleOpenEditForm = (app: EcosystemApp) => {
    setEditingApp(app);
    setIsEditing(true);
  };

  const handleSaveApp = async (appData: EcosystemApp, publishImmediate: boolean) => {
    setIsSubmitting(true);
    const isNew = !editingApp;
    const res = await saveAppToCloud(appData, isNew);
    setIsSubmitting(false);

    if (res.success) {
      let updatedList: EcosystemApp[];
      const targetId = appData.appId || appData.id;
      if (editingApp) {
        updatedList = apps.map((a) => ((a.appId || a.id) === targetId ? appData : a));
      } else {
        const existingIdx = apps.findIndex((a) => (a.appId || a.id) === targetId);
        if (existingIdx >= 0) {
          updatedList = apps.map((a) => ((a.appId || a.id) === targetId ? appData : a));
        } else {
          updatedList = [...apps, appData];
        }
      }
      onUpdateCatalog(updatedList);
      setIsEditing(false);
      setEditingApp(null);
      showNotification(res.message);
    } else {
      showNotification(res.message);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (window.confirm('Hapus aplikasi ini dari katalog ALCO Hub & Cloud Supabase?')) {
      const res = await deleteAppFromCloud(appId);
      if (res.success) {
        const updatedList = apps.filter((a) => a.id !== appId && a.appId !== appId);
        onUpdateCatalog(updatedList);
        showNotification(res.message);
      } else {
        showNotification(res.message);
      }
    }
  };

  const handleTogglePublish = async (app: EcosystemApp) => {
    const nextPublished = !app.published;
    const targetId = app.appId || app.id;
    const res = await togglePublishAppInCloud(targetId, nextPublished);
    if (res.success) {
      const updatedList = apps.map((a) =>
        (a.appId || a.id) === targetId ? { ...a, published: nextPublished } : a
      );
      onUpdateCatalog(updatedList);
      showNotification(res.message);
    } else {
      showNotification(res.message);
    }
  };

  // Quick Pack Creator Callback from App Registration Form
  const handleQuickCreatePack = async (packName: string): Promise<EcosystemPack | null> => {
    const cleanId = sanitizeAppId(packName);
    const newPack: EcosystemPack = {
      id: cleanId,
      name: packName,
      tagline: `Paket produk ${packName}`,
      description: `Koleksi aplikasi ${packName} dalam ekosistem ALCO Hub.`,
      category: 'Ecosystem Pack',
      accent: 'purple',
      badge: 'Starter Pack',
      status: 'active',
      toolCount: 1,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    const res = await saveProductPackToCloud(newPack);
    if (res.success) {
      const updatedPacks = [...packs.filter((p) => p.id !== cleanId), newPack];
      onUpdatePacks(updatedPacks);
      showNotification(`Product Pack "${packName}" berhasil dibuat!`);
      return newPack;
    } else {
      showNotification(`Gagal membuat pack: ${res.message}`);
      return null;
    }
  };

  // --------------------------------------------------------------------------
  // MANUAL UPDATE HANDLERS
  // --------------------------------------------------------------------------
  const handlePublishUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput.trim()) {
      alert('Masukkan nomor versi baru (contoh: 1.1.0)');
      return;
    }

    const targetApp = apps.find((a) => (a.appId || a.id) === selectedAppForUpdate);
    if (!targetApp) return;

    setIsSubmitting(true);
    const updatedApp: EcosystemApp = {
      ...targetApp,
      latestVersion: newVersionInput.trim(),
      releaseNotes: updateReleaseNotes.trim() || targetApp.releaseNotes,
      downloadUrl: updateDownloadUrl.trim() || targetApp.downloadUrl,
      sha256: updateSha256.trim() || targetApp.sha256,
    };

    const res = await saveAppToCloud(updatedApp, false);
    setIsSubmitting(false);

    if (res.success) {
      const updatedList = apps.map((a) =>
        (a.appId || a.id) === selectedAppForUpdate ? updatedApp : a
      );
      onUpdateCatalog(updatedList);
      setNewVersionInput('');
      setUpdateReleaseNotes('');
      setUpdateDownloadUrl('');
      setUpdateSha256('');
      showNotification(`Versi v${updatedApp.latestVersion} untuk "${updatedApp.name}" berhasil disimpan ke Supabase!`);
    } else {
      showNotification(res.message);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updated: ContactAlcoConfig = {
      whatsappNumber: waNumber.trim(),
      supportEmail: supportEmail.trim(),
      companyName: companyName.trim(),
      ownerName: contactConfig.ownerName,
      defaultPurchaseMessage: defaultMsg.trim(),
    };
    const res = await saveContactConfig(updated);
    setIsSubmitting(false);
    onUpdateContactConfig(updated);
    showNotification(res.message);
  };

  // ==========================================================================
  // VIEW: IF NOT AUTHENTICATED -> SHOW OWNER LOGIN SCREEN
  // ==========================================================================
  if (!adminSession.isAuthenticated) {
    return (
      <div id="admin-login-guard" className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Owner Portal</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pusat kendali katalog terpusat Aladzan Corpora. Masuk menggunakan akun Supabase Auth resmi yang terdaftar di <code className="text-amber-300 font-mono">public.admin_users</code>.
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email</label>
            <input
              id="owner-email-input"
              type="email"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                if (loginError) setLoginError('');
              }}
              placeholder="owner@aladzancorpora.com"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500 outline-hidden transition-colors"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input
              id="owner-password-input"
              type="password"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                if (loginError) setLoginError('');
              }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500 outline-hidden transition-colors"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Status Indicator: Signing in... */}
          {authStatus === 'signing-in' && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold">Signing in...</p>
                <p className="text-[11px] text-amber-300/80">Memvalidasi akun Supabase Auth dan tabel admin_users...</p>
              </div>
            </div>
          )}

          {/* Status Indicator: Invalid Credentials */}
          {authStatus === 'invalid-credentials' && loginError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <div>
                <p className="font-bold">Invalid credentials</p>
                <p className="text-[11px] text-rose-300/80">Email atau password yang Anda masukkan tidak sesuai.</p>
              </div>
            </div>
          )}

          {/* Status Indicator: Access Denied */}
          {authStatus === 'access-denied' && loginError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <ShieldX className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-bold">Access denied</p>
                <p className="text-[11px] text-amber-300/80">Akun terdaftar di Supabase Auth, tetapi tidak memiliki role Owner di tabel public.admin_users.</p>
              </div>
            </div>
          )}

          {/* Generic Error */}
          {loginError && authStatus !== 'invalid-credentials' && authStatus !== 'access-denied' && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="text-[11px] leading-relaxed">{loginError}</div>
            </div>
          )}

          <button
            id="owner-signin-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-[11px] text-slate-400">
          <p>
            User publik hanya dapat melihat aplikasi yang berstatus{' '}
            <span className="text-emerald-400 font-semibold">Published</span>. Akses Owner terlindungi oleh Row Level Security (RLS).
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW: AUTHENTICATED ADMIN DASHBOARD
  // ==========================================================================
  return (
    <div id="alco-admin-view" className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
              Owner Control Center
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({adminSession.email || 'Owner Authenticated'})
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Centralized App Store & Distribution Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftarkan aplikasi, kelola Product Packs dinamis, rilis binary GitHub secara otomatis, dan konfigurasi lisensi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefreshCatalog}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            title="Sinkronisasi Ulang Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMeta.status === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Sync Cloud</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aplikasi</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Keluar dari Owner Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => { setActiveTab('apps'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'apps' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Katalog & Drafts ({apps.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('packs'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'packs' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Product Packs ({packs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('notifications'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Broadcast Notifications ({notifications.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('releases'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'releases' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>Release Manager</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('updates'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'updates' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Manual Metadata Updater
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('contact'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'contact' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Kontak Resmi ALCO
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('supabase'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'supabase' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Supabase & SQL
        </button>
      </div>

      {/* TAB: PRODUCT PACKS MANAGER */}
      {activeTab === 'packs' && (
        <ProductPacksManager
          packs={packs}
          apps={apps}
          onPacksUpdated={onUpdatePacks}
          onShowNotification={showNotification}
        />
      )}

      {/* TAB: BROADCAST NOTIFICATIONS MANAGER */}
      {activeTab === 'notifications' && (
        <NotificationManager
          notifications={notifications}
          onNotificationsUpdated={onUpdateNotifications}
          onShowNotification={showNotification}
        />
      )}

      {/* TAB: RELEASE MANAGER */}
      {activeTab === 'releases' && (
        <ReleaseManager
          apps={apps}
          adminSession={adminSession}
          onCatalogUpdated={onUpdateCatalog}
          onNavigateToTab={(tab) => {
            setActiveTab(tab);
            setIsEditing(false);
          }}
        />
      )}

      {/* TAB: APP CATALOG & REGISTRATION */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          {isEditing ? (
            <AppRegistrationForm
              initialApp={editingApp}
              packs={packs}
              isSubmitting={isSubmitting}
              onSaveApp={handleSaveApp}
              onCancel={() => {
                setIsEditing(false);
                setEditingApp(null);
              }}
              onQuickCreatePack={handleQuickCreatePack}
            />
          ) : (
            /* App Table */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Daftar Aplikasi Katalog Terpusat ({apps.length})</h3>
                  <span className="text-xs text-slate-400">
                    • {apps.filter((a) => a.published).length} Published, {apps.filter((a) => !a.published).length} Draft
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset katalog ke 7 aplikasi default Aladzan Corpora?')) {
                      const d = resetCatalogToDefault();
                      onUpdateCatalog(d);
                      showNotification('Katalog direset ke default.');
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Reset Default
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {apps.map((app) => (
                  <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{app.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">({app.appId || app.id})</span>
                        
                        {/* Publish status */}
                        {app.published ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>PUBLISHED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            <span>DRAFT</span>
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.pricingType === 'free'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : app.pricingType === 'trial'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : app.pricingType === 'licensed'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-400'
                        }`}>
                          {app.pricingType.toUpperCase()}
                          {app.pricingType === 'trial' && app.trialDurationDays ? ` (${app.trialDurationDays}D)` : ''}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{app.functionLabel}</p>
                      <p className="text-slate-500 text-[11px]">
                        Versi: v{app.latestVersion} • Harga: {app.priceLabel || 'Free'} • Pack: <span className="text-slate-400 font-semibold">{app.packId}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(app)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                          app.published
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                        title={app.published ? 'Sembunyikan dari user (Jadikan Draft)' : 'Terbitkan ke Store user'}
                      >
                        {app.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{app.published ? 'Unpublish' : 'Publish'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(app)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Hapus Aplikasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: MANUAL UPDATE PUBLISHER */}
      {activeTab === 'updates' && (
        <form onSubmit={handlePublishUpdate} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Terbitkan Versi Baru & GitHub Releases</h3>
            <p className="text-xs text-slate-400">
              Ubah versi terbaru aplikasi secara manual. User yang menggunakan aplikasi dengan versi lebih lama akan otomatis menerima status "Update Available" beserta link installer GitHub.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Pilih Aplikasi Target</label>
              <select
                value={selectedAppForUpdate}
                onChange={(e) => setSelectedAppForUpdate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                {apps.map((a) => (
                  <option key={a.id} value={a.appId || a.id}>
                    {a.name} (v{a.version} / Latest: v{a.latestVersion})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nomor Versi Baru</label>
              <input
                type="text"
                value={newVersionInput}
                onChange={(e) => setNewVersionInput(e.target.value)}
                placeholder="contoh: 1.1.0"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">URL Unduhan GitHub Releases (.exe / .zip)</label>
              <input
                type="url"
                value={updateDownloadUrl}
                onChange={(e) => setUpdateDownloadUrl(e.target.value)}
                placeholder="https://github.com/Alco-Releases/alco-app/releases/download/v1.1.0/installer.exe"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SHA-256 Checksum Hash</label>
              <input
                type="text"
                value={updateSha256}
                onChange={(e) => setUpdateSha256(e.target.value)}
                placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Catatan Rilis (Release Notes)</label>
            <textarea
              value={updateReleaseNotes}
              onChange={(e) => setUpdateReleaseNotes(e.target.value)}
              rows={3}
              placeholder="Jelaskan fitur baru, perbaikan bug, dan optimasi pada update ini..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-tight shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Publish Update ke Supabase Cloud'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: CONTACT CONFIG */}
      {activeTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Konfigurasi Kontak Resmi ALCO</h3>
            <p className="text-xs text-slate-400">
              Nomor WhatsApp dan email ini akan digunakan pada tombol "Minta / Beli Lisensi" di seluruh aplikasi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp Resmi ALCO</label>
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="6281234567890 (Gunakan kode negara 62)"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email Support</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="contact@aladzancorpora.com"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Nama Perusahaan / Brand</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Aladzan Corpora"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Pesan Default Pembelian Lisensi</label>
              <textarea
                value={defaultMsg}
                onChange={(e) => setDefaultMsg(e.target.value)}
                rows={2}
                placeholder="Halo Aladzan Corpora, saya ingin membeli lisensi resmi..."
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-tight shadow-md disabled:opacity-50"
            >
              Simpan Konfigurasi Kontak
            </button>
          </div>
        </form>
      )}

      {/* TAB: SUPABASE & SQL SETUP HELPER */}
      {activeTab === 'supabase' && (
        <SqlSchemaViewer onShowNotification={showNotification} />
      )}
    </div>
  );
};
