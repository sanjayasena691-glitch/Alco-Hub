/**
 * ALCO Hub - Global TypeScript Types & Interfaces
 * Ekosistem Aladzan Corpora (Private App Store & Centralized Catalog)
 */

export type NavigationTab = 'home' | 'store' | 'library' | 'packs' | 'updates' | 'admin' | 'settings';

export type ThemePreference = 'system' | 'light' | 'dark';

export type PricingType = 'free' | 'licensed' | 'trial' | 'coming-soon';
export type AccessModel = 'free' | 'licensed' | 'trial' | 'coming-soon';

export type AppStatus =
  | 'installed'
  | 'update-available'
  | 'up-to-date'
  | 'not-installed'
  | 'not-owned'
  | 'coming-soon'
  | 'unavailable';

export type ProductAccent =
  | 'purple'
  | 'cyan'
  | 'blue'
  | 'orange'
  | 'emerald'
  | 'teal'
  | 'indigo'
  | 'amber'
  | 'rose';

export type ProductIconName =
  | 'target'
  | 'sparkles'
  | 'video'
  | 'trending-up'
  | 'layout'
  | 'search'
  | 'package'
  | 'layers'
  | 'shield';

export interface EcosystemApp {
  id: string; // Database PK or slug
  appId?: string; // Standard ALCO App ID slug (e.g. 'creative-system')
  name: string;
  shortName: string;
  functionLabel: string;
  description: string;
  packId: string;
  accent: ProductAccent;
  iconName: ProductIconName;
  iconUrl?: string; // URL icon resmi aplikasi (SVG / PNG / WebP / HTTPS) dari Supabase / CDN
  
  // Distribution & Commercial Model
  pricingType: PricingType;
  accessModel?: AccessModel;
  trialDurationDays?: number; // Durasi trial dalam hari jika model trial dipilih (misal: 7, 14, 30)
  priceLabel?: string;
  currency?: string;
  published: boolean; // Source of truth: true = visible to public users, false = draft (admin only)
  publishedAt?: string;
  
  // Versions & Binary Artifacts (GitHub Releases)
  version: string; // Installed / baseline version
  latestVersion: string; // Latest published version
  releaseNotes?: string;
  downloadUrl?: string; // Link to GitHub Releases asset
  sha256?: string; // SHA-256 binary hash for integrity check
  
