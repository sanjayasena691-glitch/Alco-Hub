const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');

let staticServer = null;
const CONTENT_ENGINE_REGISTRY_URL = process.env.ALCO_CONTENT_ENGINE_REGISTRY_URL
  || 'https://raw.githubusercontent.com/yaladzan92-creator/Alco-Releases/main/registry.json';

function getMimeType(filePath) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };
  return types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function serveProductionApp() {
  return new Promise((resolve, reject) => {
    const distDir = path.resolve(__dirname, '../dist');
    staticServer = http.createServer((request, response) => {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(distDir, relativePath);
      const isSafePath = filePath.startsWith(`${distDir}${path.sep}`);
      const resolvedPath = isSafePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
        ? filePath
        : path.join(distDir, 'index.html');

      fs.readFile(resolvedPath, (error, data) => {
        if (error) {
          response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('ALCO Hub gagal memuat asset aplikasi.');
          return;
        }
        response.writeHead(200, { 'Content-Type': getMimeType(resolvedPath) });
        response.end(data);
      });
    });
    staticServer.once('error', reject);
    staticServer.listen(0, '127.0.0.1', () => resolve(staticServer.address().port));
  });
}

/**
 * Validates if the given URL is a secure HTTPS URL.
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isValidSecureUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getUniqueExistingPaths(pathsToCheck) {
  const seen = new Set();
  return pathsToCheck
    .filter(Boolean)
    .map((candidate) => path.normalize(candidate))
    .filter((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return fs.existsSync(candidate);
    });
}

function buildExecutableCandidates(appDefinition) {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');

  const installRoots = [
    path.join(localAppData, 'Programs'),
    path.join(appData, '..', 'Local', 'Programs'),
    process.env.ProgramFiles || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
  ].filter(Boolean);

  const folderNames = [
    appDefinition.label,
    appDefinition.projectFolder,
    appDefinition.id,
    appDefinition.id?.replace(/^alco-/, ''),
    `ALCO ${appDefinition.id?.replace(/^alco-/, '').replace(/-/g, ' ')}`,
  ].filter(Boolean);

  const installedCandidates = installRoots.flatMap((root) => (
    folderNames.flatMap((folderName) => (
      appDefinition.executableNames.flatMap((executableName) => [
        path.join(root, folderName, executableName),
        path.join(root, executableName),
      ])
    ))
  ));

  const developmentCandidates = appDefinition.executableNames.flatMap((executableName) => [
    path.resolve(__dirname, '..', '..', appDefinition.projectFolder, 'dist-electron', 'win-unpacked', executableName),
    path.resolve(__dirname, '..', '..', 'Alco Ecosystem', appDefinition.projectFolder, 'dist-electron', 'win-unpacked', executableName),
    path.resolve(__dirname, '..', '..', appDefinition.id || '', 'dist-electron', 'win-unpacked', executableName),
  ]);

  return [
    process.env[appDefinition.envKey],
    ...installedCandidates,
    ...developmentCandidates,
  ].filter(Boolean);
}

function resolveDesktopAppExecutable(appDefinition) {
  return getUniqueExistingPaths(buildExecutableCandidates(appDefinition))[0] || null;
}

/**
 * Calculates SHA-256 hash of a file on disk.
 * @param {string} filePath
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
function calculateFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Downloads a file with progress tracking, supporting HTTP redirects (crucial for GitHub Releases).
 * @param {string} rawUrl
 * @param {string} destPath
 * @param {(progress: { bytesReceived: number, totalBytes: number, progress: number }) => void} onProgress
 * @param {number} maxRedirects
 * @returns {Promise<{ destPath: string, totalBytes: number }>}
 */
