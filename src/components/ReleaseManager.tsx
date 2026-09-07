/**
 * ALCO Hub - Release Manager Component (One-Click UI Release & GitHub CLI Architecture)
 * 
 * Antarmuka resmi Owner Portal untuk mempublikasikan rilis aplikasi ekosistem ALCO:
 * 1. Default / Primary Mode: ONE-CLICK UI RELEASE (Electron Main Process GitHub CLI engine + Auto Supabase Sync)
 * 2. Advanced Tools: Manual GitHub CLI Script Generator & Direct In-App PAT Stream
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FolderOpen,
  Zap,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  EcosystemApp,
  ReleaseUploadProgress,
  ReleaseUploadStatus,
  AdminAuthSession,
  GhCliStatus,
} from '../types';
import {
  executeOneClickRelease,
  uploadAndPublishRelease,
  calculateFileSha256,
  getGitHubPublishConfig,
  saveGitHubPublishConfig,
  clearGitHubPublishConfig,
  generateGhCliCommand,
  syncCliReleaseToSupabase,
  GitHubPublishConfig,
  DEFAULT_GITHUB_REPO_OWNER,
  DEFAULT_GITHUB_REPO_NAME,
} from '../services/releaseService';
import { saveAppToCloud } from '../services/storeService';
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

type PublishMode = 'one-click' | 'manual-cli' | 'direct-pat';

export const ReleaseManager: React.FC<ReleaseManagerProps> = ({
  apps,
  adminSession,
  onCatalogUpdated,
  onNavigateToTab,
}) => {
  // Mode Tab: One-Click UI Release (DEFAULT) vs Advanced Tools
  const [publishMode, setPublishMode] = useState<PublishMode>('one-click');
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

  // GitHub Config State (Owner Session / Repo target)
  const [ghConfig, setGhConfig] = useState<GitHubPublishConfig>(getGitHubPublishConfig);
  const [showGhToken, setShowGhToken] = useState(false);
  const [showGhSettings, setShowGhSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // GitHub CLI Host Status
  const [ghCliStatus, setGhCliStatus] = useState<GhCliStatus | null>(null);
  const [isCheckingGhCli, setIsCheckingGhCli] = useState(false);

  // Selection & Input States
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.appId || apps[0]?.id || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<number>(0);
  const [versionInput, setVersionInput] = useState<string>('');
  const [releaseNotesInput, setReleaseNotesInput] = useState<string>('');
  const [isCalculatingHash, setIsCalculatingHash] = useState(false);
  const [precomputedSha256, setPrecomputedSha256] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Upload Progress & Workflow Pipeline State
  const [uploadProgress, setUploadProgress] = useState<ReleaseUploadProgress>({
    status: 'idle',
    progressPercent: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    currentStepMessage: '',
  });

  // Partial failure state (GitHub uploaded, Supabase pending sync)
  const [pendingSupabaseData, setPendingSupabaseData] = useState<{
    app: EcosystemApp;
    version: string;
    downloadUrl: string;
    sha256: string;
    releaseNotes: string;
  } | null>(null);
  const [isRetryingSupabase, setIsRetryingSupabase] = useState(false);

  // Manual CLI Mode states
  const [isSyncingManualMetadata, setIsSyncingManualMetadata] = useState(false);
  const [manualSyncResultMsg, setManualSyncResultMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isElectron = Boolean(window.alcoHub?.publishReleaseGhCli);

  const selectedApp = apps.find(
    (a) => (a.appId && a.appId === selectedAppId) || a.id === selectedAppId
  ) || apps[0];

  // Auto-suggest next version saat app dipilih
  useEffect(() => {
    if (selectedApp && !versionInput) {
      const currentLatest = selectedApp.latestVersion || selectedApp.version;
      setVersionInput(suggestNextVersion(currentLatest));
    }
  }, [selectedApp]);

  // Check GitHub CLI status on mount
  const checkGhCli = useCallback(async () => {
    if (!window.alcoHub?.checkGhCliStatus) return;
    setIsCheckingGhCli(true);
    try {
      const status = await window.alcoHub.checkGhCliStatus();
      setGhCliStatus(status);
    } catch {
      setGhCliStatus({
        installed: false,
        authenticated: false,
        version: null,
        account: null,
        error: 'Gagal memeriksa status GitHub CLI di sistem.',
      });
    } finally {
      setIsCheckingGhCli(false);
    }
  }, []);

  useEffect(() => {
    checkGhCli();
  }, [checkGhCli]);

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

  // Handler: Native File Picker in Electron
  const handlePickNativeFile = async () => {
    if (window.alcoHub?.selectInstallerFile) {
      const result = await window.alcoHub.selectInstallerFile();
      if (!result.canceled && result.filePath) {
        setSelectedFilePath(result.filePath);
        setSelectedFileName(result.fileName || result.filePath.split(/[\\/]/).pop() || '');
        setSelectedFileSize(result.fileSize || 0);
        setSelectedFile(null); // Managed via file path

        setIsCalculatingHash(true);
        setPrecomputedSha256('');

        try {
          if (window.alcoHub.calculateFileHash) {
            const hashRes = await window.alcoHub.calculateFileHash(result.filePath);
            if (hashRes.success && hashRes.sha256) {
              setPrecomputedSha256(hashRes.sha256);
            }
          }
        } catch (err) {
          console.warn('Gagal menghitung SHA-256 lokal:', err);
        } finally {
          setIsCalculatingHash(false);
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Handler: Standard HTML File Input / Drop
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.exe')) {
      alert('File yang dipilih harus berupa file executable Windows (.exe).');
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    // In Electron with web preferences, file.path is available
    const nativePath = (file as any).path || '';
    setSelectedFilePath(nativePath);

    setIsCalculatingHash(true);
    setPrecomputedSha256('');

    try {
      if (nativePath && window.alcoHub?.calculateFileHash) {
        const hashRes = await window.alcoHub.calculateFileHash(nativePath);
        if (hashRes.success && hashRes.sha256) {
          setPrecomputedSha256(hashRes.sha256);
          setIsCalculatingHash(false);
          return;
        }
      }
      const hash = await calculateFileSha256(file);
      setPrecomputedSha256(hash);
    } catch (err) {
      console.warn('Gagal menghitung SHA-256 lokal:', err);
    } finally {
      setIsCalculatingHash(false);
    }
  };

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
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    const nativePath = (file as any).path || '';
    setSelectedFilePath(nativePath);

    setIsCalculatingHash(true);
    setPrecomputedSha256('');

    try {
      if (nativePath && window.alcoHub?.calculateFileHash) {
        const hashRes = await window.alcoHub.calculateFileHash(nativePath);
        if (hashRes.success && hashRes.sha256) {
          setPrecomputedSha256(hashRes.sha256);
          setIsCalculatingHash(false);
          return;
        }
      }
      const hash = await calculateFileSha256(file);
      setPrecomputedSha256(hash);
    } catch (err) {
      console.warn('Gagal menghitung SHA-256 lokal:', err);
    } finally {
      setIsCalculatingHash(false);
    }
  };

  // Handler: ONE-CLICK UI RELEASE (Default & Primary)
  const handleOneClickPublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminSession.isAuthenticated || adminSession.role !== 'owner') {
      alert('Akses Ditolak: Anda harus login sebagai Owner untuk mempublikasikan rilis.');
      return;
    }

    if (!selectedApp) {
      alert('Pilih aplikasi terlebih dahulu.');
      return;
    }

    const effectiveFilePath = selectedFilePath || (selectedFile as any)?.path;
    if (!effectiveFilePath) {
      if (!selectedFile) {
        alert('Pilih file installer Windows (.exe) terlebih dahulu.');
        return;
      }
      // If running without direct path in browser, prompt to use Direct PAT or CLI
      if (!isElectron) {
        alert('Mode One-Click membutuhkan aplikasi desktop ALCO Hub. Di web browser, silakan gunakan menu "Advanced Tools -> Manual GitHub CLI" atau "Direct PAT Stream".');
        setPublishMode('manual-cli');
        return;
      }
    }

    const cleanVer = normalizeVersion(versionInput);
    if (!cleanVer) {
      alert('Masukkan nomor versi rilis yang valid (contoh: 1.0.1).');
      return;
    }

    const currentLatest = selectedApp.latestVersion || selectedApp.version;
    if (currentLatest && compareSemver(cleanVer, currentLatest) <= 0) {
      const confirmLower = window.confirm(
        `PERINGATAN VERSI: Versi baru (${cleanVer}) sama atau lebih rendah dari versi yang sudah tercatat (v${currentLatest}).\n\nApakah Anda yakin ingin mempublikasikan ulang ke tag ini?`
      );
      if (!confirmLower) return;
    }

    const cleanNotes = releaseNotesInput.trim() || `Rilis resmi ${selectedApp.name} versi v${cleanVer}.`;

    setPendingSupabaseData(null);

    const result = await executeOneClickRelease({
      app: selectedApp,
      version: cleanVer,
      filePath: effectiveFilePath,
      fileName: selectedFileName || selectedFile?.name,
      releaseNotes: cleanNotes,
      repoOwner: ghConfig.owner,
      repoName: ghConfig.repo,
      onProgress: (prog) => {
        setUploadProgress(prog);
      },
    });

    if (result.success && result.updatedApp) {
      const canonicalId = selectedApp.appId || selectedApp.id;
      const updatedList = apps.map((a) => {
        if ((a.appId && a.appId === canonicalId) || a.id === canonicalId) {
          return result.updatedApp!;
        }
        return a;
      });
      onCatalogUpdated(updatedList);
    } else if (result.stage === 'supabase_sync_failed' && result.data) {
      // Keep pending data for retry
      setPendingSupabaseData({
        app: selectedApp,
        version: cleanVer,
        downloadUrl: result.data.downloadUrl,
        sha256: result.data.sha256,
        releaseNotes: cleanNotes,
      });
    }
  };

  // Handler: Retry Supabase Metadata Sync if initial cloud sync failed
  const handleRetrySupabaseSync = async () => {
    if (!pendingSupabaseData) return;

    setIsRetryingSupabase(true);
    const updatedApp: EcosystemApp = {
      ...pendingSupabaseData.app,
      latestVersion: pendingSupabaseData.version,
      downloadUrl: pendingSupabaseData.downloadUrl,
      sha256: pendingSupabaseData.sha256,
      releaseNotes: pendingSupabaseData.releaseNotes,
      updatedAt: new Date().toISOString(),
    };

    const cloudSaveRes = await saveAppToCloud(updatedApp, false);
    setIsRetryingSupabase(false);

    if (cloudSaveRes.success) {
      setUploadProgress((prev) => ({
        ...prev,
        status: 'published',
        progressPercent: 100,
        currentStepMessage: 'Metadata Supabase berhasil disinkronkan!',
        error: undefined,
      }));
      setPendingSupabaseData(null);

      const canonicalId = updatedApp.appId || updatedApp.id;
      const updatedList = apps.map((a) => {
        if ((a.appId && a.appId === canonicalId) || a.id === canonicalId) {
          return updatedApp;
        }
        return a;
      });
      onCatalogUpdated(updatedList);
    } else {
      alert(`Gagal menyinkronkan metadata ke Supabase: ${cloudSaveRes.message}`);
    }
  };

  // Handler: Manual CLI Metadata Sync (Under Advanced Tools)
  const handleManualCliSync = async () => {
    if (!adminSession.isAuthenticated || adminSession.role !== 'owner') {
      alert('Akses Ditolak: Anda harus login sebagai Owner.');
      return;
    }

    if (!selectedApp) {
      alert('Pilih aplikasi terlebih dahulu.');
      return;
    }

    const cleanVer = normalizeVersion(versionInput);
    if (!cleanVer) {
      alert('Nomor versi tidak valid.');
      return;
    }

    const finalFileName = selectedFileName || selectedFile?.name || `${canonicalAppId}-Setup.exe`;
    const finalSha256 = precomputedSha256 || '';

    setIsSyncingManualMetadata(true);
    setManualSyncResultMsg(null);

    const res = await syncCliReleaseToSupabase({
      app: selectedApp,
      version: cleanVer,
      fileName: finalFileName,
      sha256: finalSha256,
      releaseNotes: releaseNotesInput,
      repoOwner: ghConfig.owner,
      repoName: ghConfig.repo,
    });

    setIsSyncingManualMetadata(false);

    if (res.success && res.updatedApp) {
      setManualSyncResultMsg({ type: 'success', message: res.message });
      const targetId = selectedApp.appId || selectedApp.id;
      const updatedList = apps.map((a) => ((a.appId && a.appId === targetId) || a.id === targetId ? res.updatedApp! : a));
      onCatalogUpdated(updatedList);
    } else {
      setManualSyncResultMsg({ type: 'error', message: res.message });
    }
  };

  // Handler: Direct In-App Upload via PAT (Under Advanced Tools)
  const handleDirectPatPublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ghConfig.token.trim()) {
      setShowGhSettings(true);
      alert('Masukkan GitHub Personal Access Token (PAT) Owner terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      alert('Pilih file installer (.exe) terlebih dahulu.');
      return;
    }

    const cleanVer = normalizeVersion(versionInput);
    if (!cleanVer) {
      alert('Nomor versi tidak valid.');
      return;
    }

    const cleanNotes = releaseNotesInput.trim() || `Rilis resmi ${selectedApp.name} versi v${cleanVer}.`;
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
    setSelectedFilePath('');
    setSelectedFileName('');
    setSelectedFileSize(0);
    setPrecomputedSha256('');
    setPendingSupabaseData(null);
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

  const isWorking =
    uploadProgress.status === 'preparing' ||
    uploadProgress.status === 'calculating_sha' ||
    uploadProgress.status === 'creating_release' ||
    uploadProgress.status === 'uploading' ||
    uploadProgress.status === 'verifying' ||
    uploadProgress.status === 'syncing_metadata' ||
    uploadProgress.status === 'updating_catalog';

  const canonicalAppId = selectedApp?.appId || selectedApp?.id || '';
  const currentAppLatest = selectedApp?.latestVersion || selectedApp?.version || '0.1.0';
  const expectedTag = generateGitHubTag(canonicalAppId, versionInput || '0.1.0');
  const expectedReleaseName = `${selectedApp?.name || 'Aplikasi'} v${normalizeVersion(versionInput || '0.1.0')}`;

  // CLI Data for Advanced Manual Mode
  const cliData = generateGhCliCommand({
    appId: canonicalAppId,
    appName: selectedApp?.name || 'Aplikasi',
    version: versionInput || '0.1.0',
    fileName: selectedFileName || selectedFile?.name || `${canonicalAppId}-Setup.exe`,
    notes: releaseNotesInput,
    repoOwner: ghConfig.owner,
    repoName: ghConfig.repo,
  });

  // Workflow Step Status Map
  const workflowSteps: { key: ReleaseUploadStatus; label: string }[] = [
    { key: 'preparing', label: 'Preparing' },
    { key: 'calculating_sha', label: 'Calculating SHA' },
    { key: 'creating_release', label: 'Creating Release' },
    { key: 'uploading', label: 'Uploading' },
    { key: 'verifying', label: 'Verifying' },
    { key: 'syncing_metadata', label: 'Syncing Metadata' },
    { key: 'published', label: 'Published' },
  ];

  const getStepState = (stepKey: ReleaseUploadStatus) => {
    const order: ReleaseUploadStatus[] = [
      'preparing',
      'calculating_sha',
      'creating_release',
      'uploading',
      'verifying',
      'syncing_metadata',
      'published',
    ];
    const currentIndex = order.indexOf(uploadProgress.status === 'completed' ? 'published' : uploadProgress.status);
    const targetIndex = order.indexOf(stepKey);

    if (uploadProgress.status === 'failed') {
      return targetIndex === currentIndex ? 'failed' : targetIndex < currentIndex ? 'done' : 'pending';
    }
    if (uploadProgress.status === 'published' || uploadProgress.status === 'completed') {
      return 'done';
    }
    if (currentIndex === -1) return 'pending';
    if (targetIndex < currentIndex) return 'done';
    if (targetIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div id="alco-release-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              One-Click UI Release
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Direct Computer → GitHub Releases CDN
            </span>
            {ghCliStatus?.authenticated && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Github className="w-3 h-3 text-white" />
                gh: {ghCliStatus.account || 'Authenticated'}
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>ALCO Release Manager</span>
            <span className="text-xs font-normal text-slate-400 font-sans">v2.0 • One-Click Publisher</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Publikasikan installer Windows (.exe) secara otomatis ke GitHub Releases CDN dan sinkronkan metadata katalog ke Supabase dalam satu klik tanpa perlu membuka Command Prompt atau PowerShell.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* Target Repo Quick Info */}
          <div className="hidden sm:block text-right text-[11px] pr-2">
            <span className="text-slate-500 block">Target Releases Repo:</span>
            <span className="font-mono font-bold text-indigo-300">
              {ghConfig.owner || DEFAULT_GITHUB_REPO_OWNER}/{ghConfig.repo || DEFAULT_GITHUB_REPO_NAME}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowGhSettings(!showGhSettings)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Repo Settings</span>
            {showGhSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* GitHub CLI Host Health Notification (If not installed / not logged in) */}
      {isElectron && ghCliStatus && !ghCliStatus.authenticated && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">Perhatian: GitHub CLI Membutuhkan Otentikasi</h4>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                {ghCliStatus.error || 'GitHub CLI belum login ke akun GitHub Anda.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={checkGhCli}
              disabled={isCheckingGhCli}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCw className={`w-3 h-3 ${isCheckingGhCli ? 'animate-spin' : ''}`} />
              <span>Cek Ulang Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Repo Settings Panel */}
      {showGhSettings && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveGitHubPublishConfig(ghConfig);
            setSaveSuccessMsg('Konfigurasi Repository rilis tersimpan.');
            setTimeout(() => setSaveSuccessMsg(null), 3000);
          }}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Github className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Target GitHub Releases Repository</h4>
                <p className="text-[11px] text-slate-400">
                  Secara default rilis dialirkan ke repository resmi Aladzan Corpora.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Repository Owner / Organization</label>
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
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500">
              Target Rilis:{' '}
              <strong className="text-indigo-300 font-mono">
                {ghConfig.owner || DEFAULT_GITHUB_REPO_OWNER}/{ghConfig.repo || DEFAULT_GITHUB_REPO_NAME}
              </strong>
            </p>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              Simpan Target Repo
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {/* Main Mode: One-Click UI Release (DEFAULT) */}
          <button
            type="button"
            onClick={() => setPublishMode('one-click')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
              publishMode === 'one-click'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-600/20 shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-200" />
            <span>One-Click UI Release</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase">
              Official Default
            </span>
          </button>
        </div>

        {/* Secondary: Advanced Tools Accordion Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              publishMode !== 'one-click'
                ? 'bg-slate-800 text-indigo-300 border-indigo-500/30'
                : 'bg-slate-900/50 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced Tools</span>
            {showAdvancedMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-30 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setPublishMode('manual-cli');
                  setShowAdvancedMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  publishMode === 'manual-cli' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <div>
                  <div className="font-bold">Manual GitHub CLI</div>
                  <div className="text-[10px] text-slate-400 font-normal">CLI Script Generator & Manual Sync</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPublishMode('direct-pat');
                  setShowAdvancedMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  publishMode === 'direct-pat' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center justify-between">
                    <span>Direct In-App Stream</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded uppercase">Deprecated</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Browser HTTP Stream via GitHub PAT (Legacy)</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress & Status Pipeline Visual (Active during publish / completed / failed) */}
      {uploadProgress.status !== 'idle' && (
        <div
          id="release-progress-panel"
          className={`p-6 rounded-2xl border transition-all duration-300 space-y-5 shadow-xl ${
            uploadProgress.status === 'published' || uploadProgress.status === 'completed'
              ? 'bg-emerald-950/20 border-emerald-500/30 shadow-emerald-500/5'
              : uploadProgress.status === 'failed'
              ? 'bg-rose-950/20 border-rose-500/30 shadow-rose-500/5'
              : 'bg-slate-900 border-indigo-500/40 shadow-indigo-500/10'
          }`}
        >
          {/* Header Status Text */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isWorking && (
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <RotateCw className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}
              {(uploadProgress.status === 'published' || uploadProgress.status === 'completed') && (
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
                  {uploadProgress.status === 'preparing' && '1/6. Menyiapkan & Memeriksa GitHub CLI...'}
                  {uploadProgress.status === 'calculating_sha' && '2/6. Menghitung SHA-256 Checksum Lokal...'}
                  {uploadProgress.status === 'creating_release' && '3/6. Mempersiapkan Release di GitHub...'}
                  {uploadProgress.status === 'uploading' && '4/6. Mengunggah Installer (.exe) ke GitHub Releases CDN...'}
                  {uploadProgress.status === 'verifying' && '5/6. Memverifikasi Asset Binary di CDN...'}
                  {uploadProgress.status === 'syncing_metadata' && '6/6. Menyinkronkan Metadata ke Supabase...'}
                  {(uploadProgress.status === 'published' || uploadProgress.status === 'completed') &&
                    'Release Berhasil Dipublikasikan!'}
                  {uploadProgress.status === 'failed' && 'Proses Rilis Terhenti'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uploadProgress.currentStepMessage}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xl font-black font-mono text-white">
                {uploadProgress.progressPercent}%
              </span>
            </div>
          </div>

          {/* Workflow Status Pipeline Steps Visual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
            {workflowSteps.map((step, idx) => {
              const state = getStepState(step.key);
              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl border text-[10px] font-semibold flex flex-col justify-between transition-all ${
                    state === 'done'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : state === 'active'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30 animate-pulse'
                      : state === 'failed'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] opacity-75">0{idx + 1}</span>
                    {state === 'done' && <Check className="w-3 h-3 text-emerald-400" />}
                    {state === 'active' && <RotateCw className="w-3 h-3 text-indigo-400 animate-spin" />}
                    {state === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                  </div>
                  <span className="mt-1 font-bold truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                uploadProgress.status === 'published' || uploadProgress.status === 'completed'
                  ? 'bg-emerald-400'
                  : uploadProgress.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${uploadProgress.progressPercent}%` }}
            />
          </div>

          {/* Partial Failure Notice: GitHub succeeded, Supabase pending */}
          {pendingSupabaseData && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Binary berhasil di GitHub, metadata belum tersinkron.</span>
              </div>
              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                Installer .exe telah berhasil terunggah dan aktif di GitHub Releases (<code className="font-mono text-white">{pendingSupabaseData.downloadUrl}</code>), namun koneksi ke Supabase mengalami kendala saat mencatat metadata. Release di GitHub tetap aman dan tidak akan dihapus.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRetrySupabaseSync}
                  disabled={isRetryingSupabase}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSupabase ? 'animate-spin' : ''}`} />
                  <span>Retry Metadata Sync</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Error Message Details */}
          {uploadProgress.status === 'failed' && uploadProgress.error && !pendingSupabaseData && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                Detail Kendala:
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
                  Naikkan Nomor Versi (+0.0.1)
                </button>
              </div>
            </div>
          )}

          {/* Completed Success Summary Card */}
          {(uploadProgress.status === 'published' || uploadProgress.status === 'completed') &&
            uploadProgress.releaseData && (
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-4 text-xs shadow-xl">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-extrabold text-white">
                    Release Berhasil Dipublikasikan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Aplikasi:</span>
                    <span className="font-bold text-white text-xs block truncate">
                      {selectedApp.name} ({uploadProgress.releaseData.appId})
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Versi Baru (Supabase):</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs block">
                      v{uploadProgress.releaseData.version}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Status Supabase:</span>
                    <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Tersinkronisasi & Aktif
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">GitHub Release Tag:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-indigo-300 text-xs truncate">
                        {uploadProgress.releaseData.tag}
                      </span>
                      {uploadProgress.releaseData.htmlUrl && (
                        <a
                          href={uploadProgress.releaseData.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-white"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Installer File:</span>
                    <span className="font-mono text-slate-300 text-xs block truncate">
                      {uploadProgress.releaseData.fileName || selectedFileName}
                      {uploadProgress.releaseData.fileSize ? ` (${Math.round((uploadProgress.releaseData.fileSize / 1024 / 1024) * 10) / 10} MB)` : ''}
                    </span>
                  </div>
                </div>

                {/* SHA-256 Checksum Card */}
                <div className="space-y-1 pt-1">
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
                      onClick={() => handleCopy(uploadProgress.releaseData!.sha256, 'sha256-hash')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shrink-0"
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

                {/* Verified Download URL */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block font-semibold">
                    Official GitHub Releases Asset URL:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={uploadProgress.releaseData.downloadUrl}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-indigo-300 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(uploadProgress.releaseData!.downloadUrl, 'download-url')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shrink-0"
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

                {/* Footer Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                  <p className="text-[11px] text-slate-400">
                    Status Katalog:{' '}
                    <span className={selectedApp.published ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {selectedApp.published ? 'Published (Semua pengguna ALCO Hub menerima update ini)' : 'Draft (Belum dibuka ke publik)'}
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    {onNavigateToTab && !selectedApp.published && (
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
                      Rilis Aplikasi Lainnya
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* MODE 1: ONE-CLICK UI RELEASE (DEFAULT & OFFICIAL WORKFLOW) */}
      {publishMode === 'one-click' && (
        <form
          onSubmit={handleOneClickPublish}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-lg"
        >
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">One-Click Release Publisher</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Automated Transaction
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pilih aplikasi dan installer .exe. ALCO Hub akan mengunggah binary ke GitHub Releases dan menyinkronkan Supabase secara otomatis.
              </p>
            </div>
          </div>

          {/* 1. Pilih Aplikasi */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>1. Pilih Aplikasi Ekosistem:</span>
              {selectedApp && (
                <span className="text-[11px] text-slate-400 font-normal">
                  App ID: <span className="font-mono text-indigo-400 font-bold">{selectedApp.appId || selectedApp.id}</span>
                </span>
              )}
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => handleSelectApp(e.target.value)}
              disabled={isWorking}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
            >
              {apps.map((app) => (
                <option key={app.id} value={app.appId || app.id}>
                  {app.name} ({app.appId || app.id}) • Versi Aktif: v{app.latestVersion || app.version} • {app.published ? 'Published' : 'Draft'}
                </option>
              ))}
            </select>

            {selectedApp && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
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
                  <span className="font-mono font-bold text-emerald-400">v{selectedApp.latestVersion || selectedApp.version}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Publikasi:</span>
                  <span className={`font-semibold ${selectedApp.published ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedApp.published ? 'Published' : 'Draft Only'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Pilih File Installer .exe */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                2. File Installer Windows (.exe):
              </label>
              {isElectron && (
                <button
                  type="button"
                  onClick={handlePickNativeFile}
                  disabled={isWorking}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Jelajahi File Komputer</span>
                </button>
              )}
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isWorking && handlePickNativeFile()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                selectedFileName
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/80'
              } ${isWorking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".exe"
                onChange={handleFileChange}
                disabled={isWorking}
                className="hidden"
              />

              {selectedFileName ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedFileName}</h4>
                    <p className="text-xs text-slate-400">
                      Ukuran:{' '}
                      <span className="font-mono font-semibold text-slate-300">
                        {Math.round((selectedFileSize / 1024 / 1024) * 100) / 100} MB
                      </span>{' '}
                      ({selectedFileSize.toLocaleString()} bytes)
                    </p>
                    {selectedFilePath && (
                      <p className="text-[11px] font-mono text-slate-500 truncate max-w-xl mx-auto mt-1">
                        Jalur: {selectedFilePath}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Klik untuk memilih installer lain
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Klik untuk memilih file installer .exe, atau seret & lepas file ke sini
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
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
                    SHA-256 Checksum (Integritas Terverifikasi):
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

          {/* 3. Konfigurasi Versi & GitHub Release Tag */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300">
                3. Nomor Versi Rilis Baru (Semantic Versioning):
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-indigo-400" />
                  Quick Bump:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyBump('patch')}
                  disabled={isWorking}
                  className="px-2 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold font-mono transition-colors"
                >
                  + Patch ({bumpPatch(currentAppLatest)})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBump('minor')}
                  disabled={isWorking}
                  className="px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[10px] font-bold font-mono transition-colors"
                >
                  + Minor ({bumpMinor(currentAppLatest)})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBump('major')}
                  disabled={isWorking}
                  className="px-2 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold font-mono transition-colors"
                >
                  + Major ({bumpMajor(currentAppLatest)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="contoh: 1.0.1"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  disabled={isWorking}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Format semver (major.minor.patch)</span>
                  <span className="text-slate-400">Versi Cloud: <strong className="text-indigo-400 font-mono">v{currentAppLatest}</strong></span>
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 truncate select-all">
                  GitHub Tag: {expectedTag}
                </div>
                <p className="text-[11px] text-slate-500">
                  Judul Rilis: <span className="text-slate-400 font-semibold">{expectedReleaseName}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 4. Release Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              4. Catatan Rilis (Changelog):
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan fitur baru, perbaikan bug, atau peningkatan performa pada versi ini..."
              value={releaseNotesInput}
              onChange={(e) => setReleaseNotesInput(e.target.value)}
              disabled={isWorking}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50 leading-relaxed font-sans"
            />
          </div>

          {/* Publish Action Button */}
          <button
            type="submit"
            disabled={isWorking || (!selectedFileName && !selectedFile) || !versionInput.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs tracking-wide uppercase transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isWorking ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Memproses Rilis ({uploadProgress.progressPercent}%)...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Publish Release ({expectedTag})</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* MODE 2: ADVANCED TOOLS -> MANUAL GITHUB CLI */}
      {publishMode === 'manual-cli' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Manual GitHub CLI Script Generator</h3>
                  <p className="text-[11px] text-slate-400">
                    Opsi manual untuk menjalankan perintah rilis di terminal eksternal Owner jika diperlukan.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-all leading-relaxed">
                {cliData.cliCommand}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">Tag: {expectedTag}</span>
              <button
                type="button"
                onClick={() => handleCopy(cliData.cliCommand, 'gh-cli')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {copiedKey === 'gh-cli' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Perintah Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Perintah CLI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2 in Manual Mode: Sync Metadata */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">Manual Supabase Metadata Sync</h4>
            </div>
            <p className="text-xs text-slate-400">
              Setelah selesai menjalankan script CLI di terminal, klik tombol di bawah untuk menyinkronkan metadata ke Supabase.
            </p>

            {manualSyncResultMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  manualSyncResultMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {manualSyncResultMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{manualSyncResultMsg.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleManualCliSync}
              disabled={isSyncingManualMetadata || !versionInput.trim()}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
            >
              {isSyncingManualMetadata ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Menyinkronkan ke Supabase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Simpan Metadata Rilis v{normalizeVersion(versionInput || '0.1.0')} ke Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: ADVANCED TOOLS -> DIRECT PAT IN-APP STREAM */}
      {publishMode === 'direct-pat' && (
        <form
          onSubmit={handleDirectPatPublish}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
        >
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
            <div className="font-bold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Direct In-App Stream (Browser HTTP Upload via PAT)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Deprecated / Advanced
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Jalur alternatif warisan (legacy) untuk mengunggah file langsung dari browser HTTP menggunakan Personal Access Token. Workflow resmi dan utama ALCO Hub adalah <strong>One-Click UI Release</strong> via GitHub CLI tanpa memerlukan PAT.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">GitHub Personal Access Token (PAT):</label>
            <input
              type="password"
              value={ghConfig.token}
              onChange={(e) => setGhConfig({ ...ghConfig, token: e.target.value })}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isWorking || !selectedFile || !versionInput.trim() || !ghConfig.token.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50"
          >
            Upload via Direct PAT Stream
          </button>
        </form>
      )}
    </div>
  );
};
