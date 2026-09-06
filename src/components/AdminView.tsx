/**
 * ALCO Hub - Owner / Admin Management Portal
 * Memberikan kendali penuh kepada Owner untuk:
 * 1. Mendaftarkan aplikasi baru & menerbitkannya ke katalog
 * 2. Mengubah status harga (Free / Licensed / Coming Soon)
 * 3. Menerbitkan versi update baru (Update Manager)
 * 4. Generate & Manajemen Lisensi Pengguna
 * 5. Pengaturan Nomor WhatsApp Resmi ALCO
 */

import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Key,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  EcosystemApp,
  PricingType,
  ProductAccent,
  ProductIconName,
  ContactAlcoConfig,
} from '../types';
import {
  generateLicenseKey,
  saveCatalogApps,
  resetCatalogToDefault,
  saveContactConfig,
} from '../services/storeService';
import { ECOSYSTEM_PACKS } from '../config/ecosystemPacks';

interface AdminViewProps {
  apps: EcosystemApp[];
  contactConfig: ContactAlcoConfig;
  onUpdateCatalog: (newApps: EcosystemApp[]) => void;
  onUpdateContactConfig: (newConfig: ContactAlcoConfig) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  apps,
  contactConfig,
  onUpdateCatalog,
  onUpdateContactConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'licenses' | 'updates' | 'contact'>('apps');
  const [isEditing, setIsEditing] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

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
  const [formFeatures, setFormFeatures] = useState('');

  // License Generator State
  const [selectedAppForLicense, setSelectedAppForLicense] = useState(apps[0]?.id || '');
  const [generatedKeys, setGeneratedKeys] = useState<{ appId: string; key: string; date: string }[]>([]);

  // Update Publisher State
  const [selectedAppForUpdate, setSelectedAppForUpdate] = useState(apps[0]?.id || '');
  const [newVersionInput, setNewVersionInput] = useState('');
  const [updateReleaseNotes, setUpdateReleaseNotes] = useState('');
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState('');