function downloadFileWithProgress(rawUrl, destPath, onProgress, maxRedirects = 7) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Terlalu banyak pengalihan URL (redirect limit exceeded).'));
    }

    if (!isValidSecureUrl(rawUrl)) {
      return reject(new Error('Download URL harus menggunakan protokol HTTPS yang valid.'));
    }

    const parsedUrl = new URL(rawUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(rawUrl, {
      headers: {
        'User-Agent': 'ALCO-Hub-Desktop-Distribution/1.0',
        'Accept': '*/*',
      },
    }, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;

      // Handle standard HTTP redirects (GitHub releases 302 -> objects.githubusercontent.com / AWS S3)
      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        res.resume();
        const redirectUrl = new URL(location, rawUrl).toString();
        return downloadFileWithProgress(redirectUrl, destPath, onProgress, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        return reject(new Error(`Gagal mengunduh installer (HTTP Status ${statusCode}).`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let bytesReceived = 0;
      let lastReportTime = 0;

      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        bytesReceived += chunk.length;
        fileStream.write(chunk);

        const now = Date.now();
        if (now - lastReportTime > 60 || bytesReceived === totalBytes) {
          lastReportTime = now;
          const progress = totalBytes > 0 ? Math.min(100, Math.round((bytesReceived / totalBytes) * 100)) : 0;
          if (typeof onProgress === 'function') {
            onProgress({ bytesReceived, totalBytes, progress });
          }
        }
      });

      res.on('end', () => {
        fileStream.end(() => {
          resolve({ destPath, totalBytes: bytesReceived });
        });
      });

      res.on('error', (err) => {
        fileStream.destroy();
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    });

    req.on('error', (err) => {
      try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch {}
      reject(err);
    });

    req.setTimeout(60000, () => {
      req.destroy(new Error('Koneksi timeout saat mengunduh installer dari GitHub.'));
    });
  });
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildPackageJsonCandidates(appDefinition, executablePath) {
  const executableDirectory = executablePath ? path.dirname(executablePath) : null;
  const packagedCandidates = executableDirectory
    ? [
        path.join(executableDirectory, 'resources', 'app.asar', 'package.json'),
        path.join(executableDirectory, 'resources', 'app', 'package.json'),
        path.join(executableDirectory, 'resources', 'app.asar.unpacked', 'package.json'),
        path.resolve(executableDirectory, '..', '..', 'package.json'),
      ]
    : [];

  return [
    process.env[`${appDefinition.envKey}_PACKAGE_JSON`],
    ...packagedCandidates,
    path.resolve(__dirname, '..', '..', appDefinition.projectFolder, 'package.json'),
    path.resolve(__dirname, '..', '..', 'Alco Ecosystem', appDefinition.projectFolder, 'package.json'),
  ].filter(Boolean);
}

function getLocalAppVersion(appDefinition, executablePath) {
  const packagePath = getUniqueExistingPaths(buildPackageJsonCandidates(appDefinition, executablePath))
    .find((candidate) => {
      const packageJson = readJsonFile(candidate);
      return typeof packageJson?.version === 'string' && packageJson.version.trim().length > 0;
    });

  if (!packagePath) {
    return { version: null, source: null };
  }

  const packageJson = readJsonFile(packagePath);
  return {
    version: packageJson.version.trim(),
    source: packagePath,
  };
}

function normalizeVersion(version) {
  if (typeof version !== 'string') return null;
  const cleaned = version.trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || '',
  };
}

function compareSemanticVersions(leftVersion, rightVersion) {
  const left = normalizeVersion(leftVersion);
  const right = normalizeVersion(rightVersion);
  if (!left || !right) return null;

  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] > right[key]) return 1;
    if (left[key] < right[key]) return -1;
  }

  if (left.prerelease === right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  return left.prerelease.localeCompare(right.prerelease);
}

