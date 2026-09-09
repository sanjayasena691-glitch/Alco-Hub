import React, { useState, useEffect } from 'react';
import {
  Plus,
  Lock,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag,
  Wand2,
  Image as ImageIcon,
  Target,
  Video,
  Package,
  TrendingUp,
  Layout,
  Search,
} from 'lucide-react';
import {
  EcosystemApp,
  EcosystemPack,
  PricingType,
  AccessModel,
  ProductAccent,
  ProductIconName,
} from '../../types';
import { sanitizeAppId, normalizeVersion } from '../../utils/versioning';

interface AppRegistrationFormProps {
  initialApp?: EcosystemApp | null;
  packs: EcosystemPack[];
  isSubmitting: boolean;
  onSaveApp: (appData: EcosystemApp, publishImmediate: boolean) => Promise<void>;
  onCancel: () => void;
  onQuickCreatePack: (packName: string) => Promise<EcosystemPack | null>;
}

export const AppRegistrationForm: React.FC<AppRegistrationFormProps> = ({
  initialApp,
  packs,
  isSubmitting,
  onSaveApp,
  onCancel,
  onQuickCreatePack,
}) => {
  const isEditing = Boolean(initialApp);

  // Form State
  const [appId, setAppId] = useState(initialApp?.appId || initialApp?.id || '');
  const [name, setName] = useState(initialApp?.name || '');
  const [shortName, setShortName] = useState(initialApp?.shortName || '');
  const [functionLabel, setFunctionLabel] = useState(initialApp?.functionLabel || '');
  const [description, setDescription] = useState(initialApp?.description || '');
  const [packId, setPackId] = useState(initialApp?.packId || packs[0]?.id || 'core-system');
  const [accent, setAccent] = useState<ProductAccent>(initialApp?.accent || 'purple');
  const [iconName, setIconName] = useState<ProductIconName>(initialApp?.iconName || 'target');
  const [iconUrl, setIconUrl] = useState(initialApp?.iconUrl || '');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [iconUrl]);
  
  // Commercial & Access Model
  const [accessModel, setAccessModel] = useState<AccessModel>(
    initialApp?.accessModel || (initialApp?.pricingType as AccessModel) || 'licensed'
  );
  const [trialDurationDays, setTrialDurationDays] = useState<number>(
    initialApp?.trialDurationDays || 14
  );
  const [priceLabel, setPriceLabel] = useState(
    initialApp?.priceLabel || 'Rp 499.000 / Lifetime'
  );

  // Version & Release info
  const [version, setVersion] = useState(initialApp?.version || '1.0.0');
  const [latestVersion, setLatestVersion] = useState(initialApp?.latestVersion || '1.0.0');
  const [releaseNotes, setReleaseNotes] = useState(initialApp?.releaseNotes || 'Initial release.');
  const [downloadUrl, setDownloadUrl] = useState(initialApp?.downloadUrl || '');
  const [sha256, setSha256] = useState(initialApp?.sha256 || '');
  const [published, setPublished] = useState(initialApp?.published !== false);
  const [featuresText, setFeaturesText] = useState(
    (initialApp?.features || ['Feature 1', 'Feature 2', 'Feature 3']).join('\n')
  );

  // Quick Pack Modal
  const [showQuickPackModal, setShowQuickPackModal] = useState(false);
  const [quickPackName, setQuickPackName] = useState('');
  const [isCreatingQuickPack, setIsCreatingQuickPack] = useState(false);

  // Auto-generate App ID saat nama diketik jika pendaftaran baru
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setAppId(sanitizeAppId(val));
    }
  };

  // Sync pricingType & priceLabel saat accessModel berubah
  const handleAccessModelChange = (model: AccessModel) => {
    setAccessModel(model);
    if (model === 'free') {
      setPriceLabel('FREE');
    } else if (model === 'trial') {
      setPriceLabel(`Trial ${trialDurationDays} Hari`);
    } else if (model === 'licensed' && (!priceLabel || priceLabel === 'FREE')) {
      setPriceLabel('Rp 499.000 / Lifetime');
    } else if (model === 'coming-soon') {
      setPriceLabel('Coming Soon');
    }
  };

  // Quick Pack Select Handler
  const handlePackSelectChange = (val: string) => {
    if (val === '__CREATE_NEW_PACK__') {
      setShowQuickPackModal(true);
    } else {
      setPackId(val);
    }
  };

  const handleCreateQuickPackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPackName.trim()) return;
    setIsCreatingQuickPack(true);
    const newPack = await onQuickCreatePack(quickPackName.trim());
    setIsCreatingQuickPack(false);
    if (newPack) {
      setPackId(newPack.id);
      setShowQuickPackModal(false);
      setQuickPackName('');
    }
  };

  const handleSubmit = (publishImmediate: boolean) => {
    if (!name.trim() || !appId.trim()) {
      alert('Nama Aplikasi dan App ID wajib diisi.');
      return;
    }

    const cleanAppId = sanitizeAppId(appId);
    const featureList = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const isComingSoon = accessModel === 'coming-soon';

    const finalAppData: EcosystemApp = {
      id: cleanAppId,
      appId: cleanAppId,
      name: name.trim(),
      shortName: shortName.trim() || name.trim(),
      functionLabel: functionLabel.trim() || 'General ALCO Application',
      description: description.trim(),
      packId: packId,
      accent: accent,
      iconName: iconName,
      iconUrl: iconUrl.trim() || undefined,
      pricingType: accessModel as PricingType,
      accessModel: accessModel,
      trialDurationDays: accessModel === 'trial' ? Number(trialDurationDays) || 14 : undefined,
      priceLabel: priceLabel.trim() || (accessModel === 'free' ? 'FREE' : 'Rp 499.000 / Lifetime'),
      published: publishImmediate,
      version: normalizeVersion(version) || '1.0.0',
      latestVersion: normalizeVersion(latestVersion) || '1.0.0',
      releaseNotes: releaseNotes.trim(),
      downloadUrl: downloadUrl.trim() || undefined,
      sha256: sha256.trim() || undefined,
      launchMode: isComingSoon ? 'disabled' : 'desktop',
      comingSoon: isComingSoon,
      status: isComingSoon ? 'coming-soon' : 'installed',
      features: featureList,
    };

    onSaveApp(finalAppData, publishImmediate);
  };

  return (
    <div id="app-registration-form-wrapper" className="space-y-6">
      {/* Quick Pack Creation Modal */}
      {showQuickPackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuickPackSubmit}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Tambah Product Pack Baru</h3>
            </div>
            <p className="text-xs text-slate-400">
              Buat kelompok produk baru untuk mengelompokkan aplikasi ini di Store ALCO Hub.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nama Pack</label>
              <input
                type="text"
                value={quickPackName}
                onChange={(e) => setQuickPackName(e.target.value)}
                placeholder="contoh: Meta Ads Starter Pack"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickPackModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingQuickPack || !quickPackName.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isCreatingQuickPack ? 'Membuat...' : 'Buat Pack'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Registration Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(published);
        }}
        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? `Edit Metadata Aplikasi: ${initialApp?.name}` : 'Daftarkan Aplikasi Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              Isi data produk di bawah. Non-teknikal founder dapat mengonfigurasi kelompok produk, model akses/lisensi, dan versi dengan mudah.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white"
          >
            Batal
          </button>
        </div>

        {/* Section 1: Informasi Dasar Produk */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
            1. Informasi Dasar Produk
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nama Aplikasi</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="contoh: ALCO Lead Finder"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>App ID (Identitas Permanen)</span>
                {isEditing && (
                  <span className="text-[10px] text-amber-400 font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Terkunci untuk integritas rilis
                  </span>
                )}
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(sanitizeAppId(e.target.value))}
                disabled={isEditing}
                placeholder="contoh: alco-lead-finder"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nama Singkat (Tombol / Badge)</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="contoh: Lead Finder"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Fungsi Spesifik / Tagline</label>
              <input
                type="text"
                value={functionLabel}
                onChange={(e) => setFunctionLabel(e.target.value)}
                placeholder="contoh: Automated Prospecting & B2B Leads"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Product Pack (Kelompok Produk)</span>
                <span className="text-[11px] text-purple-400">Dinamis dari Supabase</span>
              </label>
              <select
                value={packId}
                onChange={(e) => handlePackSelectChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category || 'Pack'}) • {p.status === 'active' ? 'Aktif' : 'Coming Soon'}
                  </option>
                ))}
                <option value="__CREATE_NEW_PACK__" className="text-purple-400 font-bold">
                  + Tambah Product Pack Baru...
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Model Akses & Lisensi */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
            2. Model Akses & Lisensi (Commercial Model)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Model Akses</label>
              <select
                value={accessModel}
                onChange={(e) => handleAccessModelChange(e.target.value as AccessModel)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="licensed">BERLISENSI (Kunci Akses Diperlukan)</option>
                <option value="free">GRATIS (Bisa Langsung Digunakan)</option>
                <option value="trial">TRIAL LICENSE (Masa Percobaan)</option>
                <option value="coming-soon">COMING SOON (Rilis Masa Depan)</option>
              </select>
            </div>

            {accessModel === 'trial' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Durasi Trial (Hari)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={trialDurationDays}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setTrialDurationDays(d);
                    setPriceLabel(`Trial ${d} Hari`);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  placeholder="14"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Label Harga di Store</label>
              <input
                type="text"
                value={priceLabel}
                onChange={(e) => setPriceLabel(e.target.value)}
                placeholder="contoh: Rp 499.000 / Lifetime"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visual & Desain */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
              3. Identitas Visual (Icon Resmi, Aksen Warna & Simbol)
            </span>
            <span className="text-[11px] text-slate-400">
              Supabase Catalog Source of Truth
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Aksen Warna Kartu</label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value as ProductAccent)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="purple">Purple (Executive / Strategy)</option>
                <option value="emerald">Emerald (Growth / Marketing)</option>
                <option value="cyan">Cyan (Content / Video)</option>
                <option value="orange">Orange (Motion / Creative)</option>
                <option value="rose">Rose (Offer / Sales)</option>
                <option value="indigo">Indigo (Intelligence / Analytics)</option>
                <option value="teal">Teal (Landing Page / Web)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Icon Simbol (Fallback Lucide)</label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value as ProductIconName)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="target">Target (Direct Response)</option>
                <option value="sparkles">Sparkles (AI & Automation)</option>
                <option value="video">Video (Content Production)</option>
                <option value="package">Package (Suite & Tools)</option>
                <option value="trending-up">Trending Up (Growth & Ads)</option>
                <option value="layout">Layout (Design & Structure)</option>
                <option value="search">Search (Research & Audit)</option>
                <option value="shield">Shield (Security & Core)</option>
              </select>
            </div>

            {/* Official Icon URL input */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Official Application Icon URL (PNG / SVG / WebP)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  CDN / GitHub raw / Supabase Storage URL
                </span>
              </label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="contoh: https://raw.githubusercontent.com/.../icon.png atau https://...supabase.co/storage/v1/..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Icon resmi yang akan tampil di kartu aplikasi, Store, dan Library ALCO Hub. Jika kosong atau gagal dimuat, sistem otomatis fallback ke icon simbol Lucide.
              </p>
            </div>
          </div>

          {/* Live Icon Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
              {iconUrl && !previewError ? (
                <img
                  src={iconUrl}
                  alt="App Icon Preview"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <div className="text-indigo-400">
                  {iconName === 'target' && <Target className="w-6 h-6" />}
                  {iconName === 'sparkles' && <Sparkles className="w-6 h-6" />}
                  {iconName === 'video' && <Video className="w-6 h-6" />}
                  {iconName === 'package' && <Package className="w-6 h-6" />}
                  {iconName === 'trending-up' && <TrendingUp className="w-6 h-6" />}
                  {iconName === 'layout' && <Layout className="w-6 h-6" />}
                  {iconName === 'search' && <Search className="w-6 h-6" />}
                  {iconName === 'shield' && <ShieldCheck className="w-6 h-6" />}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Pratinjau Icon Aplikasi</span>
                {iconUrl && !previewError ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Official Icon Valid
                  </span>
                ) : iconUrl && previewError ? (
                  <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                    Gagal Dimuat (Fallback Aktif)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Default Lucide Icon
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {name || 'Nama Aplikasi'} • Aksen: <span className="capitalize text-slate-300 font-medium">{accent}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Deskripsi & Fitur */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
            4. Deskripsi & Fitur Utama
          </span>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Deskripsi Lengkap</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white leading-relaxed"
                placeholder="Jelaskan manfaat utama dan hasil nyata yang didapatkan user..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Fitur Utama (1 baris per poin)</label>
              <textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono leading-relaxed"
                placeholder="Fitur 1&#10;Fitur 2&#10;Fitur 3"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published-checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="published-checkbox" className="text-xs text-slate-300 font-medium cursor-pointer">
              Langsung Terbitkan ke User (Published di Store)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-50"
            >
              Simpan Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan & Publish' : 'Terbitkan ke Katalog'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