  // Contact Form State
  const [waNumber, setWaNumber] = useState(contactConfig.whatsappNumber);
  const [supportEmail, setSupportEmail] = useState(contactConfig.supportEmail);
  const [companyName, setCompanyName] = useState(contactConfig.companyName);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

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
    setFormFeatures('Feature 1\nFeature 2\nFeature 3');
  };

  const handleOpenEditForm = (app: EcosystemApp) => {
    setIsEditing(true);
    setEditingAppId(app.id);
    setFormAppId(app.id);
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
    setFormFeatures((app.features || []).join('\n'));
  };

  const handleSaveApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAppId.trim()) {
      alert('Nama dan App ID wajib diisi.');
      return;
    }

    const featureList = formFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const newAppData: EcosystemApp = {
      id: formAppId.trim().toLowerCase(),
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
      isPublished: true,
      publishedAt: new Date().toISOString().split('T')[0],
      version: formVersion.trim() || '1.0.0',
      latestVersion: formLatestVersion.trim() || '1.0.0',
      releaseNotes: formReleaseNotes.trim(),
      launchMode: formPricingType === 'coming-soon' ? 'disabled' : 'desktop',
      comingSoon: formPricingType === 'coming-soon',
      features: featureList,
    };

    let updatedList: EcosystemApp[];
    if (editingAppId) {
      updatedList = apps.map((a) => (a.id === editingAppId ? newAppData : a));
    } else {
      updatedList = [...apps, newAppData];
    }

    saveCatalogApps(updatedList);
    onUpdateCatalog(updatedList);
    setIsEditing(false);
    showNotification(`Aplikasi "${newAppData.name}" berhasil disimpan dan diterbitkan ke katalog.`);
  };

  const handleDeleteApp = (appId: string) => {
    if (window.confirm('Hapus aplikasi ini dari katalog ALCO Hub?')) {
      const updatedList = apps.filter((a) => a.id !== appId);
      saveCatalogApps(updatedList);
      onUpdateCatalog(updatedList);
      showNotification('Aplikasi berhasil dihapus dari katalog.');
    }
  };

  const handleGenerateKey = () => {
    const key = generateLicenseKey(selectedAppForLicense);
    setGeneratedKeys([
      { appId: selectedAppForLicense, key, date: new Date().toLocaleTimeString() },
      ...generatedKeys,
    ]);
    showNotification(`License key baru dibuat: ${key}`);
  };

  const handlePublishUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput.trim()) {
      alert('Masukkan nomor versi baru (contoh: 1.1.0)');
      return;
    }

    const updatedList = apps.map((app) => {
      if (app.id === selectedAppForUpdate) {
        return {
          ...app,
          latestVersion: newVersionInput.trim(),
          releaseNotes: updateReleaseNotes.trim() || app.releaseNotes,
          downloadUrl: updateDownloadUrl.trim() || app.downloadUrl,
        };
      }
      return app;
    });

    saveCatalogApps(updatedList);
    onUpdateCatalog(updatedList);
    setNewVersionInput('');
    setUpdateReleaseNotes('');
    showNotification(`Versi baru v${newVersionInput} untuk ${selectedAppForUpdate} berhasil dipublish!`);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ContactAlcoConfig = {
      whatsappNumber: waNumber.trim(),
      supportEmail: supportEmail.trim(),
      companyName: companyName.trim(),
      ownerName: contactConfig.ownerName,
    };
    saveContactConfig(updated);
    onUpdateContactConfig(updated);
    showNotification('Konfigurasi kontak resmi ALCO berhasil diperbarui.');
  };

  const handleResetCatalog = () => {
    if (window.confirm('Reset seluruh katalog aplikasi ke setelan bawaan?')) {
      const defaults = resetCatalogToDefault();
      onUpdateCatalog(defaults);
      showNotification('Katalog direset ke default.');
    }
  };

  return (
    <div id="alco-admin-view" className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
              Owner Control Center
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Private App Store & License Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftarkan aplikasi baru, tentukan model lisensi, terbitkan update, dan buat lisensi resmi untuk user.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-tight transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Aplikasi Baru</span>
        </button>
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
            activeTab === 'apps' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          App Management ({apps.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('licenses'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'licenses' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          License Generator
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('updates'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'updates' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Update Publisher
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('contact'); setIsEditing(false); }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'contact' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Contact / WhatsApp Config
        </button>
      </div>

      {/* TAB 1: APP REGISTRATION & MANAGEMENT */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          {isEditing ? (
            /* App Add/Edit Form */
            <form onSubmit={handleSaveApp} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingAppId ? 'Edit Metadata Aplikasi' : 'Daftarkan Aplikasi Baru'}
                </h3>
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
                  <label className="text-xs font-semibold text-slate-300">App ID (Unik)</label>
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
                  <label className="text-xs font-semibold text-slate-300">Nama Singkat (Tombol)</label>
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
                    <option value="custom-pack">Custom / Standalone Pack</option>
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
                      <option value="emerald">Emerald (Ads/Growth)</option>
                      <option value="indigo">Indigo (Intelligence)</option>
                      <option value="rose">Rose (Special)</option>
                    </select>
                    <select
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value as ProductIconName)}
                      className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="target">Target</option>
                      <option value="sparkles">Sparkles</option>
                      <option value="video">Video</option>
                      <option value="trending-up">Trending Up</option>
                      <option value="layout">Layout</option>
                      <option value="search">Search</option>
                      <option value="shield">Shield</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deskripsi Lengkap</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="Jelaskan nilai utama dan manfaat aplikasi untuk bisnis user..."
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {editingAppId ? 'Simpan Perubahan' : 'Terbitkan ke Katalog'}
                </button>
              </div>
            </form>
          ) : (
            /* App Table */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Daftar Aplikasi yang Diterbitkan ({apps.length})</h3>
                <button
                  type="button"
                  onClick={handleResetCatalog}
                  className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Katalog</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {apps.map((app) => (
                  <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{app.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">({app.id})</span>
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
                        Versi: v{app.version} • Harga: {app.priceLabel || 'Free'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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

      {/* TAB 3: UPDATE PUBLISHER */}
      {activeTab === 'updates' && (
        <form onSubmit={handlePublishUpdate} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Terbitkan Versi Baru (Update Publisher)</h3>
            <p className="text-xs text-slate-400">
              Ubah versi terbaru aplikasi. User yang menggunakan aplikasi dengan versi lebih lama akan otomatis menerima status "Update Available".
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
              <label className="text-xs font-semibold text-slate-300">Nomor Versi Terbaru Baru</label>
              <input
                type="text"
                value={newVersionInput}
                onChange={(e) => setNewVersionInput(e.target.value)}
                placeholder="contoh: 1.1.0"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                required
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">URL Unduhan Binary / ZIP (Opsional)</label>
            <input
              type="url"
              value={updateDownloadUrl}
              onChange={(e) => setUpdateDownloadUrl(e.target.value)}
              placeholder="https://github.com/Alco-Releases/alco-app/releases/download/v1.1.0/installer.zip"
              className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-tight shadow-md"
            >
              Publish Update ke Seluruh User
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: CONTACT & WHATSAPP CONFIG */}
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nama Perusahaan / Brand</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Aladzan Corpora"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-tight shadow-md"
            >
              Simpan Konfigurasi Kontak
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