function fetchJsonWithTimeout(rawUrl, timeoutMs = 5000, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (!isValidSecureUrl(rawUrl)) {
      reject(new Error('Registry URL harus HTTPS.'));
      return;
    }

    const request = https.get(rawUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ALCO-Hub-Update-Checker',
      },
      timeout: timeoutMs,
    }, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if ([301, 302, 303, 307, 308].includes(statusCode) && typeof location === 'string') {
        response.resume();
        if (redirectCount >= 3) {
          reject(new Error('Registry redirect terlalu banyak.'));
          return;
        }
        const redirectUrl = new URL(location, rawUrl).toString();
        fetchJsonWithTimeout(redirectUrl, timeoutMs, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Registry gagal diakses. Status ${statusCode}.`));
        return;
      }

      let rawData = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        rawData += chunk;
        if (rawData.length > 1024 * 1024) {
          request.destroy(new Error('Registry terlalu besar.'));
        }
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch {
          reject(new Error('Registry bukan JSON valid.'));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Registry timeout.'));
    });
    request.on('error', reject);
  });
}

function getContentEngineRegistryEntry(registry) {
  if (!registry || typeof registry !== 'object') {
    return null;
  }
  const entry = registry?.apps?.['alco-content-engine'];
  return entry && typeof entry === 'object' ? entry : null;
}

function validateRegistryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, error: 'Entry ALCO Content Engine tidak ditemukan di registry.' };
  }
  const requiredFields = ['latestVersion', 'status', 'downloadUrl', 'sha256'];
  const missingFields = requiredFields.filter((field) => typeof entry?.[field] !== 'string' || entry[field].trim().length === 0);
  if (missingFields.length > 0) {
    return { valid: false, error: `Registry field tidak valid: ${missingFields.join(', ')}.` };
  }
  if (!normalizeVersion(entry.latestVersion)) {
    return { valid: false, error: 'latestVersion bukan semantic version valid.' };
  }
  if (!isValidSecureUrl(entry.downloadUrl)) {
    return { valid: false, error: 'downloadUrl harus HTTPS.' };
  }
  if (!/^[a-f0-9]{64}$/i.test(entry.sha256.trim())) {
    return { valid: false, error: 'sha256 harus berisi 64 karakter hex.' };
  }
  return {
    valid: true,
    data: {
      latestVersion: entry.latestVersion.trim(),
      status: entry.status.trim(),
      downloadUrl: entry.downloadUrl.trim(),
      sha256: entry.sha256.trim(),
    },
  };
}

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.resolve(__dirname, '..', 'Icon Alco Hub.png');

  const mainWindow = new BrowserWindow({
    title: 'ALCO Hub',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Remove default application menu for a clean desktop feel
  mainWindow.setMenuBarVisibility(false);

  // Determine development vs production environment
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    serveProductionApp()
      .then((port) => mainWindow.loadURL(`http://127.0.0.1:${port}`))
      .catch((error) => console.error('[Electron] Failed to start local Hub server:', error));
  }

  // Prevent internal in-app navigation to external websites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isValidSecureUrl(navigationUrl)) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Handle target="_blank" window opens safely via system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isValidSecureUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// IPC handler for secure external link opening requested via preload API
ipcMain.handle('open-external', async (_event, rawUrl) => {
  if (isValidSecureUrl(rawUrl)) {
    await shell.openExternal(rawUrl);
    return { success: true };
  }
  return { success: false, error: 'Hanya URL HTTPS yang diizinkan.' };
});

const desktopApps = {
  'alco-content-engine': {
    id: 'alco-content-engine',
    label: 'ALCO Content Engine',
    envKey: 'ALCO_CONTENT_ENGINE_EXE',
    projectFolder: 'Alco Content Engine',
    executableNames: ['ALCO Content Engine.exe', 'alco-content-engine.exe', 'electron.exe'],
  },
  'content-engine': {
    id: 'alco-content-engine',
    label: 'ALCO Content Engine',
    envKey: 'ALCO_CONTENT_ENGINE_EXE',
    projectFolder: 'Alco Content Engine',
    executableNames: ['ALCO Content Engine.exe', 'alco-content-engine.exe', 'electron.exe'],
  },
  'alco-auto-motion': {
    id: 'alco-auto-motion',
    label: 'ALCO Auto Motion',
    envKey: 'ALCO_AUTO_MOTION_EXE',
    projectFolder: 'Alco Auto Motion',
    executableNames: ['ALCO Auto Motion.exe', 'alco-auto-motion.exe', 'electron.exe'],
  },
  'auto-motion': {
    id: 'alco-auto-motion',
    label: 'ALCO Auto Motion',
    envKey: 'ALCO_AUTO_MOTION_EXE',
    projectFolder: 'Alco Auto Motion',
    executableNames: ['ALCO Auto Motion.exe', 'alco-auto-motion.exe', 'electron.exe'],
  },
  'alco-creative-system': {
    id: 'alco-creative-system',
    label: 'ALCO Creative System',
    envKey: 'ALCO_CREATIVE_SYSTEM_EXE',
    projectFolder: 'Alco Creative System',
    executableNames: ['ALCO Creative System.exe', 'alco-creative-system.exe', 'electron.exe'],
  },
  'creative-system': {
    id: 'alco-creative-system',
    label: 'ALCO Creative System',
    envKey: 'ALCO_CREATIVE_SYSTEM_EXE',
    projectFolder: 'Alco Creative System',
    executableNames: ['ALCO Creative System.exe', 'alco-creative-system.exe', 'electron.exe'],
  },
  'alco-product-forge': {
    id: 'alco-product-forge',
    label: 'ALCO Product Forge',
    envKey: 'ALCO_PRODUCT_FORGE_EXE',
    projectFolder: 'Alco Product Forge',
    executableNames: ['ALCO Product Forge.exe', 'alco-product-forge.exe', 'electron.exe'],
  },
  'product-forge': {
    id: 'alco-product-forge',
    label: 'ALCO Product Forge',
    envKey: 'ALCO_PRODUCT_FORGE_EXE',
    projectFolder: 'Alco Product Forge',
    executableNames: ['ALCO Product Forge.exe', 'alco-product-forge.exe', 'electron.exe'],
  },
  'alco-meta-ads-analyst': {
    id: 'alco-meta-ads-analyst',
    label: 'ALCO Meta Ads Analyst',
    envKey: 'ALCO_META_ADS_ANALYST_EXE',
    projectFolder: 'Alco Meta Ads Analyst',
    executableNames: ['ALCO Meta Ads Analyst.exe', 'alco-meta-ads-analyst.exe', 'electron.exe'],
  },
  'meta-ads-analyst': {
    id: 'alco-meta-ads-analyst',
    label: 'ALCO Meta Ads Analyst',
    envKey: 'ALCO_META_ADS_ANALYST_EXE',
    projectFolder: 'Alco Meta Ads Analyst',
    executableNames: ['ALCO Meta Ads Analyst.exe', 'alco-meta-ads-analyst.exe', 'electron.exe'],
  },
  'alco-landing-page-analyst': {
    id: 'alco-landing-page-analyst',
    label: 'ALCO Landing Page Analyst',
    envKey: 'ALCO_LANDING_PAGE_ANALYST_EXE',
    projectFolder: 'Alco Landing Page Analyst',
    executableNames: ['ALCO Landing Page Analyst.exe', 'alco-landing-page-analyst.exe', 'electron.exe'],
  },
  'landing-page-analyst': {
    id: 'alco-landing-page-analyst',
    label: 'ALCO Landing Page Analyst',
    envKey: 'ALCO_LANDING_PAGE_ANALYST_EXE',
    projectFolder: 'Alco Landing Page Analyst',
    executableNames: ['ALCO Landing Page Analyst.exe', 'alco-landing-page-analyst.exe', 'electron.exe'],
  },
};

/**
 * Resolves desktop app definition for known or dynamically created ALCO apps
 */
function getAppDefinition(appId, customApp) {
  const normalizedId = (appId || '').toLowerCase().trim();
  const slugWithoutPrefix = normalizedId.replace(/^alco-/, '');
  const known = desktopApps[normalizedId] || desktopApps[slugWithoutPrefix];
  if (known) return known;

  const rawLabel = customApp?.name || `ALCO ${slugWithoutPrefix.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`;
  return {
    id: normalizedId,
    label: rawLabel,
    envKey: `ALCO_${normalizedId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_EXE`,
    projectFolder: rawLabel,
    executableNames: [`${rawLabel}.exe`, `${slugWithoutPrefix}.exe`, 'electron.exe'],
  };
}

// 1. Check if a single desktop app is installed on the system
ipcMain.handle('check-app-installed', async (_event, appId) => {
  const appDefinition = getAppDefinition(appId);
  const executablePath = resolveDesktopAppExecutable(appDefinition);
  if (!executablePath) {
    return { isInstalled: false, version: null, executablePath: null };
  }
  const localVersion = getLocalAppVersion(appDefinition, executablePath);
  return {
    isInstalled: true,
    version: localVersion.version,
    executablePath,
  };
});

// 2. Check all known apps installation statuses
ipcMain.handle('check-all-apps-installed', async () => {
  const results = {};
  const processedKeys = new Set();

  for (const key of Object.keys(desktopApps)) {
    const appDef = desktopApps[key];
    const canonicalId = appDef.id || key;
    if (processedKeys.has(canonicalId)) continue;
    processedKeys.add(canonicalId);

    const executablePath = resolveDesktopAppExecutable(appDef);
    if (executablePath) {
      const localVersion = getLocalAppVersion(appDef, executablePath);
      const res = {
        isInstalled: true,
        version: localVersion.version,
        executablePath,
      };
      results[canonicalId] = res;
      results[key] = res;
      if (canonicalId.replace(/^alco-/, '') !== canonicalId) {
        results[canonicalId.replace(/^alco-/, '')] = res;
      }
    } else {
      const res = {
        isInstalled: false,
        version: null,
        executablePath: null,
      };
      results[canonicalId] = res;
      results[key] = res;
    }
  }
  return results;
});

// 3. Generic installer download, SHA-256 integrity verification, and execution
ipcMain.handle('download-and-install-app', async (event, params) => {
  const { appId, downloadUrl, sha256, latestVersion, appName } = params || {};

  if (!appId) {
    return { success: false, error: 'App ID tidak ditemukan.' };
  }

  if (!downloadUrl || !isValidSecureUrl(downloadUrl)) {
    return { success: false, error: 'Download URL tidak valid atau tidak menggunakan protokol HTTPS resmi.' };
  }

  const cleanExpectedHash = (sha256 || '').trim().toLowerCase();
  if (!cleanExpectedHash || cleanExpectedHash.length !== 64) {
    return {
      success: false,
      error: 'SHA-256 Checksum resmi tidak ditemukan atau tidak valid (harus 64 karakter hex).',
    };
  }

  const sendProgress = (status, progress, bytesReceived = 0, totalBytes = 0, message = '', error = '') => {
    try {
      event.sender.send('install-progress', {
        appId,
        status,
        progress,
        bytesReceived,
        totalBytes,
        message,
        error,
      });
    } catch (e) {
      console.warn('[Electron] Failed to send install-progress IPC event:', e);
    }
  };

  // Setup temporary directory in user temp space
  const tempDir = path.join(app.getPath('temp'), 'alco-hub-downloads');
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    return { success: false, error: `Gagal membuat direktori download: ${err.message}` };
  }

  const sanitizedAppId = appId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempDownloadPath = path.join(tempDir, `${sanitizedAppId}-${Date.now()}.download.tmp`);
  const finalInstallerPath = path.join(tempDir, `${sanitizedAppId}-${latestVersion || 'setup'}.exe`);

  try {
    // Phase 1: Download binary stream with progress
    sendProgress('downloading', 0, 0, 0, 'Memulai download installer dari GitHub Releases...');

    await downloadFileWithProgress(downloadUrl, tempDownloadPath, ({ bytesReceived, totalBytes, progress }) => {
      sendProgress('downloading', progress, bytesReceived, totalBytes, `Mengunduh installer (${progress}%)...`);
    });

    // Phase 2: SHA-256 Integrity Verification
    sendProgress('verifying', 100, 0, 0, 'Memverifikasi checksum SHA-256 binary installer...');

    const computedHash = await calculateFileSha256(tempDownloadPath);

    if (computedHash.toLowerCase() !== cleanExpectedHash) {
      // Clean up corrupt or unverified downloaded file immediately
      try {
        if (fs.existsSync(tempDownloadPath)) fs.unlinkSync(tempDownloadPath);
      } catch {}

      const errorMsg = 'Installer verification failed. Checksum SHA-256 tidak cocok dengan metadata rilis resmi.';
      sendProgress('failed', 0, 0, 0, '', errorMsg);
      return { success: false, error: errorMsg };
    }

    // Phase 3: Finalize installer file path
    try {
      if (fs.existsSync(finalInstallerPath)) fs.unlinkSync(finalInstallerPath);
      fs.renameSync(tempDownloadPath, finalInstallerPath);
    } catch (err) {
      fs.copyFileSync(tempDownloadPath, finalInstallerPath);
      try { fs.unlinkSync(tempDownloadPath); } catch {}
    }

    // Phase 4: Execute installer via detached process
    sendProgress('installing', 100, 0, 0, 'Menjalankan installer di Windows...');

    try {
      if (process.platform === 'win32') {
        const child = spawn(finalInstallerPath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
      } else {
        await shell.openPath(finalInstallerPath);
      }
    } catch (spawnErr) {
      const openErr = await shell.openPath(finalInstallerPath);
      if (openErr) {
        throw new Error(`Gagal membuka installer: ${spawnErr?.message || openErr}`);
      }
    }

    sendProgress('ready-to-install', 100, 0, 0, 'Installer telah dibuka. Selesaikan langkah instalasi di komputer Anda.');

    return {
      success: true,
      message: 'Installer berhasil diunduh, diverifikasi, dan dijalankan.',
    };
  } catch (err) {
    try {
      if (fs.existsSync(tempDownloadPath)) fs.unlinkSync(tempDownloadPath);
    } catch {}

    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat proses download & install.';
    sendProgress('failed', 0, 0, 0, '', errorMsg);
    return { success: false, error: errorMsg };
  }
});

// 4. Open Desktop App
ipcMain.handle('open-desktop-app', async (_event, appId) => {
  const appDefinition = getAppDefinition(appId);
  const executablePath = resolveDesktopAppExecutable(appDefinition);
  if (!executablePath) {
    return {
      success: false,
      error: `${appDefinition.label} belum ditemukan di komputer ini. Silakan pasang installer terlebih dahulu melalui ALCO Hub.`,
    };
  }

  const errorMessage = await shell.openPath(executablePath);
  return errorMessage
    ? { success: false, error: errorMessage }
    : { success: true };
});

ipcMain.handle('check-content-engine-update', async () => {
  const appDefinition = desktopApps['content-engine'];
  const executablePath = resolveDesktopAppExecutable(appDefinition);
  const localVersion = getLocalAppVersion(appDefinition, executablePath);

  try {
    const registry = await fetchJsonWithTimeout(CONTENT_ENGINE_REGISTRY_URL);
    const registryEntry = getContentEngineRegistryEntry(registry);
    const validation = validateRegistryEntry(registryEntry);

    if (!validation.valid) {
      return {
        success: false,
        status: 'unable-to-check',
        error: validation.error,
        localVersion: localVersion.version,
        localVersionSource: localVersion.source,
        executablePath,
        registryUrl: CONTENT_ENGINE_REGISTRY_URL,
      };
    }

    if (!localVersion.version) {
      return {
        success: true,
        status: 'unable-to-check',
        error: 'Versi lokal ALCO Content Engine tidak ditemukan.',
        localVersion: null,
        localVersionSource: null,
        executablePath,
        registry: validation.data,
        registryUrl: CONTENT_ENGINE_REGISTRY_URL,
      };
    }

    const comparison = compareSemanticVersions(localVersion.version, validation.data.latestVersion);
    if (comparison === null) {
      return {
        success: false,
        status: 'unable-to-check',
        error: 'Versi lokal bukan semantic version valid.',
        localVersion: localVersion.version,
        localVersionSource: localVersion.source,
        executablePath,
        registry: validation.data,
        registryUrl: CONTENT_ENGINE_REGISTRY_URL,
      };
    }

    return {
      success: true,
      status: comparison < 0 ? 'update-available' : 'up-to-date',
      localVersion: localVersion.version,
      localVersionSource: localVersion.source,
      latestVersion: validation.data.latestVersion,
      executablePath,
      registry: validation.data,
      registryUrl: CONTENT_ENGINE_REGISTRY_URL,
    };
  } catch (error) {
    return {
      success: false,
      status: 'unable-to-check',
      error: error instanceof Error ? error.message : 'Update check gagal.',
      localVersion: localVersion.version,
      localVersionSource: localVersion.source,
      executablePath,
      registryUrl: CONTENT_ENGINE_REGISTRY_URL,
    };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
