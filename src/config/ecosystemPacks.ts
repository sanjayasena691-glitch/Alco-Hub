/**
 * ALCO Hub - Product Packs Configuration
 * Mengelola grup pack produk dalam ekosistem Aladzan Corpora
 */

import { EcosystemPack } from '../types';

export const ECOSYSTEM_PACKS: EcosystemPack[] = [
  {
    id: 'core-system',
    name: 'Core System',
    tagline: 'Fondasi Utama Ekosistem Bisnis & Konten',
    description: 'Rangkaian alat inti untuk merancang strategi, memproduksi konten harian, dan menghasilkan video promosi.',
    category: 'Ecosystem Foundation',
    accent: 'purple',
    badge: 'Core Suite',
    status: 'active',
    toolCount: 3,
  },
  {
    id: 'meta-ads-starter',
    name: 'Meta Ads Starter Pack',
    tagline: 'AI tools for launching and optimizing Meta Ads',
    description: 'Paket terintegrasi khusus untuk riset kompetitor, optimasi landing page, dan evaluasi performa campaign iklan berbayar.',
    category: 'Advertising & Growth',
    accent: 'emerald',
    badge: '3 Tools Included',
    status: 'active',
    toolCount: 3,
  },
];

export const FUTURE_PACK_CATEGORIES = [
  {
    id: 'content-creator-pack',
    name: 'Content Creator Pack',
    description: 'Alat khusus otomasi storytelling, audio synthesis, dan multi-channel publishing.',
    status: 'coming-soon',
  },
  {
    id: 'product-research-pack',
    name: 'Product Research Pack',
    description: 'Deep market intelligence, customer sentiment scraping, dan niche validator.',
    status: 'coming-soon',
  },
  {
    id: 'selling-tools-pack',
    name: 'Selling Tools Pack',
    description: 'Checkout funnel optimizer, follow-up bot generator, dan offer stacking calculator.',
    status: 'coming-soon',
  },
];
