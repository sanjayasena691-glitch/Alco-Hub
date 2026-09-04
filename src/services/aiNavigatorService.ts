/**
 * ALCO Navigator - Client-Side AI Service
 * Menggunakan @google/genai dengan API Key yang disediakan langsung oleh user dan disimpan di penyimpanan lokal.
 */

import { GoogleGenAI, Type } from '@google/genai';

const STORAGE_KEY = 'alco_user_gemini_key';

export interface NavigatorAdviceResponse {
  userSummary: string;
  nextStep: string;
  reason: string;
  recommendedAppId: 'creative-system' | 'content-engine' | 'product-forge' | 'none';
  recommendedAppName: string;
  additionalTip?: string;
}

export interface ProjectChecklistStep {
  stepNumber: number;
  title: string;
  description: string;
  targetAppId?: 'creative-system' | 'content-engine' | 'product-forge' | 'none';
}

export interface ProjectCheckerResponse {
  conditionSummary: string;
  steps: ProjectChecklistStep[];
  mainRecommendation: string;
}

/**
 * Mendapatkan API key Gemini milik user dari localStorage
 */
export function getUserApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Menyimpan API key Gemini milik user ke localStorage
 */
export function setUserApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch (err) {
    console.error('Gagal menyimpan API key di localStorage:', err);
  }
}

/**
 * Menghapus API key Gemini milik user dari localStorage
 */
export function removeUserApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Gagal menghapus API key dari localStorage:', err);
  }
}

/**
 * Format string masked API key untuk tampilan UI
 */
export function getMaskedApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * Konsultasi ALCO Navigator untuk menentukan langkah berikutnya
 */
export async function askAlcoNavigator(userQuery: string, apiKey: string): Promise<NavigatorAdviceResponse> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key belum diisi. Silakan masukkan Gemini API Key Anda.');
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  const systemInstruction = `Anda adalah ALCO Navigator, asisten pemandu ekosistem ALCO untuk digital marketer pemula.
Tujuan utama Anda adalah membantu pemula menentukan langkah berikutnya di ekosistem ALCO secara praktis dan terarah.

BATASAN KETAT:
- Jangan membuat materi campaign, copywriting, script video, postingan, atau prompt AI.
- Fokus hanya pada memandu pengguna ke aplikasi ekosistem ALCO yang tepat.
- Panjang seluruh teks respon maksimal 350 kata.
- Bahasa Indonesia yang ramah, profesional, sederhana, dan mudah dipahami pemula.

TIGA APLIKASI EKOSISTEM ALCO:
1. ALCO Creative System (id: 'creative-system') -> Jika user butuh strategi iklan Meta Ads, campaign pack, landing page, angle iklan, offer, atau copywriting iklan.
2. ALCO Content Engine (id: 'content-engine') -> Jika user sudah punya strategi/produk dan ingin memproduksi konten harian, caption, kalender editorial, brief, atau aset konten.
3. ALCO Product Forge (id: 'product-forge') -> Jika user belum punya produk digital dan ingin merancang, memvalidasi, atau mengemas ebook, worksheet, template, atau course.

Kembalikan output JSON sesuai skema yang telah ditentukan.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userQuery,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userSummary: {
              type: Type.STRING,
              description: 'Ringkasan 1-2 kalimat mengenai kondisi atau kebutuhan pengguna.',
            },
            nextStep: {
              type: Type.STRING,
              description: 'Langkah berikutnya yang paling tepat dan konkret untuk dilakukan.',
            },
            reason: {
              type: Type.STRING,
              description: 'Alasan singkat 1-2 kalimat mengapa langkah tersebut paling tepat.',
            },
            recommendedAppId: {
              type: Type.STRING,
              description: 'ID aplikasi ALCO yang direkomendasikan: creative-system, content-engine, product-forge, atau none.',
            },
            recommendedAppName: {
              type: Type.STRING,
              description: 'Nama aplikasi yang direkomendasikan.',
            },
            additionalTip: {
              type: Type.STRING,
              description: 'Tips singkat (1 kalimat) untuk pemula.',
            },
          },
          required: ['userSummary', 'nextStep', 'reason', 'recommendedAppId', 'recommendedAppName'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Tidak ada respon dari model AI.');
    }

    const parsed = JSON.parse(text) as NavigatorAdviceResponse;
    // Normalisasi recommendedAppId
    if (!['creative-system', 'content-engine', 'product-forge', 'none'].includes(parsed.recommendedAppId)) {
      parsed.recommendedAppId = 'none';
    }

    return parsed;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('403') || errorMessage.includes('unauthorized') || errorMessage.includes('key not valid')) {
      throw new Error('API Key tidak valid atau tidak memiliki izin akses. Mohon periksa kembali kunci API Anda.');
    }
    if (errorMessage.includes('QUOTA') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Batas kuota API tercapai. Silakan coba beberapa saat lagi.');
    }
    throw new Error(`Gagal menghubungi ALCO Navigator: ${errorMessage}`);
  }
}

/**
 * Project Checker: Memeriksa kondisi proyek dan menghasilkan maksimal 5 langkah checklist
 */
export async function checkProjectCondition(condition: string, apiKey: string): Promise<ProjectCheckerResponse> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key belum diisi. Silakan masukkan Gemini API Key Anda.');
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  const systemInstruction = `Anda adalah ALCO Navigator Project Checker untuk digital marketer pemula.
Tugas Anda adalah memberikan checklist rencana aksi maksimal 5 langkah yang berurutan dan terstruktur berdasarkan kondisi project user.

