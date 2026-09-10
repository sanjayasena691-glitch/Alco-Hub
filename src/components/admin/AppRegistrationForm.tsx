import React, { useState, useEffect, useRef } from 'react';
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
  UploadCloud,
  Loader2,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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
import {
  uploadAppIconToStorage,
  validateIconFile,
  MAX_ICON_SIZE_BYTES,
  BUCKET_APP_ICONS,
} from '../../services/iconStorageService';
import { AppIcon } from '../AppIcon';

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
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const [iconUploadSuccess, setIconUploadSuccess] = useState(false);
  const [showManualIconUrl, setShowManualIconUrl] = useState(Boolean(initialApp?.iconUrl));
  const iconFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAccessModelChange = (model: AccessModel) => {
    setAccessModel(model);
    if (model === 'free') {
      setPriceLabel('FREE');
    } else if (model === 'trial') {
      setPriceLabel(`Trial ${trialDurationDays} Hari`);
    } else if (model === 'coming-soon') {
      setPriceLabel('Segera Rilis');
    } else {
      if (priceLabel === 'FREE' || priceLabel.startsWith('Trial') || priceLabel === 'Segera Rilis') {
        setPriceLabel('Rp 499.000 / Lifetime');
      }
    }
  };

  const handlePackSelectChange = (val: string) => {
    if (val === '__CREATE_NEW_PACK__') {
      setShowQuickPackModal(true);
    } else {
      setPackId(val);
    }
  };

  const handleTriggerUploadIcon = () => {
    const effectiveId = appId.trim() || sanitizeAppId(name);
    if (!effectiveId) {
      setIconUploadError('Isi Nama Aplikasi atau App ID terlebih dahulu sebelum mengunggah icon.');
      return;
    }
    setIconUploadError(null);
    iconFileInputRef.current?.click();
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const effectiveId = appId.trim() || sanitizeAppId(name);
    if (!effectiveId) {
      setIconUploadError('Isi Nama Aplikasi atau App ID terlebih dahulu sebelum mengunggah icon.');
      if (iconFileInputRef.current) iconFileInputRef.current.value = '';
      return;
    }

    const validation = validateIconFile(file);
    if (!validation.valid) {
      setIconUploadError(validation.error || 'Format atau ukuran file icon tidak sesuai.');
      if (iconFileInputRef.current) iconFileInputRef.current.value = '';
      return;
    }

    setIconUploadError(null);
    setIsUploadingIcon(true);
    setIconUploadSuccess(false);

    try {
      const res = await uploadAppIconToStorage(effectiveId, file);
      if (res.success && res.publicUrl) {
        setIconUrl(res.publicUrl);
        setIconUploadSuccess(true);
        setPreviewError(false);
        setTimeout(() => setIconUploadSuccess(false), 5000);
      } else {
        setIconUploadError(res.error || 'Gagal mengunggah icon ke Supabase Storage.');
      }
    } catch (err: any) {
      setIconUploadError(err?.message || 'Terjadi kesalahan sistem saat mengunggah file icon.');
    } finally {
      setIsUploadingIcon(false);
      if (iconFileInputRef.current) {
        iconFileInputRef.current.value = '';
      }
    }
  };

  const handleClearIcon = () => {
    setIconUrl('');
    setIconUploadError(null);
    setIconUploadSuccess(false);
    setPreviewError(false);
    if (iconFileInputRef.current) {
      iconFileInputRef.current.value = '';
    }
  };

  const handleQuickCreatePackSubmit = async (e: React.FormEvent) => {
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
    const cleanFeatures = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const isComingSoon = accessModel === 'coming-soon';
    const appPricingType: PricingType = accessModel as PricingType;

    const payload: EcosystemApp = {
      id: cleanAppId,
      appId: cleanAppId,
      name: name.trim(),
      shortName: shortName.trim() || name.trim(),
      functionLabel: functionLabel.trim() || 'Specialized Tool',
      description: description.trim(),
      packId: packId || 'core-system',
      accent,
      iconName,
      iconUrl: iconUrl.trim() || undefined,
      pricingType: appPricingType,
      accessModel,
      trialDurationDays: accessModel === 'trial' ? trialDurationDays : undefined,
      priceLabel: priceLabel.trim() || (accessModel === 'free' ? 'FREE' : 'Rp 499.000 / Lifetime'),
      currency: 'IDR',
      published: publishImmediate,
      version: isComingSoon ? '0.9.0-beta' : normalizeVersion(version),
      latestVersion: normalizeVersion(latestVersion || version),
      releaseNotes: releaseNotes.trim(),
      downloadUrl: downloadUrl.trim() || undefined,
      sha256: sha256.trim() || undefined,
      features: cleanFeatures,
      launchMode: isComingSoon ? 'disabled' : 'desktop',
      comingSoon: isComingSoon,
      status: isComingSoon ? 'coming-soon' : 'installed',
      updatedAt: new Date().toISOString(),
    };

    onSaveApp(payload, publishImmediate);
  };

  return (
    <div id="app-registration-container" className="space-y-6">
      {/* Quick Add Pack Modal */}
      {showQuickPackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleQuickCreatePackSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Buat Product Pack Cepat</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Masukkan nama kelompok produk. Pack akan otomatis dibuat di katalog Supabase Cloud.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Pack Baru</label>
              <input
                type="text"
                value={quickPackName}
                onChange={(e) => setQuickPackName(e.target.value)}
                placeholder="contoh: Meta Ads Starter Pack"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickPackModal(false)}
                className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm dark:shadow-xl transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? `Edit Metadata Aplikasi: ${initialApp?.name}` : 'Daftarkan Aplikasi Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Isi data produk di bawah. Non-teknikal founder dapat mengonfigurasi kelompok produk, model akses/lisensi, dan versi dengan mudah.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Batal
          </button>
        </div>

        {/* Section 1: Informasi Dasar Produk */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            1. Informasi Dasar Produk
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Aplikasi</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="contoh: ALCO Lead Finder"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>App ID (Identitas Permanen)</span>
                {isEditing && (
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 font-normal flex items-center gap-1">
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
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Singkat (Tombol / Badge)</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="contoh: Lead Finder"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fungsi Spesifik / Tagline</label>
              <input
                type="text"
                value={functionLabel}
                onChange={(e) => setFunctionLabel(e.target.value)}
                placeholder="contoh: Automated Prospecting & B2B Leads"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Product Pack (Kelompok Produk)</span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">Dinamis dari Supabase</span>
              </label>
              <select
                value={packId}
                onChange={(e) => handlePackSelectChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category || 'Pack'}) • {p.status === 'active' ? 'Aktif' : 'Coming Soon'}
                  </option>
                ))}
                <option value="__CREATE_NEW_PACK__" className="text-purple-600 dark:text-purple-400 font-bold">
                  + Tambah Product Pack Baru...
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Model Akses & Lisensi */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            2. Model Akses & Lisensi (Commercial Model)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model Akses</label>
              <select
                value={accessModel}
                onChange={(e) => handleAccessModelChange(e.target.value as AccessModel)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="licensed">BERLISENSI (Kunci Akses Diperlukan)</option>
                <option value="free">GRATIS (Bisa Langsung Digunakan)</option>
                <option value="trial">TRIAL LICENSE (Masa Percobaan)</option>
                <option value="coming-soon">COMING SOON (Rilis Masa Depan)</option>
              </select>
            </div>

            {accessModel === 'trial' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Durasi Trial (Hari)</label>
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="14"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Label Harga di Store</label>
              <input
                type="text"
                value={priceLabel}
                onChange={(e) => setPriceLabel(e.target.value)}
                placeholder="contoh: Rp 499.000 / Lifetime"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visual & Desain */}
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              3. Identitas Visual (Icon Resmi, Aksen Warna & Simbol)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Supabase Catalog Source of Truth
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aksen Warna Kartu</label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value as ProductAccent)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="purple">Purple (Executive / Strategy)</option>
                <option value="emerald">Emerald (Growth / Marketing)</option>
                <option value="cyan">Cyan (Content / Video)</option>
                <option value="orange">Orange (Motion / Creative)</option>
                <option value="rose">Rose (Offer / Sales)</option>
                <option value="indigo">Indigo (Intelligence / Analytics)</option>
                <option value="teal">Teal (Landing Page / Web)</option>
                <option value="amber">Amber (Automation / Tools)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Icon Simbol (Fallback Lucide)</label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value as ProductIconName)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
          </div>

          {/* Official App Icon Card (Supabase Storage Direct Upload + Preview) */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Official Application Icon</span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-1.5 py-0.2 rounded">
                      Supabase Storage: {BUCKET_APP_ICONS}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Unggah icon resmi aplikasi (PNG / WEBP, maks. 2 MB) langsung ke cloud storage ALCO.
                  </p>
                </div>
              </div>

              {/* Upload & Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Hidden Native File Input */}
                <input
                  ref={iconFileInputRef}
                  type="file"
                  accept=".png,.webp,image/png,image/webp"
                  onChange={handleIconFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleTriggerUploadIcon}
                  disabled={isUploadingIcon}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUploadingIcon ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{iconUrl ? 'Ganti Icon' : 'Upload Icon'}</span>
                    </>
                  )}
                </button>

                {iconUrl && (
                  <button
                    type="button"
                    onClick={handleClearIcon}
                    title="Hapus icon kustom dan gunakan simbol fallback"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowManualIconUrl(!showManualIconUrl)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manual URL</span>
                  {showManualIconUrl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Error & Success Feedback Alerts */}
            {iconUploadError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold block">Gagal Mengunggah Icon</span>
                  <span>{iconUploadError}</span>
                </div>
              </div>
            )}

            {iconUploadSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Icon berhasil diunggah ke Supabase Storage & tersambung ke aplikasi!</span>
              </div>
            )}

            {/* Live Icon Preview & Info Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <AppIcon
                  iconUrl={iconUrl}
                  iconName={iconName}
                  name={name || 'App Icon'}
                  className="w-full h-full object-contain p-2"
                  iconClassName="w-7 h-7 text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {name || 'Nama Aplikasi'}
                  </span>
                  {iconUrl && !previewError ? (
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Official Storage Icon Aktif</span>
                    </span>
                  ) : iconUrl && previewError ? (
                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>URL Gagal Dimuat (Fallback Simbol Aktif)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                      Fallback Lucide: {iconName}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {iconUrl ? (
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {iconUrl}
                    </span>
                  ) : (
                    <span>Belum ada icon resmi yang diunggah. Klik tombol "Upload Icon" di atas.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Manual URL Input (Collapsible / Advanced Mode) */}
            {showManualIconUrl && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Manual Icon URL (CDN / Custom Storage)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Opsional • Terisi otomatis setelah upload</span>
                </label>
                <input
                  type="url"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="https://...supabase.co/storage/v1/object/public/app-icons/..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Deskripsi & Fitur */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            4. Deskripsi & Fitur Utama
          </span>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deskripsi Lengkap</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:border-indigo-500"
                placeholder="Jelaskan manfaat utama dan hasil nyata yang didapatkan user..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fitur Utama (1 baris per poin)</label>
              <textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                placeholder="Fitur 1&#10;Fitur 2&#10;Fitur 3"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published-checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="published-checkbox" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Langsung Terbitkan ke User (Published di Store)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50 transition-colors"
            >
              Simpan Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan & Publish' : 'Terbitkan ke Katalog'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
