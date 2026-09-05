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
  launchMode?: 'external' | 'desktop';
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
  flowDescription: 'Mulai dari ide dan strategi penawaran, buat produk digitalnya, lalu lanjutkan ke iklan, konten, dan video.',
  apps: [
    {
      id: 'creative-system',
      stepNumber: 1,
      name: 'ALCO Creative System',
      shortName: 'Creative System',
      stageLabel: 'Langkah 1 • Ide & Strategi',
      description: 'Temukan ide produk, susun penawaran, lalu siapkan Meta Ads, copywriting, creative, landing page, dan video ads.',
      url: '',
      launchMode: 'desktop',
      buttonLabel: 'Buka Creative System',
      whenToUse: 'Pilih jika belum punya strategi iklan yang terstruktur atau ingin merilis campaign baru.',
      iconName: 'target',
    },
    {
      id: 'product-forge',
      stepNumber: 2,
      name: 'ALCO Product Forge',
      shortName: 'Product Forge',
      stageLabel: 'Langkah 2 • Produk Digital',
      description: 'Ubah brief penawaran menjadi ebook, worksheet, bonus, dan paket produk digital siap jual.',
      url: '',
      launchMode: 'desktop',
      buttonLabel: 'Buka Product Forge',
      whenToUse: 'Pilih setelah ide dan janji produk dari Creative System sudah jelas, lalu buat produk digitalnya di sini.',
      iconName: 'package',
    },
    {
      id: 'content-engine',
      stepNumber: 3,
      name: 'ALCO Content Engine',
      shortName: 'Content Engine',
      stageLabel: 'Langkah 3 • Produksi Konten',
      description: 'Ubah strategi menjadi kalender konten, caption, brief, dan aset konten.',
      url: '',
      launchMode: 'desktop',
      buttonLabel: 'Buka Content Engine',
      whenToUse: 'Pilih jika sudah punya strategi dan ingin memproduksi konten organik harian.',
      iconName: 'sparkles',
    },
    {
      id: 'auto-motion',
      stepNumber: 4,
      name: 'ALCO Auto Motion',
      shortName: 'Auto Motion',
      stageLabel: 'Langkah 4 • Video Motion',
      description: 'Analisis video, susun rencana editing, dan kembangkan video pendek yang lebih siap dipublikasikan.',
      url: '',
      launchMode: 'desktop',
      buttonLabel: 'Buka Auto Motion',
      whenToUse: 'Pilih jika ingin mengubah video mentah menjadi konsep editing dan video motion yang lebih terarah.',
      iconName: 'sparkles',
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
      appId: 'auto-motion',
      condition: 'Ingin mengolah video menjadi konten motion?',
      detail: 'Buka ALCO Auto Motion untuk menganalisis video, menyusun edit plan, dan menyiapkan arahan video pendek.',
    },
    {
      appId: 'product-forge',
      condition: 'Belum punya produk digital untuk dijual?',
      detail: 'Mulai dari Creative System untuk mengunci ide dan janji produk, lalu gunakan Product Forge untuk membuat produk digitalnya.',
    },
  ],
};
