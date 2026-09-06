/**
 * ALCO Hub - Global TypeScript Types & Interfaces
 * Ekosistem Aladzan Corpora (Private App Store & Centralized Catalog)
 */

export type NavigationTab = 'home' | 'store' | 'library' | 'packs' | 'updates' | 'admin' | 'settings';

export type PricingType = 'free' | 'licensed' | 'coming-soon';

export type UserLicenseStatus = 'active' | 'inactive' | 'expired' | 'none';

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
  
  // Distribution & Commercial Model
  pricingType: PricingType;
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
  requiredLicenseAppId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserLicense {
  appId: string;
  licenseKey: string;
  licensedTo: string;
  activatedAt: string;
  status: UserLicenseStatus;
  expiresAt?: string;
  tier?: string;
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
}

export type ContentEngineUpdateStatus = 'checking' | 'up-to-date' | 'update-available' | 'unable-to-check';

export interface ContentEngineUpdateResult {
  success: boolean;
  status: Exclude<ContentEngineUpdateStatus, 'checking'>;
  error?: string;
  localVersion?: string | null;
  latestVersion?: string;
  registry?: {
    latestVersion: string;
    status: string;
    downloadUrl: string;
    sha256: string;
  };
}

export interface ContactAlcoConfig {
  whatsappNumber: string;
  supportEmail: string;
  companyName: string;
  ownerName: string;
  defaultPurchaseMessage?: string;
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
  email: string | null;
  role: 'admin' | 'guest';
  token?: string | null;
  mode: 'supabase-auth' | 'preview-admin' | 'none';
}

declare global {
  interface Window {
    alcoHub?: {
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      openDesktopApp: (appId: string) => Promise<{ success: boolean; error?: string }>;
      checkContentEngineUpdate?: () => Promise<ContentEngineUpdateResult>;
    };
  }
}
