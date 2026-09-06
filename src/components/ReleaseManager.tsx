/**
 * ALCO Hub - Release Manager Component
 * 
 * Antarmuka resmi Owner Portal untuk mengunggah installer (.exe) ke GitHub Releases
 * dan memperbarui metadata katalog Supabase secara aman melalui Edge Function.
 */

import React, { useState, useRef } from 'react';
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
  Package,
  Tag,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  EcosystemApp,
  ReleaseUploadProgress,
  ReleaseUploadStatus,
  AdminAuthSession,
} from '../types';
import { uploadAndPublishRelease, calculateFileSha256 } from '../services/releaseService';

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

  // Handler: Ganti Aplikasi
  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    const target = apps.find((a) => (a.appId && a.appId === appId) || a.id === appId);
    if (target) {
      // Saran versi baru (misal patch bump)
      const currentLatest = target.latestVersion || target.version || '0.1.0';
      const parts = currentLatest.split('.');
      if (parts.length === 3 && !isNaN(Number(parts[2]))) {
        setVersionInput(`${parts[0]}.${parts[1]}.${Number(parts[2]) + 1}`);
      } else {
        setVersionInput(currentLatest);
      }
    }
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

  // Handler: Start Upload
  const handleStartRelease = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminSession.isAuthenticated || adminSession.role !== 'owner') {
      alert('Akses Ditolak: Anda harus login sebagai Owner untuk mempublikasikan rilis.');
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

    if (!versionInput.trim()) {
      alert('Masukkan nomor versi rilis (contoh: 0.1.1).');
      return;
    }

    const cleanVer = versionInput.trim();
    const cleanNotes = releaseNotesInput.trim() || `Rilis resmi ${selectedApp.name} versi v${cleanVer}.`;

    const result = await uploadAndPublishRelease({
      app: selectedApp,
      file: selectedFile,
      version: cleanVer,
      releaseNotes: cleanNotes,
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
            downloadUrl: result.data.downloadUrl,
            sha256: result.data.sha256,
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
  const expectedTag = `${canonicalAppId}-v${versionInput.trim() || '0.1.0'}`;
  const expectedReleaseName = `${selectedApp?.name || 'Aplikasi'} v${versionInput.trim() || '0.1.0'}`;

  return (
    <div id="alco-release-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              Automated Release Pipeline
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Edge Function Secured
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Release Manager & Binary Distribution
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Unggah file installer Windows (.exe) dari komputer Anda. Sistem akan memverifikasi hash SHA-256,
            membuat tag & rilis resmi di GitHub Releases melalui Supabase Edge Function, dan memperbarui metadata katalog secara real-time.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 block">Katalog Terkoneksi</span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {apps.length} Aplikasi Terdaftar
            </span>
          </div>
        </div>
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
                  {uploadProgress.status === 'preparing' && 'Menyiapkan & Menghitung SHA-256...'}
                  {uploadProgress.status === 'uploading' && 'Mengunggah Installer ke Edge Function...'}
                  {uploadProgress.status === 'creating_release' && 'Membuat Tag & Release di GitHub...'}
                  {uploadProgress.status === 'updating_catalog' && 'Memperbarui Katalog Supabase...'}
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
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Coba Ulang
                </button>
                <span className="text-[11px] text-slate-400">
                  Pastikan secret GITHUB_TOKEN telah diatur di Supabase Edge Functions.
                </span>
              </div>
            </div>
          )}

          {/* Completed Success Summary */}
          {uploadProgress.status === 'completed' && uploadProgress.releaseData && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 block">GitHub Release Tag:</span>
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
                    {uploadProgress.releaseData.published ? 'Published (Dapat diunduh public)' : 'Draft (Belum diterbitkan)'}
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

      {/* Main Form: Upload Release */}
      <form
        onSubmit={handleStartRelease}
        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
      >
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white">Formulir Publikasi Rilis Resmi</h3>
          <p className="text-xs text-slate-400">
            Lengkapi data rilis di bawah ini. File binary akan diunggah langsung ke GitHub Releases dan terhubung ke ALCO Hub.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              3. Nomor Versi Baru:
            </label>
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
            <p className="text-[11px] text-slate-500">
              Format semver standar (major.minor.patch).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Tag Rilis GitHub (Otomatis):
            </label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 truncate">
              {expectedTag}
            </div>
            <p className="text-[11px] text-slate-500">
              Judul Rilis: <span className="text-slate-400 font-semibold">{expectedReleaseName}</span>
            </p>
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

        {/* Security & Secret Notice */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-300">
              Keamanan Server-Side Terjamin
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Token GitHub Personal Access Token (PAT) disimpan secara rahasia di Supabase Edge Function Secrets.
              ALCO Hub client tidak pernah memegang atau menerima token GitHub.
            </p>
          </div>
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
              <span>Unggah & Buat GitHub Release</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
