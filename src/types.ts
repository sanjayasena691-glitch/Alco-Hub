/**
 * ALCO Hub - Global TypeScript Types & Interfaces
 * Ekosistem Aladzan Corpora (Launcher & Product Library)
 */

export type NavigationTab = 'home' | 'apps' | 'packs' | 'updates' | 'settings';

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
  | 'amber';

export type ProductIconName =
  | 'target'
  | 'sparkles'
  | 'video'
  | 'trending-up'
  | 'layout'
  | 'search'
  | 'package'
  | 'layers';

export interface EcosystemApp {
  id: string;
  name: string;
  shortName: string;
  functionLabel: string;
  description: string;
  packId: string;
  accent: ProductAccent;
  iconName: ProductIconName;
  status: AppStatus;
  version?: string;
  latestVersion?: string;
  launchMode: 'desktop' | 'external' | 'disabled';
  url?: string;
  comingSoon?: boolean;
  features?: string[];
  lastOpenedText?: string;
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

declare global {
  interface Window {
    alcoHub?: {
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      openDesktopApp: (appId: string) => Promise<{ success: boolean; error?: string }>;
      checkContentEngineUpdate?: () => Promise<ContentEngineUpdateResult>;
    };
  }
}
