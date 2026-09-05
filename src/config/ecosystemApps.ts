/**
 * ALCO Hub - Centralized Ecosystem Applications Configuration
 * Mengelola semua daftar aplikasi, deskripsi fungsi, pack association, icon, aksen, dan status.
 */

import { EcosystemApp } from '../types';

export const ECOSYSTEM_APPS: EcosystemApp[] = [
  // ==========================================
  // 1. CORE SYSTEM APPS
  // ==========================================
  {
    id: 'creative-system',
    name: 'ALCO Creative System',
    shortName: 'Creative System',
    functionLabel: 'Strategy, Research & Product Development',
    description: 'Temukan ide penawaran, validasi target audiens, dan susun fondasi pesan campaign iklan yang terstruktur.',
    packId: 'core-system',
    accent: 'purple',
    iconName: 'target',
    status: 'installed',
    version: '1.0.0',
    launchMode: 'desktop',
    url: '',
    features: [
      'Offer Positioning & Angle Strategy',
      'Target Audience & Buyer Persona Matrix',
      'Copywriting & Creative Angle Briefs',
    ],
  },
  {
    id: 'content-engine',
    name: 'ALCO Content Engine',
    shortName: 'Content Engine',
    functionLabel: 'Content Planning & Production',
    description: 'Ubah positioning dan strategi menjadi kalender konten organik, caption siap posting, brief kreatif, dan aset terorganisir.',
    packId: 'core-system',
    accent: 'cyan',
    iconName: 'sparkles',
    status: 'installed',
    version: '0.1.0',
    launchMode: 'desktop',
    url: '',
    lastOpenedText: 'Last opened recently',
    features: [
      'Editorial Calendar & Production Planner',
      'Hook, Story & Offer Caption Builder',
      'Asset Organizer & Format Templates',
    ],
  },
  {
    id: 'auto-motion',
    name: 'ALCO Auto Motion',
    shortName: 'Auto Motion',
    functionLabel: 'Video Production & Editing',
    description: 'Analisis footage mentah, buat rencana editing terstruktur, dan siapkan video motion dinamis untuk media sosial.',
    packId: 'core-system',
    accent: 'orange',
    iconName: 'video',
    status: 'installed',
    version: '1.0.0',
    launchMode: 'desktop',
    url: '',
    features: [
      'Short-Form Video Motion Architect',
      'Pacing & Visual Hook Breakdown',
      'Subtitle & Kinetic Typography Presets',
    ],
  },

  // ==========================================
  // 2. META ADS STARTER PACK APPS
  // ==========================================
  {
    id: 'meta-ads-analyst',
    name: 'ALCO Meta Ads Analyst',
    shortName: 'Meta Ads Analyst',
    functionLabel: 'AI-powered Meta Ads performance analysis',
    description: 'Evaluasi metrik campaign Ads Manager secara otomatis, deteksi kebocoran budget, dan dapatkan rekomendasi optimasi scaling.',
    packId: 'meta-ads-starter',
    accent: 'emerald',
    iconName: 'trending-up',
    status: 'installed',
    version: '1.0.0',
    launchMode: 'desktop',
    url: '',
    features: [
      'CPA, ROAS & CTR Performance Diagnostics',
      'Budget Leakage & Frequency Warning',
      'Actionable Scaling Recommendations',
    ],
  },
  {
    id: 'landing-page-analyst',
    name: 'ALCO Landing Page Analyst',
    shortName: 'Landing Page Analyst',
    functionLabel: 'AI analysis untuk landing page dan conversion',
    description: 'Audit struktur halaman penawaran, kejelasan copywriting headline, kecepatan visual hierarchy, dan friction checkout.',
    packId: 'meta-ads-starter',
    accent: 'teal',
    iconName: 'layout',
    status: 'coming-soon',
    comingSoon: true,
    launchMode: 'disabled',
    features: [
      'Above-The-Fold Hook Clarity Scoring',
      'Call-To-Action (CTA) Friction Checker',
      'Conversion Rate Optimization (CRO) Blueprint',
    ],
  },
  {
    id: 'ai-spy-ads',
    name: 'ALCO AI Spy Ads',
    shortName: 'AI Spy Ads',
    functionLabel: 'Ads research & competitor intelligence',
    description: 'Riset library iklan kompetitor teratas di industri Anda, bongkar pola hook visual, dan temukan celah diferensiasi pasar.',
    packId: 'meta-ads-starter',
    accent: 'indigo',
    iconName: 'search',
    status: 'coming-soon',
    comingSoon: true,
    launchMode: 'disabled',
    features: [
      'Meta Ad Library Automated Pattern Mining',
      'Winning Hook & Creative Angle Taxonomy',
      'Competitor Offer Benchmark Matrix',
    ],
  },
];

export const HUB_META = {
  name: 'ALCO Hub',
  ecosystem: 'Aladzan Corpora Ecosystem',
  tagline: 'Your business ecosystem, in one place.',
  principles: 'ALCO Hub mengatur ekosistem. Setiap ALCO App mengerjakan fungsi spesifiknya.',
  version: '1.0.0',
};
