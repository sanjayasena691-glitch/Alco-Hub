# Panduan Deployment Supabase Edge Function: `publish-release`

Edge Function ini bertindak sebagai backend server-side yang aman untuk mengunggah installer `.exe` dari ALCO Hub Owner Portal ke **GitHub Releases** dan memperbarui metadata di tabel `public.apps`.

---

## 1. Keamanan & Kebijakan Rahasia (Secrets)

**JANGAN PERNAH** menyimpan `GITHUB_TOKEN` di client React atau build Electron. Token GitHub hanya disimpan di **Supabase Edge Function Secrets**.

### Rahasia yang Dibutuhkan di Supabase:

| Nama Secret | Wajib? | Contoh / Keterangan |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | **WAJIB** | Personal Access Token (PAT) GitHub dengan scope `repo` (atau fine-grained: `Contents: Read and write`) |
| `GITHUB_REPO_OWNER` | Opsional | Akun/Org pemilik repo (Default: `yaladzan92-creator`) |
| `GITHUB_REPO_NAME` | Opsional | Nama repositori rilis (Default: `Alco-Releases`) |

---

## 2. Cara Setting Secrets di Supabase

### Opsi A: Melalui Dashboard Supabase (Web GUI)
1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih Project Anda.
3. Buka menu **Project Settings** (ikon gear di kiri bawah) > **Edge Functions** > **Secrets**.
4. Klik **Add new secret**:
   - Name: `GITHUB_TOKEN`
   - Value: `ghp_xxxxxxxxxxxxxxxxxxxx` (Token GitHub Anda)
5. Tambahkan juga `GITHUB_REPO_OWNER` (`yaladzan92-creator`) dan `GITHUB_REPO_NAME` (`Alco-Releases`) jika ingin override.

### Opsi B: Melalui Supabase CLI
```bash
# Login Supabase CLI jika belum
npx supabase login

# Link project Anda (ganti <project-ref> dengan ID proyek Supabase Anda)
npx supabase link --project-ref <project-ref>

# Set Secret
npx supabase secrets set GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
npx supabase secrets set GITHUB_REPO_OWNER=yaladzan92-creator
npx supabase secrets set GITHUB_REPO_NAME=Alco-Releases
```

---

## 3. Cara Deploy Edge Function

Jalankan perintah berikut di terminal:

```bash
# Deploy function publish-release
npx supabase functions deploy publish-release --no-verify-jwt
```

> **Catatan `--no-verify-jwt`**: Verifikasi JWT tetap dilakukan secara ketat di dalam kode fungsi menggunakan `supabaseAuthClient.auth.getUser(token)` dan pengecekan role di `public.admin_users` untuk memastikan hanya Owner yang memiliki izin.

---

## 4. Format Request yang Diterima

- **Endpoint**: `POST https://<project-ref>.supabase.co/functions/v1/publish-release`
- **Headers**:
  - `Authorization: Bearer <user_access_token>`
- **Body**: `multipart/form-data`
  - `app_id`: `alco-content-engine`
  - `app_name`: `ALCO Content Engine`
  - `version`: `0.1.1`
  - `release_notes`: `Catatan rilis...`
  - `sha256`: `b3c8...` (dihitung oleh ALCO Hub client)
  - `file`: binary `.exe`
