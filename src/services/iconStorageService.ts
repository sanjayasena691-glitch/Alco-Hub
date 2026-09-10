/**
 * ALCO Hub - App Icon Storage Service
 * Mengelola validasi, upload file gambar icon (PNG/WEBP), dan perolehan Public URL
 * dari Supabase Storage bucket 'app-icons' untuk Owner Portal.
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { sanitizeAppId } from '../utils/versioning';

export const BUCKET_APP_ICONS = 'app-icons';
export const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_ICON_MIME_TYPES = ['image/png', 'image/webp'];
export const ALLOWED_ICON_EXTENSIONS = ['.png', '.webp'];

export interface IconValidationResult {
  valid: boolean;
  error?: string;
}

export interface IconUploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

/**
 * Memvalidasi file gambar icon sebelum diunggah ke Supabase Storage.
 * Ketentuan:
 * - Hanya format PNG dan WEBP
 * - Ukuran maksimal 2 MB
 */
export function validateIconFile(file: File): IconValidationResult {
  if (!file) {
    return {
      valid: false,
      error: 'File icon tidak ditemukan. Silakan pilih file gambar.',
    };
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  const hasValidExt = ALLOWED_ICON_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = ALLOWED_ICON_MIME_TYPES.includes(fileType) || hasValidExt;

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap pilih gambar dengan format PNG (.png) atau WEBP (.webp).',
    };
  }

  if (file.size > MAX_ICON_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Ukuran file terlalu besar (${sizeInMb} MB). Maksimal ukuran file icon adalah 2 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Mengunggah file icon ke Supabase Storage bucket 'app-icons'
 * dan menghasilkan Public URL permanen.
 * 
 * Strategi Path:
 * {cleanAppId}/icon.png (atau .webp)
 * Menggunakan upsert: true agar upload ulang meng-overwrite file lama tanpa membuat duplikasi sampah.
 */
export async function uploadAppIconToStorage(
  appId: string,
  file: File
): Promise<IconUploadResult> {
  // 1. Validasi File
  const validation = validateIconFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validasi file icon gagal.',
    };
  }

  // 2. Sanitasi App ID untuk path folder
  const cleanAppId = sanitizeAppId(appId || 'unnamed-app');
  if (!cleanAppId) {
    return {
      success: false,
      error: 'App ID belum diisi atau tidak valid. Isi App ID terlebih dahulu sebelum mengunggah icon.',
    };
  }

  // 3. Cek Koneksi Supabase
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Koneksi Supabase belum terhubung. Konfigurasi URL dan Anon Key Supabase di menu Settings terlebih dahulu.',
    };
  }

  // 4. Tentukan Ekstensi dan Content Type
  const fileName = file.name.toLowerCase();
  const ext = fileName.endsWith('.webp') ? 'webp' : 'png';
  const contentType = ext === 'webp' ? 'image/webp' : 'image/png';
  const filePath = `${cleanAppId}/icon.${ext}`;

  try {
    // 5. Eksekusi Upload ke Supabase Storage dengan Upsert
    const { data: uploadData, error: uploadError } = await client.storage
      .from(BUCKET_APP_ICONS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.warn('[Icon Storage] Upload error:', uploadError);

      let userFriendlyMsg = uploadError.message;
      if (uploadError.message.includes('Bucket not found')) {
        userFriendlyMsg = `Bucket storage '${BUCKET_APP_ICONS}' tidak ditemukan di Supabase. Harap buat bucket '${BUCKET_APP_ICONS}' sebagai Public Bucket di Dashboard Supabase Storage.`;
      } else if (
        uploadError.message.includes('row-level security') ||
        uploadError.message.includes('permission denied') ||
        uploadError.message.includes('AccessDenied') ||
        uploadError.message.includes('403')
      ) {
        userFriendlyMsg = `Izin unggah ditolak oleh Supabase Storage Policy (RLS). Pastikan bucket '${BUCKET_APP_ICONS}' memiliki policy INSERT/UPDATE untuk pengguna atau public anon.`;
      }

      return {
        success: false,
        error: userFriendlyMsg,
      };
    }

    // 6. Dapatkan Public URL resmi dari Supabase Storage
    const { data: publicUrlData } = client.storage
      .from(BUCKET_APP_ICONS)
      .getPublicUrl(uploadData?.path || filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        success: false,
        error: 'Gagal memperoleh Public URL dari Supabase Storage.',
      };
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      storagePath: uploadData?.path || filePath,
      fileSize: file.size,
      mimeType: contentType,
    };
  } catch (err: any) {
    console.error('[Icon Storage] Unexpected exception:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan jaringan atau koneksi saat mengunggah file icon ke Supabase.',
    };
  }
}
