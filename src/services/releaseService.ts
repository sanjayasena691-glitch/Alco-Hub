/**
 * ALCO Hub - Release Publisher & Management Service
 * 
 * Bertanggung jawab untuk:
 * 1. Menghitung SHA-256 Checksum file installer di browser secara aman sebelum diunggah
 * 2. Mengunggah file installer .exe dan metadata ke Supabase Edge Function 'publish-release'
 * 3. Memantau progres unggahan secara real-time
 * 4. Menerima URL rilis resmi dari GitHub Releases dan memperbarui state katalog
 */

import { EcosystemApp, ReleaseUploadProgress, ReleaseUploadStatus } from '../types';
import { getSupabase, getSupabaseConfig } from './supabaseClient';

/**
 * Menghitung SHA-256 hash dari File lokal menggunakan Web Crypto API
 */
export async function calculateFileSha256(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (onProgress) onProgress(10);
  
  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(60);

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  if (onProgress) onProgress(90);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  if (onProgress) onProgress(100);
  return hashHex.toLowerCase();
}

export interface PublishReleaseOptions {
  app: EcosystemApp;
  file: File;
  version: string;
  releaseNotes: string;
  onProgress: (progress: ReleaseUploadProgress) => void;
}

/**
 * Memulai alur publikasi rilis ke Supabase Edge Function:
 * - Menghitung SHA-256
 * - Upload file multipart ke /functions/v1/publish-release
 * - Menerima hasil GitHub Release & database update
 */
export async function uploadAndPublishRelease({
  app,
  file,
  version,
  releaseNotes,
  onProgress,
}: PublishReleaseOptions): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const appId = app.appId || app.id;
  const cleanVersion = version.trim();
  const cleanNotes = releaseNotes.trim();

  // 1. Validasi Awal di Client
  if (!file || !file.name.toLowerCase().endsWith('.exe')) {
    const errorMsg = 'File harus berupa installer Windows (.exe).';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file?.size || 0,
      currentStepMessage: 'Gagal validasi file.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  if (!cleanVersion) {
    const errorMsg = 'Nomor versi rilis wajib diisi (contoh: 0.1.1).';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Gagal validasi versi.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // 2. Dapatkan Session Supabase Auth
  const supabase = getSupabase();
  if (!supabase) {
    const errorMsg = 'Koneksi Supabase belum dikonfigurasi. Periksa Pengaturan Supabase.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Supabase tidak terhubung.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData?.session?.access_token) {
    const errorMsg = 'Sesi login Owner tidak ditemukan. Silakan login ulang di Owner Portal.';
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Autentikasi Owner diperlukan.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  const accessToken = sessionData.session.access_token;
  const { url: supabaseUrl } = getSupabaseConfig();

  // 3. STEP: Preparing & Calculating SHA-256
  onProgress({
    status: 'preparing',
    progressPercent: 5,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: 'Menghitung SHA-256 Checksum file installer...',
  });

  let sha256 = '';
  try {
    sha256 = await calculateFileSha256(file, (pct) => {
      onProgress({
        status: 'preparing',
        progressPercent: Math.round(5 + (pct * 0.15)), // 5% -> 20%
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: `Memverifikasi hash SHA-256 (${pct}%)...`,
      });
    });
  } catch (err: any) {
    const errorMsg = `Gagal menghitung SHA-256: ${err?.message || 'Error tidak diketahui'}`;
    onProgress({
      status: 'failed',
      progressPercent: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      currentStepMessage: 'Gagal memproses file lokal.',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // 4. STEP: Uploading via XMLHttpRequest for real-time progress
  onProgress({
    status: 'uploading',
    progressPercent: 20,
    bytesUploaded: 0,
    totalBytes: file.size,
    currentStepMessage: 'Memulai pengunggahan installer ke secure Edge Function...',
    sha256,
  });

  const formData = new FormData();
  formData.append('app_id', appId);
  formData.append('app_name', app.name);
  formData.append('version', cleanVersion);
  formData.append('release_notes', cleanNotes);
  formData.append('sha256', sha256);
  formData.append('file', file, file.name);

  const endpointUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/publish-release`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpointUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    // Upload Progress Listener
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.min(
          90,
          Math.round(20 + ((event.loaded / event.total) * 70))
        );
        onProgress({
          status: 'uploading',
          progressPercent: percentComplete,
          bytesUploaded: event.loaded,
          totalBytes: event.total,
          currentStepMessage: `Mengunggah installer (${Math.round((event.loaded / 1024 / 1024) * 10) / 10} MB / ${Math.round((event.total / 1024 / 1024) * 10) / 10} MB)...`,
          sha256,
        });
      }
    };

    // When upload finishes and server starts processing GitHub & Database
    xhr.upload.onload = () => {
      onProgress({
        status: 'creating_release',
        progressPercent: 92,
        bytesUploaded: file.size,
        totalBytes: file.size,
        currentStepMessage: 'Server sedang membuat GitHub Release & mengunggah binary asset...',
        sha256,
      });
    };

    // Request Completion
    xhr.onload = () => {
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON
      }

      if (xhr.status >= 200 && xhr.status < 300 && responseJson?.success) {
        onProgress({
          status: 'updating_catalog',
          progressPercent: 98,
          bytesUploaded: file.size,
          totalBytes: file.size,
          currentStepMessage: 'Memperbarui metadata rilis di tabel public.apps...',
          sha256,
        });

        setTimeout(() => {
          onProgress({
            status: 'completed',
            progressPercent: 100,
            bytesUploaded: file.size,
            totalBytes: file.size,
            currentStepMessage: 'Rilis berhasil dipublish ke GitHub Releases & Supabase!',
            sha256,
            releaseData: responseJson.data,
          });

          resolve({
            success: true,
            data: responseJson.data,
          });
        }, 600);
      } else {
        const errorMsg =
          responseJson?.error ||
          responseJson?.message ||
          xhr.statusText ||
          `Unggahan rilis gagal (HTTP Status: ${xhr.status})`;

        onProgress({
          status: 'failed',
          progressPercent: 0,
          bytesUploaded: 0,
          totalBytes: file.size,
          currentStepMessage: 'Gagal mempublikasikan rilis.',
          error: errorMsg,
          sha256,
        });

        resolve({
          success: false,
          error: errorMsg,
        });
      }
    };

    // Network / Transport Error
    xhr.onerror = () => {
      const errorMsg =
        'Gagal menghubungi Supabase Edge Function. Pastikan Edge Function "publish-release" telah dideploy di Supabase.';
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: 'Koneksi ke Edge Function gagal.',
        error: errorMsg,
        sha256,
      });

      resolve({
        success: false,
        error: errorMsg,
      });
    };

    // Abort
    xhr.onabort = () => {
      const errorMsg = 'Unggahan dibatalkan oleh pengguna.';
      onProgress({
        status: 'failed',
        progressPercent: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        currentStepMessage: 'Unggahan dibatalkan.',
        error: errorMsg,
      });

      resolve({
        success: false,
        error: errorMsg,
      });
    };

    // Send payload
    xhr.send(formData);
  });
}