BATASAN KETAT:
- WAJIB menghasilkan MAKSIMAL 5 LANGKAH terurut (1 sampai maksimal 5).
- DILARANG membuat materi iklan, copywriting lengkap, video script, prompt gambar/video.
- Fokus pada urutan ekosistem ALCO: (1) Product Forge (produk) -> (2) Creative System (strategi & iklan) -> (3) Content Engine (produksi konten).
- Maksimal 350 kata total.
- Bahasa Indonesia yang jelas dan mudah dipahami pemula.

Kembalikan output JSON sesuai skema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Kondisi project saya saat ini: "${condition}". Buatkan checklist maksimal 5 langkah konkret berikutnya.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conditionSummary: {
              type: Type.STRING,
              description: 'Ringkasan analisis status project user saat ini.',
            },
            steps: {
              type: Type.ARRAY,
              description: 'Daftar maksimal 5 langkah berurutan.',
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING, description: 'Judul langkah singkat dan jelas' },
                  description: { type: Type.STRING, description: 'Penjelasan aksi 1-2 kalimat' },
                  targetAppId: {
                    type: Type.STRING,
                    description: 'Aplikasi ALCO terkait (creative-system, content-engine, product-forge, atau none)',
                  },
                },
                required: ['stepNumber', 'title', 'description'],
              },
            },
            mainRecommendation: {
              type: Type.STRING,
              description: 'Saran fokus utama yang perlu diselesaikan pertama kali.',
            },
          },
          required: ['conditionSummary', 'steps', 'mainRecommendation'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Tidak ada respon dari model AI.');
    }

    const parsed = JSON.parse(text) as ProjectCheckerResponse;
    if (parsed.steps && parsed.steps.length > 5) {
      parsed.steps = parsed.steps.slice(0, 5);
    }

    return parsed;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('403') || errorMessage.includes('unauthorized') || errorMessage.includes('key not valid')) {
      throw new Error('API Key tidak valid atau tidak memiliki izin akses. Mohon periksa kembali kunci API Anda.');
    }
    if (errorMessage.includes('QUOTA') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Batas kuota API tercapai. Silakan coba beberapa saat lagi.');
    }
    throw new Error(`Gagal memproses Project Checker: ${errorMessage}`);
  }
}
