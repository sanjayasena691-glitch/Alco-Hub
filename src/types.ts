/**
 * ALCO Hub - Global TypeScript Types & Interfaces
 * Ekosistem Aladzan Corpora (Private App Store & Distribution Center)
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
  id: string;
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
  isPublished?: boolean;
  publishedAt?: string;
  
  // Versions
  version: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
  
  // Runtime & Gating
  status?: AppStatus;
  launchMode: 'desktop' | 'external' | 'disabled';
  url?: string;
  comingSoon?: boolean;
  features?: string[];
  lastOpenedText?: string;
  requiredLicenseAppId?: string;
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
