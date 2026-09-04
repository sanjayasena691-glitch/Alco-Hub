/**
 * ALCO Hub - Centralized Ecosystem Configuration
 * Semua nama aplikasi, deskripsi, URL, dan urutan kartu dikelola dari file ini.
 */

export interface EcosystemApp {
  id: string;
  stepNumber: number;
  name: string;
  shortName: string;
  stageLabel: string;
  description: string;
  url: string; // Kosongkan "" jika belum siap / segera hadir
  buttonLabel: string;
  whenToUse: string;
  iconName: 'target' | 'sparkles' | 'package';
}

export interface EcosystemConfig {
  hubName: string;
  hubSubtitle: string;
  hubTagline: string;
  flowDescription: string;
  apps: EcosystemApp[];
  chooserAdvice: {
    appId: string;
    condition: string;
    detail: string;
  }[];
}

export const ECOSYSTEM_CONFIG: EcosystemConfig = {
  hubName: 'ALCO Hub',
  hubSubtitle: 'Pusat kerja ekosistem ALCO',
  hubTagline: 'Gerbang utama alat digital marketing untuk pemula.',
  flowDescription: 'Mulai dari strategi iklan, lanjutkan ke produksi konten, lalu kembangkan produk digital Anda.',
  apps: [
    {
      id: 'creative-system',
      stepNumber: 1,
      name: 'ALCO Creative System',
      shortName: 'Creative System',
      stageLabel: 'Langkah 1 • Strategi Iklan',
      description: 'Bangun strategi Meta Ads, campaign pack, copywriting, creative, landing page, dan video ads.',
      url: 'https://alco-creative-pro-92.ai.studio/',
      buttonLabel: 'Buka Creative System',
      whenToUse: 'Pilih jika belum punya strategi iklan yang terstruktur atau ingin merilis campaign baru.',
      iconName: 'target',
    },
    {
      id: 'content-engine',
      stepNumber: 2,
      name: 'ALCO Content Engine',
      shortName: 'Content Engine',
      stageLabel: 'Langkah 2 • Produksi Konten',
      description: 'Ubah strategi menjadi kalender konten, caption, brief, dan aset konten.',
      url: 'https://alco-content-engine.ai.studio/',
      buttonLabel: 'Buka Content Engine',
      whenToUse: 'Pilih jika sudah punya strategi dan ingin memproduksi konten organik harian.',
      iconName: 'sparkles',
    },
    {
      id: 'product-forge',
      stepNumber: 3,
      name: 'ALCO Product Forge',
      shortName: 'Product Forge',
      stageLabel: 'Langkah 3 • Produk Digital',
      description: 'Rancang dan siapkan produk digital untuk dijual.',
      url: '', // Dikosongkan agar mudah diisi saat deployment
      buttonLabel: 'Buka Product Forge',
      whenToUse: 'Pilih jika ingin merancang, memvalidasi, dan mengemas produk digital Anda sendiri.',
      iconName: 'package',
    },
  ],
  chooserAdvice: [
    {
      appId: 'creative-system',
      condition: 'Belum punya strategi iklan?',
      detail: 'Mulai dengan ALCO Creative System untuk menyusun fondasi pesan, target audiens, angle iklan, dan penawaran.',
    },
    {
      appId: 'content-engine',
      condition: 'Sudah punya strategi & ingin buat konten?',
      detail: 'Buka ALCO Content Engine untuk menerjemahkan positioning Anda ke ide postingan, caption, dan jadwal publikasi.',
    },
    {
      appId: 'product-forge',
      condition: 'Belum punya produk digital untuk dijual?',
      detail: 'Gunakan ALCO Product Forge untuk membuat kurikulum, worksheet, ebook, atau produk digital siap jual.',
    },
  ],
};
