# ALCO Hub - Desktop & Web

Pusat kerja ekosistem ALCO untuk digital marketer pemula.

## Menjalankan & Membangun Aplikasi Desktop (Windows)

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Mode Development Desktop
Menjalankan server Vite lokal dan membuka jendela desktop Electron secara bersamaan:
```bash
npm run desktop:dev
```

### 3. Membangun Installer Desktop Windows (.exe NSIS)
Lakukan perintah berikut di lingkungan Windows atau mesin lokal Anda:
```bash
npm run desktop:build
```

Setelah proses build selesai, file installer Windows (`.exe` NSIS) akan tersedia di dalam folder output:
```text
dist-electron/
```

## Menjalankan Mode Web
```bash
npm run dev
```
Akses via browser pada port default (`http://localhost:3000` atau konfigurasi environment Anda).
