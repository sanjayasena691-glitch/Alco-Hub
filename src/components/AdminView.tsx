/**
 * ALCO Hub - Owner / Admin Management Portal
 * Centralized Catalog & Distribution Controller for Aladzan Corpora
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  EcosystemApp,
  PricingType,
  ProductAccent,
  ProductIconName,
  ContactAlcoConfig,
  AdminAuthSession,
  SyncMeta,
} from '../types';
import {
  generateLicenseKey,
  saveAppToCloud,
  deleteAppFromCloud,
  togglePublishAppInCloud,
  saveContactConfig,
  ownerSignIn,
  ownerSignOut,
  OwnerAuthStatus,
  resetCatalogToDefault,
} from '../services/storeService';
import {
  testSupabaseConnection,
  saveCustomSupabaseConfig,
  getSupabaseConfig,
} from '../services/supabaseClient';
import { ReleaseManager } from './ReleaseManager';
import { ECOSYSTEM_PACKS } from '../config/ecosystemPacks';

interface AdminViewProps {
  apps: EcosystemApp[];
  contactConfig: ContactAlcoConfig;
  adminSession: AdminAuthSession;
  syncMeta: SyncMeta;
  onRefreshCatalog: () => void;
  onUpdateCatalog: (newApps: EcosystemApp[]) => void;
  onUpdateContactConfig: (newConfig: ContactAlcoConfig) => void;
  onAdminAuthChange: (session: AdminAuthSession) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  apps,
  contactConfig,
  adminSession,
  syncMeta,
  onRefreshCatalog,
  onUpdateCatalog,
  onUpdateContactConfig,
  onAdminAuthChange,
}) => {
  // Navigation & Subtabs
  const [activeTab, setActiveTab] = useState<'apps' | 'releases' | 'licenses' | 'updates' | 'contact' | 'supabase'>('apps');
  const [isEditing, setIsEditing] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authStatus, setAuthStatus] = useState<OwnerAuthStatus | null>(null);

  // Form State for App Registration/Edit
  const [formAppId, setFormAppId] = useState('');
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formFunction, setFormFunction] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPackId, setFormPackId] = useState('core-system');
  const [formAccent, setFormAccent] = useState<ProductAccent>('purple');
  const [formIcon, setFormIcon] = useState<ProductIconName>('target');
  const [formPricingType, setFormPricingType] = useState<PricingType>('licensed');
  const [formPriceLabel, setFormPriceLabel] = useState('Rp 499.000 / Lifetime');
  const [formVersion, setFormVersion] = useState('1.0.0');
  const [formLatestVersion, setFormLatestVersion] = useState('1.0.0');
  const [formReleaseNotes, setFormReleaseNotes] = useState('');
  const [formDownloadUrl, setFormDownloadUrl] = useState('');
  const [formSha256, setFormSha256] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [formFeatures, setFormFeatures] = useState('');

  // License Generator State
  const [selectedAppForLicense, setSelectedAppForLicense] = useState(apps[0]?.id || '');
  const [generatedKeys, setGeneratedKeys] = useState<{ appId: string; key: string; date: string }[]>([]);

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

  // Supabase Runtime Config State
  const currentSupabase = getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(currentSupabase.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(currentSupabase.anonKey);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

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
    setIsEditing(true);
    setEditingAppId(null);
    setFormAppId(`alco-app-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormShortName('');
    setFormFunction('');
    setFormDesc('');
    setFormPackId('core-system');
    setFormAccent('purple');
    setFormIcon('target');
    setFormPricingType('licensed');
    setFormPriceLabel('Rp 499.000 / Lifetime');
    setFormVersion('1.0.0');
    setFormLatestVersion('1.0.0');
    setFormReleaseNotes('Initial release.');
    setFormDownloadUrl('');
    setFormSha256('');
    setFormPublished(true);
    setFormFeatures('Feature 1\nFeature 2\nFeature 3');
  };

  const handleOpenEditForm = (app: EcosystemApp) => {
    setIsEditing(true);
    setEditingAppId(app.id);
    setFormAppId(app.appId || app.id);
    setFormName(app.name);
    setFormShortName(app.shortName);
    setFormFunction(app.functionLabel);
    setFormDesc(app.description);
    setFormPackId(app.packId);
    setFormAccent(app.accent);
    setFormIcon(app.iconName);
    setFormPricingType(app.pricingType);
    setFormPriceLabel(app.priceLabel || '');
    setFormVersion(app.version);
    setFormLatestVersion(app.latestVersion);
    setFormReleaseNotes(app.releaseNotes || '');
    setFormDownloadUrl(app.downloadUrl || '');
    setFormSha256(app.sha256 || '');
    setFormPublished(app.published !== false);
    setFormFeatures((app.features || []).join('\n'));
  };

  const handleSaveApp = async (publishImmediate: boolean) => {
    if (!formName.trim() || !formAppId.trim()) {
      alert('Nama Aplikasi dan App ID wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    const featureList = formFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const isComingSoon = formPricingType === 'coming-soon';

    const newAppData: EcosystemApp = {
      id: formAppId.trim().toLowerCase(),
      appId: formAppId.trim().toLowerCase(),
      name: formName.trim(),
      shortName: formShortName.trim() || formName.trim(),
      functionLabel: formFunction.trim() || 'General ALCO Application',
      description: formDesc.trim(),
      packId: formPackId,
      accent: formAccent,
      iconName: formIcon,
      pricingType: formPricingType,
      priceLabel: formPriceLabel.trim(),
      currency: 'IDR',
      published: publishImmediate,
      publishedAt: new Date().toISOString().split('T')[0],
      version: formVersion.trim() || '1.0.0',
      latestVersion: formLatestVersion.trim() || '1.0.0',
      releaseNotes: formReleaseNotes.trim(),
      downloadUrl: formDownloadUrl.trim() || undefined,
      sha256: formSha256.trim() || undefined,
      launchMode: isComingSoon ? 'disabled' : 'desktop',
      comingSoon: isComingSoon,
      status: isComingSoon ? 'coming-soon' : 'installed',
      features: featureList,
    };

    const res = await saveAppToCloud(newAppData, !editingAppId);
    setIsSubmitting(false);

    if (res.success) {
      let updatedList: EcosystemApp[];
      if (editingAppId) {
        updatedList = apps.map((a) => (a.id === editingAppId ? newAppData : a));
      } else {
        const existingIdx = apps.findIndex((a) => a.id === newAppData.id);
        if (existingIdx >= 0) {
          updatedList = apps.map((a) => (a.id === newAppData.id ? newAppData : a));
        } else {
          updatedList = [...apps, newAppData];
        }
      }
      onUpdateCatalog(updatedList);
      setIsEditing(false);
      showNotification(res.message);
    } else {
      showNotification(res.message);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (window.confirm('Hapus aplikasi ini dari katalog ALCO Hub & Cloud Supabase?')) {
      const res = await deleteAppFromCloud(appId);
      if (res.success) {
        const updatedList = apps.filter((a) => a.id !== appId);
        onUpdateCatalog(updatedList);
        showNotification(res.message);
      } else {
        showNotification(res.message);
      }
    }
  };

  const handleTogglePublish = async (app: EcosystemApp) => {
    const nextPublished = !app.published;
    const res = await togglePublishAppInCloud(app.id, nextPublished);
    if (res.success) {
      const updatedList = apps.map((a) => (a.id === app.id ? { ...a, published: nextPublished } : a));
      onUpdateCatalog(updatedList);
      showNotification(res.message);
    }
  };

  // --------------------------------------------------------------------------
  // LICENSE & UPDATE PUBLISHERS
  // --------------------------------------------------------------------------
  const handleGenerateKey = () => {
    const key = generateLicenseKey(selectedAppForLicense);
    setGeneratedKeys([
      { appId: selectedAppForLicense, key, date: new Date().toLocaleTimeString() },
      ...generatedKeys,
    ]);
    showNotification(`License key resmi dibuat: ${key}`);
  };

  const handlePublishUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput.trim()) {
      alert('Masukkan nomor versi baru (contoh: 1.1.0)');
      return;
    }

    const targetApp = apps.find((a) => a.id === selectedAppForUpdate);
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
      const updatedList = apps.map((a) => (a.id === selectedAppForUpdate ? updatedApp : a));
      onUpdateCatalog(updatedList);
      setNewVersionInput('');
      setUpdateReleaseNotes('');
      setUpdateDownloadUrl('');
      setUpdateSha256('');
      showNotification(`Versi baru v${updatedApp.latestVersion} untuk "${updatedApp.name}" berhasil dipublish ke Supabase!`);
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

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
    showNotification('Konfigurasi Supabase berhasil disimpan.');
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    const result = await testSupabaseConnection();
    setIsTestingConnection(false);
    setConnectionTestResult(result);
  };

  const copySqlSchema = () => {
    const sql = `-- ==============================================================================
-- SKEMA RESMI DATABASE SUPABASE ALCO HUB (Aladzan Corpora)
-- ==============================================================================

-- 1. Tabel Aplikasi (apps)
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    function_label TEXT,
    pack_id TEXT DEFAULT 'core-system',
    pricing_type TEXT NOT NULL DEFAULT 'licensed' CHECK (pricing_type IN ('free', 'licensed', 'coming-soon')),
    price_label TEXT,
    status TEXT DEFAULT 'installed',
    coming_soon BOOLEAN DEFAULT FALSE,
    published BOOLEAN DEFAULT TRUE,
    latest_version TEXT DEFAULT '1.0.0',
    release_notes TEXT,
    download_url TEXT,
    sha256 TEXT,
    accent TEXT DEFAULT 'purple',
    icon_name TEXT DEFAULT 'target',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Kontak Resmi ALCO (alco_contact)
CREATE TABLE IF NOT EXISTS public.alco_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp TEXT,
    email TEXT,
    default_purchase_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Admin Users (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner'
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alco_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 5. Security Policies
CREATE POLICY "Public users can view published apps" ON public.apps 
    FOR SELECT TO anon, authenticated USING (published = true);

CREATE POLICY "Owners have full access to apps" ON public.apps 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Public read alco_contact" ON public.alco_contact 
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners update alco_contact" ON public.alco_contact 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Users can read own admin role" ON public.admin_users 
    FOR SELECT TO authenticated USING (user_id = auth.uid());`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
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
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500 outline-none transition-colors"
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
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-amber-500 outline-none transition-colors"
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
          <p>User publik hanya dapat melihat aplikasi yang berstatus <span className="text-emerald-400 font-semibold">Published</span>. Akses Admin terisolasi melalui Row Level Security (RLS).</p>
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
            Daftarkan aplikasi baru, tentukan model lisensi, kelola rilis GitHub, dan pantau sinkronisasi Supabase.
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
          onClick={() => { setActiveTab('licenses'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'licenses' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          License Generator
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

      {/* TAB 1: APP REGISTRATION & MANAGEMENT */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          {isEditing ? (
            /* Form Add / Edit App */
            <form onSubmit={(e) => { e.preventDefault(); handleSaveApp(formPublished); }} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAppId ? 'Edit Metadata Aplikasi' : 'Daftarkan Aplikasi Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Aplikasi yang disimpan dengan status Diterbitkan otomatis muncul di Store seluruh user.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">App ID / Slug (Unik)</label>
                  <input
                    type="text"
                    value={formAppId}
                    onChange={(e) => setFormAppId(e.target.value)}
                    disabled={Boolean(editingAppId)}
                    placeholder="contoh: alco-lead-finder"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nama Aplikasi</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="contoh: ALCO Lead Finder"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nama Singkat (Tombol / Badge)</label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    placeholder="contoh: Lead Finder"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Fungsi Spesifik (Tagline)</label>
                  <input
                    type="text"
                    value={formFunction}
                    onChange={(e) => setFormFunction(e.target.value)}
                    placeholder="contoh: Automated Prospecting & B2B Leads"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Product Pack</label>
                  <select
                    value={formPackId}
                    onChange={(e) => setFormPackId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {ECOSYSTEM_PACKS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="custom-pack">Custom / Standalone Suite</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Model Lisensi / Distribusi</label>
                  <select
                    value={formPricingType}
                    onChange={(e) => setFormPricingType(e.target.value as PricingType)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="licensed">BERLISENSI (Kunci Akses Diperlukan)</option>
                    <option value="free">GRATIS (Bisa Langsung Digunakan)</option>
                    <option value="coming-soon">COMING SOON (Rilis Masa Depan)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Label Harga</label>
                  <input
                    type="text"
                    value={formPriceLabel}
                    onChange={(e) => setFormPriceLabel(e.target.value)}
                    placeholder="contoh: Rp 499.000 / Lifetime atau FREE"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Aksen Warna & Icon</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formAccent}
                      onChange={(e) => setFormAccent(e.target.value as ProductAccent)}
                      className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="purple">Purple (Creative)</option>
                      <option value="cyan">Cyan (Content)</option>
                      <option value="orange">Orange (Motion)</option>
                      <option value="rose">Rose (Product/Offer)</option>
                      <option value="emerald">Emerald (Ads/Growth)</option>
                      <option value="indigo">Indigo (Intelligence)</option>
                      <option value="teal">Teal (Landing Page)</option>
                    </select>
                    <select
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value as ProductIconName)}
                      className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="target">Target</option>
                      <option value="sparkles">Sparkles</option>
                      <option value="video">Video</option>
                      <option value="package">Package</option>
                      <option value="trending-up">Trending Up</option>
                      <option value="layout">Layout</option>
                      <option value="search">Search</option>
                      <option value="shield">Shield</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Versi Terbaru (Latest Version)</label>
                  <input
                    type="text"
                    value={formLatestVersion}
                    onChange={(e) => setFormLatestVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">GitHub Releases Download URL</label>
                  <input
                    type="url"
                    value={formDownloadUrl}
                    onChange={(e) => setFormDownloadUrl(e.target.value)}
                    placeholder="https://github.com/Alco-Releases/alco-app/releases/download/v1.0.0/app.exe"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">SHA-256 Checksum Hash (GitHub Binary Integrity)</label>
                  <input
                    type="text"
                    value={formSha256}
                    onChange={(e) => setFormSha256(e.target.value)}
                    placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deskripsi Lengkap</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="Jelaskan nilai utama dan manfaat aplikasi untuk bisnis user..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Catatan Rilis (Release Notes)</label>
                <textarea
                  value={formReleaseNotes}
                  onChange={(e) => setFormReleaseNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="Ringkasan fitur rilis versi ini..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Fitur Utama (1 baris per fitur)</label>
                <textarea
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  placeholder="Fitur 1&#10;Fitur 2&#10;Fitur 3"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published-toggle"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="published-toggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Langsung Terbitkan ke User (Published)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveApp(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  >
                    Simpan Draft
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveApp(true)}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                  >
                    {editingAppId ? 'Simpan & Publish' : 'Terbitkan ke Katalog'}
                  </button>
                </div>
              </div>
            </form>
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
                            : app.pricingType === 'licensed'
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : 'bg-slate-800 text-slate-400'
                        }`}>
                          {app.pricingType.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{app.functionLabel}</p>
                      <p className="text-slate-500 text-[11px]">
                        Versi: v{app.latestVersion} • Harga: {app.priceLabel || 'Free'} • Pack: {app.packId}
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LICENSE GENERATOR */}
      {activeTab === 'licenses' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Generator License Key Resmi ALCO</h3>
            <p className="text-xs text-slate-400">
              Buat lisensi resmi yang dapat diberikan kepada pembeli setelah mereka menyelesaikan pembayaran manual via WhatsApp.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedAppForLicense}
              onChange={(e) => setSelectedAppForLicense(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              {apps
                .filter((a) => a.pricingType === 'licensed')
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.priceLabel})</option>
                ))}
            </select>

            <button
              type="button"
              onClick={handleGenerateKey}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
            >
              <Key className="w-4 h-4" />
              <span>Generate License Key Baru</span>
            </button>
          </div>

          {/* Generated Keys List */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Riwayat Lisensi yang Dibuat pada Sesi Ini ({generatedKeys.length})
            </span>

            {generatedKeys.length > 0 ? (
              <div className="space-y-2">
                {generatedKeys.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-slate-400 font-mono text-[11px] block">{item.appId}</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm select-all">{item.key}</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{item.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Belum ada key yang dibuat pada sesi ini.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UPDATE & GITHUB RELEASES PUBLISHER */}
      {activeTab === 'updates' && (
        <form onSubmit={handlePublishUpdate} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Terbitkan Versi Baru & GitHub Releases</h3>
            <p className="text-xs text-slate-400">
              Ubah versi terbaru aplikasi. User yang menggunakan aplikasi dengan versi lebih lama akan otomatis menerima status "Update Available" beserta link installer GitHub.
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
                  <option key={a.id} value={a.id}>
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
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
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

      {/* TAB 4: CONTACT CONFIG */}
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
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
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

      {/* TAB 5: SUPABASE & SQL SETUP HELPER */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSupabaseConfig} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Konfigurasi Supabase Project</h3>
            </div>
            <p className="text-xs text-slate-400">
              Masukkan Supabase Project URL dan Anon Key untuk menghubungkan ALCO Hub ke Database Cloud resmi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Supabase Project URL</label>
                <input
                  type="url"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Supabase Anon / Public Key</label>
                <input
                  type="password"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
              >
                Simpan Konfigurasi
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                <span>Test Koneksi</span>
              </button>
            </div>

            {connectionTestResult && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                connectionTestResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}>
                {connectionTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{connectionTestResult.message}</span>
              </div>
            )}
          </form>

          {/* SQL Schema helper */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Supabase SQL Schema & Row Level Security (RLS)</h3>
              </div>
              <button
                type="button"
                onClick={copySqlSchema}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Eksekusi skrip ini di <strong>Supabase Dashboard &gt; SQL Editor</strong> untuk membuat tabel <code className="text-amber-300">apps</code>, <code className="text-amber-300">alco_contact</code>, dan <code className="text-amber-300">admin_users</code> dengan policy RLS yang aman.
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
{`-- Skrip Schema Resmi Supabase ALCO Hub
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    function_label TEXT,
    pack_id TEXT DEFAULT 'core-system',
    pricing_type TEXT NOT NULL DEFAULT 'licensed' CHECK (pricing_type IN ('free', 'licensed', 'coming-soon')),
    price_label TEXT,
    status TEXT DEFAULT 'installed',
    coming_soon BOOLEAN DEFAULT FALSE,
    published BOOLEAN DEFAULT TRUE,
    latest_version TEXT DEFAULT '1.0.0',
    release_notes TEXT,
    download_url TEXT,
    sha256 TEXT,
    accent TEXT DEFAULT 'purple',
    icon_name TEXT DEFAULT 'target',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alco_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp TEXT,
    email TEXT,
    default_purchase_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner'
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alco_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view published apps" ON public.apps 
    FOR SELECT TO anon, authenticated USING (published = true);

CREATE POLICY "Owners have full access to apps" ON public.apps 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Public read alco_contact" ON public.alco_contact 
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners update alco_contact" ON public.alco_contact 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Users can read own admin role" ON public.admin_users 
    FOR SELECT TO authenticated USING (user_id = auth.uid());`}
            </pre>
          </div>

          {/* Edge Function Deployment Info */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/20 space-y-4">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Supabase Edge Function: <code className="text-indigo-300 font-mono">publish-release</code></h3>
            </div>
            <p className="text-xs text-slate-400">
              Edge Function ini menangani pengunggahan installer <code className="text-slate-300">.exe</code> ke GitHub Releases secara aman menggunakan GitHub Personal Access Token yang disimpan di server secret.
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-2">
              <p className="text-slate-500"># 1. Set GitHub Secret di Supabase CLI atau Dashboard:</p>
              <p className="text-emerald-400">supabase secrets set GITHUB_TOKEN=ghp_yourToken GITHUB_REPO_OWNER=yaladzan92-creator GITHUB_REPO_NAME=Alco-Releases</p>
              <p className="text-slate-500 pt-1"># 2. Deploy Edge Function:</p>
              <p className="text-indigo-300">supabase functions deploy publish-release --no-verify-jwt</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
