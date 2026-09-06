/**
 * ALCO Hub - Supabase Edge Function: publish-release
 * 
 * Secure Server-Side GitHub Release Publisher & Catalog Updater
 * 
 * ALUR & KEAMANAN:
 * 1. Memverifikasi JWT Supabase Auth pengirim request
 * 2. Memeriksa tabel public.admin_users untuk memastikan user memiliki role 'owner'
 * 3. Membaca GITHUB_TOKEN & konfigurasi repositori dari Supabase Edge Function Secrets
 * 4. Membuat GitHub Tag & Release resmi (format: {app_id}-v{version})
 * 5. Mengunggah file installer .exe sebagai release asset ke GitHub Releases
 * 6. Mengambil URL unduhan resmi (browser_download_url) dari GitHub
 * 7. Memperbarui tabel public.apps (latest_version, download_url, sha256, release_notes, updated_at)
 * 8. Mengembalikan ringkasan rilis tanpa pernah membocorkan token GitHub ke client
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Metode HTTP tidak diizinkan. Gunakan POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. Verifikasi Autentikasi Pengguna
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Akses ditolak: Header Authorization Supabase Auth tidak ditemukan.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Konfigurasi environment Supabase server belum lengkap (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client untuk verifikasi user
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login ulang sebagai Owner.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verifikasi Role Owner di public.admin_users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRecord, error: adminQueryError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    if (adminQueryError || !adminRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Akses ditolak: Akun Anda tidak memiliki role Owner di tabel public.admin_users.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validasi GitHub Secrets di Server
    const githubToken = Deno.env.get('GITHUB_TOKEN') || Deno.env.get('GITHUB_PAT');
    const githubOwner = Deno.env.get('GITHUB_REPO_OWNER') || 'yaladzan92-creator';
    const githubRepo = Deno.env.get('GITHUB_REPO_NAME') || 'Alco-Releases';

    if (!githubToken || !githubToken.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'GITHUB_TOKEN secret belum dikonfigurasi di Supabase Edge Function Secrets. Silakan tambahkan secret GITHUB_TOKEN di Dashboard Supabase (Project Settings > Edge Functions > Secrets) atau jalankan "supabase secrets set GITHUB_TOKEN=...".',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Ekstraksi Payload & File Form Data
    const formData = await req.formData();
    const appId = ((formData.get('app_id') as string) || '').trim();
    const appName = ((formData.get('app_name') as string) || '').trim() || appId;
    const version = ((formData.get('version') as string) || '').trim();
    const releaseNotes = ((formData.get('release_notes') as string) || '').trim();
    const sha256 = ((formData.get('sha256') as string) || '').trim();
    const file = formData.get('file') as File | null;

    if (!appId) {
      return new Response(
        JSON.stringify({ success: false, error: 'App ID wajib dipilih.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!version) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nomor versi rilis wajib diisi (contoh: 0.1.1).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file || typeof file.size !== 'number' || file.size === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'File installer Windows (.exe) wajib disertakan dan tidak boleh kosong.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file.name.toLowerCase().endsWith('.exe')) {
      return new Response(
        JSON.stringify({ success: false, error: 'File yang diunggah harus berekstensi .exe.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sha256) {
      return new Response(
        JSON.stringify({ success: false, error: 'SHA-256 Checksum wajib dihitung sebelum mengunggah rilis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pastikan app terdaftar di database
    const { data: existingApp, error: appFetchError } = await supabaseAdmin
      .from('apps')
      .select('id, app_id, name, published')
      .eq('app_id', appId)
      .maybeSingle();

    if (appFetchError || !existingApp) {
      return new Response(
        JSON.stringify({ success: false, error: `Aplikasi dengan App ID "${appId}" tidak ditemukan di katalog Supabase.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Buat GitHub Release
    const tagName = `${appId}-v${version}`;
    const releaseTitle = `${appName} v${version}`;
    const releaseBody = releaseNotes || `Rilis resmi ${appName} versi v${version} didistribusikan melalui ALCO Hub Private Store.`;

    const githubApiHeaders = {
      Authorization: `Bearer ${githubToken.trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ALCO-Hub-Release-Manager/1.0',
    };

    const createReleaseUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases`;
    let releaseData: any = null;

    const createReleaseResponse = await fetch(createReleaseUrl, {
      method: 'POST',
      headers: {
        ...githubApiHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: releaseTitle,
        body: releaseBody,
        draft: false,
        prerelease: false,
      }),
    });

    if (createReleaseResponse.status === 422) {
      // Release dengan tag tersebut mungkin sudah ada, ambil datanya
      const getTagResponse = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/tags/${encodeURIComponent(tagName)}`,
        { headers: githubApiHeaders }
      );
      if (getTagResponse.ok) {
        releaseData = await getTagResponse.json();
      } else {
        const errText = await createReleaseResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `Gagal membuat tag rilis di GitHub (422 Unprocessable): ${errText}`,
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!createReleaseResponse.ok) {
      const errText = await createReleaseResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Gagal membuat release di repositori GitHub ${githubOwner}/${githubRepo} (${createReleaseResponse.status}): ${errText}`,
        }),
        { status: createReleaseResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      releaseData = await createReleaseResponse.json();
    }

    if (!releaseData || !releaseData.id || !releaseData.upload_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GitHub API tidak mengembalikan upload_url yang valid untuk rilis ini.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Bersihkan asset lama dengan nama yang sama jika ada (untuk overwrite bersih)
    const cleanFileName = file.name;
    if (Array.isArray(releaseData.assets)) {
      const existingAsset = releaseData.assets.find((a: any) => a.name === cleanFileName);
      if (existingAsset && existingAsset.id) {
        await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/assets/${existingAsset.id}`,
          {
            method: 'DELETE',
            headers: githubApiHeaders,
          }
        );
      }
    }

    // 8. Upload File Binary ke GitHub Release Asset
    const uploadUrlRaw = releaseData.upload_url as string;
    const cleanUploadUrl = uploadUrlRaw.replace(/\{.*?\}/, `?name=${encodeURIComponent(cleanFileName)}`);
    const fileBytes = await file.arrayBuffer();

    const uploadAssetResponse = await fetch(cleanUploadUrl, {
      method: 'POST',
      headers: {
        ...githubApiHeaders,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBytes,
    });

    if (!uploadAssetResponse.ok) {
      const assetErrText = await uploadAssetResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Gagal mengunggah file installer ke GitHub Releases (${uploadAssetResponse.status}): ${assetErrText}`,
        }),
        { status: uploadAssetResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assetData = await uploadAssetResponse.json();
    const browserDownloadUrl = assetData.browser_download_url as string;

    if (!browserDownloadUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GitHub Release Asset berhasil diunggah tetapi browser_download_url tidak ditemukan.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Perbarui Metadata Aplikasi di Supabase (public.apps)
    // PENTING: Jangan ubah kolom 'published' secara otomatis agar Owner dapat memverifikasi sebelum rilis publik
    const { error: updateCatalogError } = await supabaseAdmin
      .from('apps')
      .update({
        latest_version: version,
        download_url: browserDownloadUrl,
        sha256: sha256.toLowerCase().trim(),
        release_notes: releaseNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('app_id', appId);

    if (updateCatalogError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Installer berhasil diunggah ke GitHub Releases (${browserDownloadUrl}), namun pembaruan katalog Supabase gagal: ${updateCatalogError.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Respon Berhasil
    return new Response(
      JSON.stringify({
        success: true,
        message: `Rilis ${appName} v${version} berhasil diunggah ke GitHub Releases dan katalog Supabase telah diperbarui.`,
        data: {
          appId,
          version,
          tag: tagName,
          releaseName: releaseTitle,
          downloadUrl: browserDownloadUrl,
          sha256: sha256.toLowerCase().trim(),
          htmlUrl: releaseData.html_url,
          fileName: cleanFileName,
          published: existingApp.published,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal Server Error: ${error?.message || 'Terjadi kesalahan tidak terduga pada Edge Function.'}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