  // Runtime & Gating
  status?: AppStatus;
  launchMode: 'desktop' | 'external' | 'disabled';
  url?: string;
  comingSoon?: boolean;
  features?: string[];
  lastOpenedText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EcosystemPack {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  accent: ProductAccent;
  badge?: string;
  status: 'active' | 'coming-soon';
  toolCount: number;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactAlcoConfig {
  whatsappNumber: string;
  supportEmail: string;
  companyName: string;
  ownerName: string;
  defaultPurchaseMessage?: string;
}

export type NotificationType = 'general' | 'hub_update' | 'new_product' | 'maintenance';

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  published: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  targetVersion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'cached' | 'offline' | 'unconfigured' | 'error';

export interface SyncMeta {
  status: SyncStatus;
  lastSyncedAt: string | null;
  source: 'supabase' | 'cache' | 'default';
  message?: string;
  error?: string;
}

export interface AdminAuthSession {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  role: 'owner' | 'guest';
  token?: string | null;
  mode: 'supabase-auth' | 'none';
  error?: string;
}

export type ReleaseUploadStatus =
  | 'idle'
  | 'preparing'
  | 'calculating_sha'
  | 'creating_release'
  | 'uploading'
  | 'verifying'
  | 'syncing_metadata'
  | 'updating_catalog'
  | 'published'
  | 'completed'
  | 'failed';

export interface GhCliStatus {
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  account: string | null;
  error?: string;
}

export interface NativeFileSelection {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface OneClickPublishParams {
  appId: string;
  appName: string;
  version: string;
  filePath: string;
  releaseNotes?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface OneClickPublishData {
  appId: string;
  appName: string;
  version: string;
  tag: string;
  releaseName: string;
  downloadUrl: string;
  sha256: string;
  fileName: string;
  fileSize: number;
  htmlUrl: string;
  repoSlug: string;
  releaseNotes: string;
}

export interface OneClickPublishResult {
  success: boolean;
  data?: OneClickPublishData;
  step?: ReleaseUploadStatus;
  error?: string;
}

export interface OneClickPublishProgressEvent {
  step: ReleaseUploadStatus;
  progressPercent: number;
  message: string;
  sha256?: string;
  fileName?: string;
  fileSize?: number;
  tag?: string;
  error?: string;
  releaseData?: OneClickPublishData;
}

export interface ReleaseUploadProgress {
  status: ReleaseUploadStatus;
  progressPercent: number; // 0 - 100
  bytesUploaded: number;
  totalBytes: number;
  currentStepMessage: string;
  sha256?: string;
  error?: string;
  releaseData?: {
    appId: string;
    version: string;
    tag: string;
    releaseName: string;
    downloadUrl: string;
    sha256: string;
    htmlUrl?: string;
    fileName?: string;
    fileSize?: number;
    published?: boolean;
  };
}

export interface PublishReleasePayload {
  appId: string;
  appName: string;
  version: string;
  releaseNotes: string;
  sha256: string;
  file: File;
}

export type InstallStatus =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'installer-ready'
  | 'app-running'
  | 'closing-app'
  | 'launching-installer'
  | 'installer-opened'
  | 'ready-to-install'
  | 'installing'
  | 'waiting-completion'
  | 'installed'
  | 'installation-failed'
  | 'failed';

export interface LocalInstallerCacheInfo {
  appId: string;
  version: string;
  installerPath: string;
  sha256: string;
  downloadUrl?: string;
  verifiedAt: string;
  fileSize?: number;
  isValid: boolean;
}

export interface AppInstallProgress {
  appId: string;
  status: InstallStatus;
  progress: number; // 0 - 100
  bytesReceived: number;
  totalBytes: number;
  message?: string;
  error?: string;
  fromCache?: boolean;
  installerPath?: string;
}

export interface AppLocalInstallation {
  isInstalled: boolean;
  version: string | null;
  executablePath: string | null;
}

export interface InstallResult {
  success: boolean;
  installed?: boolean;
  version?: string | null;
  executablePath?: string | null;
  message?: string;
  error?: string;
  resolvedDownloadUrl?: string;
  releaseTag?: string;
  assetFilename?: string;
  shaMismatch?: boolean;
  fromCache?: boolean;
  installerPath?: string;
}

export type ReleaseBadgeStatus = 'LATEST' | 'PREVIOUS' | 'OLD';

export interface GitHubReleaseHistoryItem {
  id?: number;
  tagName: string;
  name: string;
  version: string;
  publishedAt: string | null;
  createdAt?: string | null;
  isLatest: boolean;
  isDraft?: boolean;
  isPrerelease?: boolean;
  statusBadge: ReleaseBadgeStatus;
  htmlUrl: string;
  assetFilename?: string | null;
  downloadUrl?: string | null;
  size?: number;
  body?: string;
  isActiveInCatalog?: boolean;
}

export interface ListAppReleasesParams {
  appId: string;
  appName?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface DeleteGhReleaseParams {
  tag: string;
  repoOwner?: string;
  repoName?: string;
}

export interface DeleteGhReleaseResult {
  success: boolean;
  message?: string;
  error?: string;
}

declare global {
  interface Window {
    alcoHub?: {
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      openDesktopApp: (appId: string) => Promise<{ success: boolean; error?: string }>;
      checkAppInstalled: (appId: string) => Promise<AppLocalInstallation>;
      checkAllAppsInstalled: () => Promise<Record<string, AppLocalInstallation>>;
      downloadAndInstallApp: (params: {
        appId: string;
        downloadUrl: string;
        sha256: string;
        latestVersion: string;
        appName?: string;
        releaseTag?: string;
        repoOwner?: string;
        repoName?: string;
        forceRedownload?: boolean;
      }) => Promise<InstallResult>;
      checkAppRunning?: (appId: string) => Promise<{ isRunning: boolean; appName?: string; error?: string }>;
      closeAppProcess?: (appId: string) => Promise<{ success: boolean; stillRunning?: boolean; error?: string }>;
      getInstallerCacheInfo?: (params: { appId: string; version: string; sha256?: string }) => Promise<{
        cached: boolean;
        installerPath?: string;
        sha256?: string;
        isValid?: boolean;
        fileSize?: number;
        reason?: string;
      }>;
      clearInstallerCache?: (appId?: string) => Promise<{ success: boolean; deletedCount?: number }>;
      onInstallProgress: (callback: (data: AppInstallProgress) => void) => () => void;
      selectInstallerFile?: () => Promise<NativeFileSelection>;
      calculateFileHash?: (filePath: string) => Promise<{ success: boolean; sha256?: string; error?: string }>;
      checkGhCliStatus?: () => Promise<GhCliStatus>;
      publishReleaseGhCli?: (params: OneClickPublishParams) => Promise<OneClickPublishResult>;
      verifyGhReleaseAsset?: (params: { tag: string; repoOwner?: string; repoName?: string }) => Promise<{
        success: boolean;
        error?: string;
        data?: {
          tag: string;
          releaseName?: string;
          fileName?: string;
          downloadUrl?: string;
          size?: number;
          htmlUrl?: string;
        };
      }>;
      listGhAppReleases?: (params: ListAppReleasesParams) => Promise<{
        success: boolean;
        releases: GitHubReleaseHistoryItem[];
        error?: string;
      }>;
      deleteGhRelease?: (params: DeleteGhReleaseParams) => Promise<DeleteGhReleaseResult>;
      onReleasePublishProgress?: (callback: (data: OneClickPublishProgressEvent) => void) => () => void;
    };
  }
}
