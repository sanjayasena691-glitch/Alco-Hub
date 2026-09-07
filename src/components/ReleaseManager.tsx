/**
 * ALCO Hub - Release Manager Component (Direct GitHub Releases & Supabase Architecture)
 * 
 * Antarmuka resmi Owner Portal untuk mengunggah installer (.exe) langsung ke GitHub Releases
 * dan memperbarui metadata katalog Supabase tanpa melalui Edge Function (Mencegah Limit Memori HTTP 546).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Wand2,
  Key,
  Terminal,
  Settings2,
  Lock,
  Eye,
  EyeOff,
  Github,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  EcosystemApp,
  ReleaseUploadProgress,
  AdminAuthSession,
} from '../types';
import {
  uploadAndPublishRelease,
  calculateFileSha256,
  getGitHubPublishConfig,
  saveGitHubPublishConfig,
  clearGitHubPublishConfig,
  generateGhCliCommand,
  GitHubPublishConfig,
  DEFAULT_GITHUB_REPO_OWNER,
  DEFAULT_GITHUB_REPO_NAME,
} from '../services/releaseService';
import {
  suggestNextVersion,
  bumpPatch,
  bumpMinor,
  bumpMajor,
  generateGitHubTag,
  normalizeVersion,
  compareSemver,
} from '../utils/versioning';

interface ReleaseManagerProps {
  apps: EcosystemApp[];
  adminSession: AdminAuthSession;
  onCatalogUpdated: (newApps: EcosystemApp[]) => void;
  onNavigateToTab?: (tab: 'apps') => void;
}

export const ReleaseManager: React.FC<ReleaseManagerProps> = ({
  apps,
  adminSession,
  onCatalogUpdated,
  onNavigateToTab,
}) => {
  // Mode Tab: In-App Direct Upload vs Terminal CLI Script
  const [publishMode, setPublishMode] = useState<'direct' | 'cli'>('direct');

  // GitHub Config State (Owner Session)
  const [ghConfig, setGhConfig] = useState<GitHubPublishConfig>(getGitHubPublishConfig);
  const [showGhToken, setShowGhToken] = useState(false);
  const [showGhSettings, setShowGhSettings] = useState(!ghConfig.token);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Selection & Input States
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.appId || apps[0]?.id || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionInput, setVersionInput] = useState<string>('');
  const [releaseNotesInput, setReleaseNotesInput] = useState<string>('');
  const [isCalculatingHash, setIsCalculatingHash] = useState(false);
  const [precomputedSha256, setPrecomputedSha256] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState<ReleaseUploadProgress>({
    status: 'idle',
    progressPercent: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    currentStepMessage: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedApp = apps.find(
    (a) => (a.appId && a.appId === selectedAppId) || a.id === selectedAppId
  ) || apps[0];

  // Auto-suggest next version saat app dipilih pertama kali
  useEffect(() => {
    if (selectedApp && !versionInput) {
      const currentLatest = selectedApp.latestVersion || selectedApp.version;
      setVersionInput(suggestNextVersion(currentLatest));
    }
  }, [selectedApp]);

  // Handler: Ganti Aplikasi
  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    const target = apps.find((a) => (a.appId && a.appId === appId) || a.id === appId);
    if (target) {
      const currentLatest = target.latestVersion || target.version;
      setVersionInput(suggestNextVersion(currentLatest));
    }
  };

  // Quick Version Bump Handlers
  const handleApplyBump = (type: 'patch' | 'minor' | 'major') => {
    const baseVer = selectedApp?.latestVersion || selectedApp?.version || versionInput || '0.1.0';
    if (type === 'patch') setVersionInput(bumpPatch(baseVer));
    if (type === 'minor') setVersionInput(bumpMinor(baseVer));
    if (type === 'major') setVersionInput(bumpMajor(baseVer));
  };

  // Handler Simpan GitHub Config di Sesi Owner
  const handleSaveGhConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveGitHubPublishConfig(ghConfig);
    setSaveSuccessMsg('Konfigurasi GitHub tersimpan di sesi Owner.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleClearGhToken = () => {
    clearGitHubPublishConfig();
    setGhConfig((prev) => ({ ...prev, token: '' }));
    setSaveSuccessMsg('Token GitHub dihapus dari sesi.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Handler: Pilih File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.exe')) {
      alert('File yang dipilih harus berupa file executable Windows (.exe).');
      return;
    }

    setSelectedFile(file);
    setIsCalculatingHash(true);
    setPrecomputedSha256('');

    try {
      const hash = await calculateFileSha256(file);
      setPrecomputedSha256(hash);
    } catch (err) {
      console.warn('Gagal menghitung SHA-256 lokal:', err);
    } finally {
      setIsCalculatingHash(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.exe')) {
      alert('File yang di-drop harus berupa installer Windows (.exe).');
      return;
    }

    setSelectedFile(file);
    setIsCalculatingHash(true);
    setPrecomputedSha256('');

    try {
      const hash = await calculateFileSha256(file);
      setPrecomputedSha256(hash);
    } catch (err) {
      console.warn('Gagal menghitung SHA-256 lokal:', err);
    } finally {
      setIsCalculatingHash(false);
    }
  };

  // Handler: Start Direct Upload
  const handleStartRelease = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminSession.isAuthenticated || adminSession.role !== 'owner') {
      alert('Akses Ditolak: Anda harus login sebagai Owner untuk mempublikasikan rilis.');
      return;
    }

    if (!ghConfig.token.trim()) {
      setShowGhSettings(true);
      alert('Masukkan GitHub Personal Access Token (PAT) Owner terlebih dahulu.');
      return;
    }

    if (!selectedApp) {
      alert('Pilih aplikasi terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      alert('Pilih file installer Windows (.exe) terlebih dahulu.');
      return;
    }

    const cleanVer = normalizeVersion(versionInput);
    if (!cleanVer) {
      alert('Masukkan nomor versi rilis yang valid (contoh: 0.1.1).');
      return;
    }

    const currentLatest = selectedApp.latestVersion || selectedApp.version;
    if (currentLatest && compareSemver(cleanVer, currentLatest) <= 0) {
      const confirmLower = window.confirm(
        `PERINGATAN VERSI: Versi baru (${cleanVer}) sama atau lebih rendah dari versi yang sudah dirilis (v${currentLatest}).\n\nGitHub Releases tidak mengizinkan penimpaan rilis yang sudah ada. Apakah Anda yakin ingin melanjutkan?`
      );
      if (!confirmLower) return;
    }

    const cleanNotes = releaseNotesInput.trim() || `Rilis resmi ${selectedApp.name} versi v${cleanVer}.`;

    // Pastikan konfigurasi tersimpan
    saveGitHubPublishConfig(ghConfig);

    const result = await uploadAndPublishRelease({
      app: selectedApp,
      file: selectedFile,
      version: cleanVer,
      releaseNotes: cleanNotes,
      githubConfig: ghConfig,
      onProgress: (prog) => {
        setUploadProgress(prog);
      },
    });

    if (result.success && result.data) {
      // Update catalog di state lokal React
      const canonicalId = selectedApp.appId || selectedApp.id;
      const updatedList = apps.map((a) => {
        if ((a.appId && a.appId === canonicalId) || a.id === canonicalId) {
          return {
            ...a,
            latestVersion: cleanVer,
            downloadUrl: result.data!.downloadUrl,
            sha256: result.data!.sha256,
            releaseNotes: cleanNotes,
            updatedAt: new Date().toISOString(),
          };
        }
        return a;
      });

      onCatalogUpdated(updatedList);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setPrecomputedSha256('');
    setUploadProgress({
      status: 'idle',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      currentStepMessage: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploading =
    uploadProgress.status === 'preparing' ||
    uploadProgress.status === 'uploading' ||
    uploadProgress.status === 'creating_release' ||
    uploadProgress.status === 'updating_catalog';

  const canonicalAppId = selectedApp?.appId || selectedApp?.id || '';
  const currentAppLatest = selectedApp?.latestVersion || selectedApp?.version || '0.1.0';
  const expectedTag = generateGitHubTag(canonicalAppId, versionInput || '0.1.0');
  const expectedReleaseName = `${selectedApp?.name || 'Aplikasi'} v${normalizeVersion(versionInput || '0.1.0')}`;
  const isVersionConflictWarning = Boolean(
    versionInput &&
    currentAppLatest &&
    compareSemver(normalizeVersion(versionInput), currentAppLatest) <= 0
  );

  // CLI Command Preview
  const cliData = generateGhCliCommand({
    appId: canonicalAppId,
    appName: selectedApp?.name || 'Aplikasi',
    version: versionInput || '0.1.0',
    fileName: selectedFile?.name || `${canonicalAppId}-Setup.exe`,
    notes: releaseNotesInput,
    repoOwner: ghConfig.owner,
    repoName: ghConfig.repo,
  });

  return (
    <div id="alco-release-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              Direct GitHub Releases Pipeline
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              No Edge Function Limit (Direct Stream)
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Release Publisher & Binary Distribution
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Unggah installer Windows (.exe) berukuran besar langsung dari komputer Owner ke GitHub Releases CDN. Sistem menghitung SHA-256 lokal, membuat tag rilis permanen, dan otomatis menyinkronkan versi terbaru ke Supabase.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGhSettings(!showGhSettings)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              ghConfig.token
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{ghConfig.token ? 'GitHub Terhubung' : 'Setup GitHub PAT'}</span>
            {showGhSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* GitHub Authentication & Repo Config Panel (Owner Session) */}
      {showGhSettings && (
        <form
          onSubmit={handleSaveGhConfig}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Github className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Konfigurasi GitHub Publisher (Khusus Owner)</h4>
                <p className="text-[11px] text-slate-400">
                  Token disimpan secara aman hanya di memori sesi browser Owner ini dan TIDAK PERNAH dibundel ke installer publik.
                </p>
              </div>
            </div>
            {ghConfig.token && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Session
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Repository Owner / Org</label>
              <input
                type="text"
                value={ghConfig.owner}
                onChange={(e) => setGhConfig({ ...ghConfig, owner: e.target.value })}
                placeholder={DEFAULT_GITHUB_REPO_OWNER}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Repository Name</label>
              <input
                type="text"
                value={ghConfig.repo}
                onChange={(e) => setGhConfig({ ...ghConfig, repo: e.target.value })}
                placeholder={DEFAULT_GITHUB_REPO_NAME}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">GitHub Personal Access Token (PAT)</label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=ALCO+Hub+Owner+Release+Publisher"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                >
                  <span>Buat PAT (scope: repo)</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showGhToken ? 'text' : 'password'}
                  value={ghConfig.token}
                  onChange={(e) => setGhConfig({ ...ghConfig, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-9 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowGhToken(!showGhToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showGhToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Target Rilis: <strong className="text-indigo-300 font-mono">{ghConfig.owner || DEFAULT_GITHUB_REPO_OWNER}/{ghConfig.repo || DEFAULT_GITHUB_REPO_NAME}</strong></span>
            </p>

            <div className="flex items-center gap-2">
              {ghConfig.token && (
                <button
                  type="button"
                  onClick={handleClearGhToken}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                >
                  Hapus Token
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                Simpan Konfigurasi Sesi
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* Mode Selector: Direct Upload vs CLI Terminal */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setPublishMode('direct')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            publishMode === 'direct'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white bg-slate-900/50'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Direct In-App Publisher (1-Click)</span>
        </button>
        <button
          type="button"
          onClick={() => setPublishMode('cli')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            publishMode === 'cli'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white bg-slate-900/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>GitHub CLI Script Generator (Terminal)</span>
        </button>
      </div>

      {/* Progress / Status Panel (Saat aktif atau selesai) */}
      {uploadProgress.status !== 'idle' && (
        <div
          id="release-progress-panel"
          className={`p-6 rounded-2xl border transition-all duration-300 space-y-4 ${
            uploadProgress.status === 'completed'
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : uploadProgress.status === 'failed'
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'bg-slate-900 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isUploading && (
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <RotateCw className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}
              {uploadProgress.status === 'completed' && (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
              )}
              {uploadProgress.status === 'failed' && (
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {uploadProgress.status === 'preparing' && 'Menyiapkan & Menghitung SHA-256 Lokal...'}
                  {uploadProgress.status === 'creating_release' && 'Membuat Release & Memvalidasi Tag di GitHub...'}
                  {uploadProgress.status === 'uploading' && 'Mengunggah Binary Installer ke GitHub CDN...'}
                  {uploadProgress.status === 'updating_catalog' && 'Menyimpan Metadata Rilis ke Supabase...'}
                  {uploadProgress.status === 'completed' && 'Rilis Resmi Berhasil Dipublikasikan!'}
                  {uploadProgress.status === 'failed' && 'Proses Publikasi Rilis Gagal'}
                </h4>
                <p className="text-xs text-slate-400">
                  {uploadProgress.currentStepMessage}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-lg font-black font-mono text-white">
                {uploadProgress.progressPercent}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                uploadProgress.status === 'completed'
                  ? 'bg-emerald-400'
                  : uploadProgress.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${uploadProgress.progressPercent}%` }}
            />
          </div>

          {/* Error Message Details */}
          {uploadProgress.status === 'failed' && uploadProgress.error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                Detail Kegagalan:
              </div>
              <p className="text-rose-200/90 font-mono text-[11px] leading-relaxed break-all">
                {uploadProgress.error}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Coba Ulang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyBump('patch');
                    handleResetForm();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                >
                  Gunakan Patch Berikutnya (+0.0.1)
                </button>
              </div>
            </div>
          )}

          {/* Completed Success Summary */}
          {uploadProgress.status === 'completed' && uploadProgress.releaseData && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 block">GitHub Release Tag Resmi:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {uploadProgress.releaseData.tag}
                    </span>
                    {uploadProgress.releaseData.htmlUrl && (
                      <a
                        href={uploadProgress.releaseData.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Buka di GitHub
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 block">Versi Baru Tercatat di Supabase:</span>
                  <span className="font-mono font-bold text-white">
                    v{uploadProgress.releaseData.version}
                  </span>
                </div>
              </div>

              {/* Verified Download URL */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Official Asset Download URL:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={uploadProgress.releaseData.downloadUrl}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(uploadProgress.releaseData!.downloadUrl, 'download-url')
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'download-url' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verified SHA-256 */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Verified SHA-256 Checksum:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={uploadProgress.releaseData.sha256}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-emerald-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(uploadProgress.releaseData!.sha256, 'sha256-hash')
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'sha256-hash' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Hash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Status Diterbitkan saat ini:{' '}
                  <span className={uploadProgress.releaseData.published ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {uploadProgress.releaseData.published ? 'Published (Tersedia untuk pengguna)' : 'Draft (Belum dipublish)'}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  {onNavigateToTab && !uploadProgress.releaseData.published && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('apps')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
                    >
                      <span>Buka Katalog & Terbitkan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Unggah Rilis Baru Lainnya
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: DIRECT IN-APP UPLOAD FORM */}
      {publishMode === 'direct' && (
        <form
          onSubmit={handleStartRelease}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
        >
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Formulir Publikasi Rilis Resmi (Direct Stream)</h3>
            <p className="text-xs text-slate-400">
              Pilih file installer, nomor versi, dan catatan rilis. Binary .exe di-stream langsung ke GitHub Releases CDN.
            </p>
          </div>

          {/* 1. Pilih Aplikasi */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>1. Pilih Aplikasi Ekosistem:</span>
              {selectedApp && (
                <span className="text-[11px] text-slate-400 font-normal">
                  App ID:{' '}
                  <span className="font-mono text-indigo-400 font-bold">
                    {selectedApp.appId || selectedApp.id}
                  </span>
                </span>
              )}
            </label>
            <select
              id="release-app-select"
              value={selectedAppId}
              onChange={(e) => handleSelectApp(e.target.value)}
              disabled={isUploading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
            >
              {apps.map((app) => (
                <option key={app.id} value={app.appId || app.id}>
                  {app.name} ({app.appId || app.id}) • Versi Aktif: v{app.latestVersion || app.version} • {app.published ? 'Published' : 'Draft'}
                </option>
              ))}
            </select>

            {selectedApp && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Kategori Pack:</span>
                  <span className="font-medium text-slate-300">{selectedApp.packId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Versi Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-300">v{selectedApp.version}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Latest Cloud Version:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    v{selectedApp.latestVersion || selectedApp.version}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Publikasi:</span>
                  <span
                    className={`font-semibold ${
                      selectedApp.published ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {selectedApp.published ? 'Published' : 'Draft Only'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Pilih File Installer .exe */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">
              2. File Installer Windows (.exe):
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/80'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".exe"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedFile.name}</h4>
                    <p className="text-xs text-slate-400">
                      Ukuran File:{' '}
                      <span className="font-mono font-semibold text-slate-300">
                        {Math.round((selectedFile.size / 1024 / 1024) * 100) / 100} MB
                      </span>{' '}
                      ({selectedFile.size.toLocaleString()} bytes)
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Klik atau drop file lain untuk mengganti
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Tarik dan lepas file installer .exe di sini, atau{' '}
                      <span className="text-indigo-400 underline">Pilih File</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Hanya file executable installer Windows (.exe) yang didukung.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SHA-256 Calculated Preview */}
            {isCalculatingHash && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
                <RotateCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Menghitung SHA-256 Checksum lokal secara instan...</span>
              </div>
            )}

            {precomputedSha256 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Pre-Calculated SHA-256 (Keamanan Terverifikasi):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(precomputedSha256, 'pre-sha')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[10px]"
                  >
                    {copiedKey === 'pre-sha' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-emerald-400 break-all select-all">
                  {precomputedSha256}
                </p>
              </div>
            )}
          </div>

          {/* 3. Konfigurasi Versi & Release Notes */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>3. Nomor Versi Rilis (Semantic Versioning):</span>
              </label>
              {/* Quick Semver Bump Actions */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-indigo-400" />
                  Saran Otomatis:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyBump('patch')}
                  className="px-2 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold font-mono transition-colors"
                  title="Naikkan Patch (+0.0.1) untuk perbaikan bug / update kecil"
                >
                  + Patch ({bumpPatch(currentAppLatest)})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBump('minor')}
                  className="px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[10px] font-bold font-mono transition-colors"
                  title="Naikkan Minor (+0.1.0) untuk penambahan fitur baru"
                >
                  + Minor ({bumpMinor(currentAppLatest)})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBump('major')}
                  className="px-2 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold font-mono transition-colors"
                  title="Naikkan Major (+1.0.0) untuk perubahan besar"
                >
                  + Major ({bumpMajor(currentAppLatest)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    id="release-version-input"
                    type="text"
                    placeholder="contoh: 0.1.1"
                    value={versionInput}
                    onChange={(e) => setVersionInput(e.target.value)}
                    disabled={isUploading}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Format semver standar (major.minor.patch).</span>
                  <span className="text-slate-400">Versi Cloud: <strong className="text-indigo-400 font-mono">v{currentAppLatest}</strong></span>
                </p>
                {isVersionConflictWarning && (
                  <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Versi harus lebih tinggi dari v{currentAppLatest} untuk mencegah konflik tag GitHub.</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  GitHub Release Tag (Otomatis & Read-Only):
                </label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 truncate select-all">
                  {expectedTag}
                </div>
                <p className="text-[11px] text-slate-500">
                  Judul Rilis: <span className="text-slate-400 font-semibold">{expectedReleaseName}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Release Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              4. Catatan Rilis (Changelog):
            </label>
            <textarea
              id="release-notes-input"
              rows={4}
              placeholder="Jelaskan fitur baru, perbaikan bug, atau peningkatan performa pada versi ini..."
              value={releaseNotesInput}
              onChange={(e) => setReleaseNotesInput(e.target.value)}
              disabled={isUploading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50 leading-relaxed font-sans"
            />
          </div>

          {/* Action Button */}
          <button
            id="submit-upload-release-btn"
            type="submit"
            disabled={isUploading || !selectedFile || !versionInput.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs tracking-wide uppercase transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Memproses Rilis ({uploadProgress.progressPercent}%)...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Publikasikan Rilis ke GitHub & Supabase ({expectedTag})</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: TERMINAL CLI SCRIPT GENERATOR */}
      {publishMode === 'cli' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Owner CLI / Terminal Release Helper</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Jika Anda lebih menyukai publikasi melalui Command Prompt / PowerShell / GitHub CLI di komputer lokal Owner, gunakan perintah siap pakai di bawah ini.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">1. Perintah GitHub CLI (gh):</label>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-all">
                  {cliData.cliCommand}
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopy(cliData.cliCommand, 'gh-cli')}
                  className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'gh-cli' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Script CLI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {precomputedSha256 && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 font-semibold block">Precomputed SHA-256:</span>
                <p className="font-mono text-emerald-400 select-all">{precomputedSha256}</p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Langkah Cepat via Terminal:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Buka terminal di folder tempat file installer <code className="text-indigo-300 font-mono">{cliData.tag}</code> berada.</li>
                <li>Jalankan perintah <code className="text-emerald-300 font-mono">gh auth login</code> (jika belum login di GitHub CLI).</li>
                <li>Salin dan jalankan perintah <code className="text-emerald-300 font-mono">gh release create ...</code> di atas.</li>
                <li>Setelah rilis terbuat di GitHub, buka tab <strong>Manual Metadata Updater</strong> di ALCO Hub untuk menyimpan URL unduhan dan SHA-256 ke Supabase jika diperlukan.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
