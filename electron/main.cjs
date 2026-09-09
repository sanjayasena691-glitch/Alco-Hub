const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
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

/**
 * Helper to fetch JSON from GitHub API (supports HTTPS redirects and official User-Agent).
 */
function fetchGitHubApiJson(apiUrl, token = '') {
  return new Promise((resolve, reject) => {
    if (!isValidSecureUrl(apiUrl)) {
      return reject(new Error('GitHub API URL harus HTTPS.'));
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ALCO-Hub-Desktop-Distribution/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const req = https.get(apiUrl, { headers, timeout: 8000 }, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;

      if ([301, 302, 307, 308].includes(statusCode) && location) {
        res.resume();
        const redirectUrl = new URL(location, apiUrl).toString();
        return fetchGitHubApiJson(redirectUrl, token).then(resolve).catch(reject);
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        return reject(new Error(`GitHub API returned status ${statusCode}`));
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Format respons GitHub API tidak valid.'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('GitHub API request timed out'));
    });
    req.on('error', reject);
  });
}

/**
 * Resolves actual GitHub Release binary asset dynamically.
 * Tolerant against typos in tags (e.g. "alco-creative-sytem-v1.0.2" vs "alco-creative-system-v1.0.2")
 * or discrepancies in filenames ("ALCO.Creative.System.Setup.1.0.2.exe").
 */
async function resolveGitHubReleaseAsset({
  appId,
  latestVersion,
  metadataDownloadUrl,
  appName,
  repoOwner = 'yaladzan92-creator',
  repoName = 'Alco-Releases',
}) {
  const cleanAppId = (appId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanVersion = (latestVersion || '').trim().replace(/^v/i, '');

  let targetOwner = repoOwner;
  let targetRepo = repoName;
  let tagHint = '';
  let fileHint = '';

  if (metadataDownloadUrl) {
    try {
      const parsed = new URL(metadataDownloadUrl);
      const parts = parsed.pathname.split('/').filter(Boolean);
      // Format: /owner/repo/releases/download/tagName/fileName.exe
      if (parts.length >= 6 && parts[2] === 'releases' && parts[3] === 'download') {
        targetOwner = parts[0] || repoOwner;
        targetRepo = parts[1] || repoName;
        tagHint = decodeURIComponent(parts[4] || '');
        fileHint = decodeURIComponent(parts[5] || '');
      }
    } catch {}
  }

  const appKeywords = [
    cleanAppId,
    cleanAppId.replace(/^alco-/, ''),
    (appName || '').toLowerCase(),
  ]
    .flatMap((s) => s.split(/[^a-z0-9]+/))
    .filter((w) => w.length >= 3);

  // 1. Try direct specific tag URL if tagHint is present
  if (tagHint) {
    try {
      const tagUrl = `https://api.github.com/repos/${targetOwner}/${targetRepo}/releases/tags/${encodeURIComponent(tagHint)}`;
      const tagRel = await fetchGitHubApiJson(tagUrl);
      if (tagRel && Array.isArray(tagRel.assets) && tagRel.assets.length > 0) {
        const matched =
          tagRel.assets.find((a) => fileHint && a.name?.toLowerCase() === fileHint.toLowerCase()) ||
          tagRel.assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) ||
          tagRel.assets[0];

        if (matched && (matched.browser_download_url || matched.url)) {
          return {
            found: true,
            downloadUrl: matched.browser_download_url || matched.url,
            releaseTag: tagRel.tag_name,
            assetFilename: matched.name,
            size: matched.size || 0,
            version: cleanVersion || tagRel.tag_name.replace(/.*v/i, ''),
          };
        }
      }
    } catch {}
  }

  // 2. Query all releases from GitHub Releases API
  try {
    const listUrl = `https://api.github.com/repos/${targetOwner}/${targetRepo}/releases?per_page=100`;
    const releases = await fetchGitHubApiJson(listUrl);

    if (Array.isArray(releases) && releases.length > 0) {
      let matchedRelease = null;

      // Priority 1: Match tag or name with both version and app keyword
      for (const rel of releases) {
        const rTag = (rel.tag_name || '').toLowerCase();
        const rTitle = (rel.name || '').toLowerCase();

        const hasVer = cleanVersion ? (rTag.includes(cleanVersion) || rTitle.includes(cleanVersion)) : true;
        const hasApp = appKeywords.some((kw) => rTag.includes(kw) || rTitle.includes(kw));

        if (hasVer && hasApp) {
          matchedRelease = rel;
          break;
        }
      }

      // Priority 2: Match app keyword with latest version in tag
      if (!matchedRelease) {
        for (const rel of releases) {
          const rTag = (rel.tag_name || '').toLowerCase();
          const rTitle = (rel.name || '').toLowerCase();
          const hasApp = appKeywords.some((kw) => rTag.includes(kw) || rTitle.includes(kw));
          if (hasApp) {
            matchedRelease = rel;
            break;
          }
        }
      }

      // Priority 3: Fallback match on version alone
      if (!matchedRelease && cleanVersion) {
        matchedRelease = releases.find((rel) => (rel.tag_name || '').toLowerCase().includes(cleanVersion));
      }

      if (matchedRelease && Array.isArray(matchedRelease.assets) && matchedRelease.assets.length > 0) {
        const matchedAsset =
          matchedRelease.assets.find((a) => fileHint && a.name?.toLowerCase() === fileHint.toLowerCase()) ||
          matchedRelease.assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) ||
          matchedRelease.assets[0];

        if (matchedAsset && (matchedAsset.browser_download_url || matchedAsset.url)) {
          const verMatch = (matchedRelease.tag_name || '').match(/v?([0-9]+(\.[0-9]+)+)/i);
          const resolvedVer = verMatch ? verMatch[1] : cleanVersion || '1.0.0';

          return {
            found: true,
            downloadUrl: matchedAsset.browser_download_url || matchedAsset.url,
            releaseTag: matchedRelease.tag_name,
            assetFilename: matchedAsset.name,
            size: matchedAsset.size || 0,
            version: resolvedVer,
          };
        }
      }
    }
  } catch {}

  // 3. Fallback using GitHub CLI if available in environment
  try {
    const listRes = await execGhCommand([
      'release',
      'list',
      '--repo',
      `${targetOwner}/${targetRepo}`,
      '--json',
      'tagName,name,isLatest',
    ]);
    if (listRes.code === 0 && listRes.stdout) {
      const releases = JSON.parse(listRes.stdout);
      const matchedRel =
        releases.find((r) => {
          const rTag = (r.tagName || '').toLowerCase();
          const rTitle = (r.name || '').toLowerCase();
          const hasVer = cleanVersion ? (rTag.includes(cleanVersion) || rTitle.includes(cleanVersion)) : true;
          const hasApp = appKeywords.some((kw) => rTag.includes(kw) || rTitle.includes(kw));
          return hasVer && hasApp;
        }) || (cleanVersion ? releases.find((r) => (r.tagName || '').toLowerCase().includes(cleanVersion)) : null);

      if (matchedRel) {
        const viewRes = await execGhCommand([
          'release',
          'view',
          matchedRel.tagName,
          '--repo',
          `${targetOwner}/${targetRepo}`,
          '--json',
          'tagName,name,url,assets',
        ]);
        if (viewRes.code === 0 && viewRes.stdout) {
          const viewData = JSON.parse(viewRes.stdout);
          if (Array.isArray(viewData.assets) && viewData.assets.length > 0) {
            const exeAsset =
              viewData.assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) || viewData.assets[0];
            let dlUrl = exeAsset.browser_download_url || exeAsset.url;
            if (!dlUrl || !dlUrl.includes('/releases/download/')) {
              dlUrl = `https://github.com/${targetOwner}/${targetRepo}/releases/download/${encodeURIComponent(viewData.tagName)}/${encodeURIComponent(exeAsset.name)}`;
            }

            return {
              found: true,
              downloadUrl: dlUrl,
              releaseTag: viewData.tagName,
              assetFilename: exeAsset.name,
              size: exeAsset.size || 0,
              version: cleanVersion || viewData.tagName.replace(/.*v/i, ''),
            };
          }
        }
      }
    }
  } catch {}

  return {
    found: false,
    error: 'Installer resmi tidak ditemukan di GitHub Releases.',
  };
}

// 3. Generic installer download, SHA-256 integrity verification, and execution
ipcMain.handle('download-and-install-app', async (event, params) => {
  const { appId, downloadUrl, sha256, latestVersion, appName, releaseTag, repoOwner, repoName } = params || {};

  if (!appId) {
    return { success: false, error: 'App ID tidak ditemukan.' };
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

  // Phase 0: GitHub Asset Source-of-Truth Resolution & Diagnostics
  sendProgress('downloading', 0, 0, 0, 'Memverifikasi rilis aktual di GitHub Releases...');

  let actualDownloadUrl = downloadUrl;
  let actualReleaseTag = releaseTag || '';
  let actualAssetFilename = '';

  try {
    const resolution = await resolveGitHubReleaseAsset({
      appId,
      latestVersion,
      metadataDownloadUrl: downloadUrl,
      appName,
      repoOwner: repoOwner || 'yaladzan92-creator',
      repoName: repoName || 'Alco-Releases',
    });

    if (resolution.found && resolution.downloadUrl) {
      actualDownloadUrl = resolution.downloadUrl;
      actualReleaseTag = resolution.releaseTag;
      actualAssetFilename = resolution.assetFilename;
    }
  } catch (resErr) {
    console.warn('[Electron] Dynamic release asset resolution warning:', resErr);
  }

  // Diagnostic Log (appId, latestVersion, metadataDownloadUrl, resolvedDownloadUrl, releaseTag, assetFilename)
  console.log('[Electron Download Diagnostic]', {
    appId,
    latestVersion: latestVersion || 'unknown',
    metadataDownloadUrl: downloadUrl || 'none',
    resolvedDownloadUrl: actualDownloadUrl || 'none',
    releaseTag: actualReleaseTag || 'none',
    assetFilename: actualAssetFilename || 'none',
  });

  if (!actualDownloadUrl || !isValidSecureUrl(actualDownloadUrl)) {
    const errorMsg = 'Installer resmi tidak ditemukan di GitHub Releases.';
    sendProgress('failed', 0, 0, 0, '', errorMsg);
    return { success: false, error: errorMsg };
  }

  // Setup temporary directory in user temp space
  const tempDir = path.join(app.getPath('temp'), 'alco-hub-downloads');
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    return { success: false, error: `Gagal membuat direktori download: ${err.message}` };
  }

  const sanitizedAppId = appId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempDownloadPath = path.join(tempDir, `${sanitizedAppId}-${Date.now()}.download.tmp`);
  const finalInstallerPath = path.join(
    tempDir,
    actualAssetFilename || `${sanitizedAppId}-${latestVersion || 'setup'}.exe`
  );

  try {
    // Phase 1: Download binary stream with progress
    sendProgress('downloading', 0, 0, 0, 'Memulai download installer resmi dari GitHub Releases...');

    try {
      await downloadFileWithProgress(actualDownloadUrl, tempDownloadPath, ({ bytesReceived, totalBytes, progress }) => {
        sendProgress('downloading', progress, bytesReceived, totalBytes, `Mengunduh installer (${progress}%)...`);
      });
    } catch (downloadErr) {
      // Jika URL pertama 404 dan belum di-resolve dari GitHub API, coba fallback resolution
      if (
        downloadErr &&
        (downloadErr.message?.includes('404') || downloadErr.message?.includes('Status 404')) &&
        actualDownloadUrl === downloadUrl
      ) {
        sendProgress('downloading', 0, 0, 0, 'Mencari asset rilis alternatif di GitHub...');
        const fallbackRes = await resolveGitHubReleaseAsset({
          appId,
          latestVersion,
          metadataDownloadUrl: downloadUrl,
          appName,
          repoOwner: repoOwner || 'yaladzan92-creator',
          repoName: repoName || 'Alco-Releases',
        });

        if (fallbackRes.found && fallbackRes.downloadUrl && fallbackRes.downloadUrl !== actualDownloadUrl) {
          actualDownloadUrl = fallbackRes.downloadUrl;
          actualReleaseTag = fallbackRes.releaseTag;
          actualAssetFilename = fallbackRes.assetFilename;

          console.log('[Electron Download Fallback Retry]', {
            appId,
            resolvedDownloadUrl: actualDownloadUrl,
            releaseTag: actualReleaseTag,
          });

          await downloadFileWithProgress(actualDownloadUrl, tempDownloadPath, ({ bytesReceived, totalBytes, progress }) => {
            sendProgress('downloading', progress, bytesReceived, totalBytes, `Mengunduh installer (${progress}%)...`);
          });
        } else {
          throw new Error('Installer resmi tidak ditemukan di GitHub Releases.');
        }
      } else {
        if (downloadErr.message?.includes('404')) {
          throw new Error('Installer resmi tidak ditemukan di GitHub Releases.');
        }
        throw downloadErr;
      }
    }

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
      return {
        success: false,
        error: errorMsg,
        shaMismatch: true,
      };
    }

    // Phase 3: Finalize installer file path
    try {
      if (fs.existsSync(finalInstallerPath)) fs.unlinkSync(finalInstallerPath);
      fs.renameSync(tempDownloadPath, finalInstallerPath);
    } catch {
      fs.copyFileSync(tempDownloadPath, finalInstallerPath);
      try {
        fs.unlinkSync(tempDownloadPath);
      } catch {}
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
      resolvedDownloadUrl: actualDownloadUrl,
      releaseTag: actualReleaseTag,
      assetFilename: actualAssetFilename,
    };
  } catch (err) {
    try {
      if (fs.existsSync(tempDownloadPath)) fs.unlinkSync(tempDownloadPath);
    } catch {}

    const rawMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat proses download & install.';
    const finalErrorMessage = rawMessage.includes('404')
      ? 'Installer resmi tidak ditemukan di GitHub Releases.'
      : rawMessage;

    sendProgress('failed', 0, 0, 0, '', finalErrorMessage);
    return { success: false, error: finalErrorMessage };
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

// ==========================================
// 5. ONE-CLICK GITHUB CLI RELEASE PUBLISHER (OWNER ENGINE)
// ==========================================

/**
 * Resolves the GitHub CLI executable path or command name.
 * On Windows, checks standard PATH or known installation locations.
 */
function resolveGhExecutable() {
  if (process.platform === 'win32') {
    const defaultPaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'GitHub CLI', 'gh.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'GitHub CLI', 'gh.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'GitHub CLI', 'gh.exe'),
    ];
    for (const testPath of defaultPaths) {
      if (testPath && fs.existsSync(testPath)) {
        return testPath;
      }
    }
    return 'gh.exe';
  }
  return 'gh';
}

/**
 * Executes a GitHub CLI (gh) command with structured arguments.
 * Uses child_process.spawn directly WITHOUT shell invocation (shell: false)
 * to eliminate command injection risks and ensure exact handling of paths with spaces or parentheses.
 * @param {string[]} args
 * @param {object} [options]
 * @returns {Promise<{ code: number, stdout: string, stderr: string, error?: Error }>}
 */
function execGhCommand(args, options = {}) {
  return new Promise((resolve) => {
    try {
      const ghExe = resolveGhExecutable();
      const { onStdout, onStderr, ...spawnOptions } = options;

      const proc = spawn(ghExe, args, {
        windowsHide: true,
        shell: false,
        ...spawnOptions,
      });

      let stdout = '';
      let stderr = '';

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          const str = data.toString();
          stdout += str;
          if (typeof onStdout === 'function') onStdout(str);
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          const str = data.toString();
          stderr += str;
          if (typeof onStderr === 'function') onStderr(str);
        });
      }

      proc.on('error', (err) => {
        resolve({
          code: -1,
          stdout: stdout.trim(),
          stderr: (stderr || err.message).trim(),
          error: err,
        });
      });

      proc.on('close', (code) => {
        resolve({
          code: code ?? 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });
    } catch (err) {
      resolve({
        code: -1,
        stdout: '',
        stderr: err.message,
        error: err,
      });
    }
  });
}

/**
 * Calculates SHA-256 of a local file via Node stream.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
function calculateSha256ForFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return reject(new Error(`File installer tidak ditemukan di jalur: ${filePath}`));
    }
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', (err) => reject(err));
  });
}

// IPC: Native File Picker for Installer (.exe)
ipcMain.handle('select-installer-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Pilih File Installer ALCO (.exe)',
      properties: ['openFile'],
      filters: [
        { name: 'Windows Executable Installer', extensions: ['exe'] },
        { name: 'Semua File', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    if (!fs.existsSync(selectedPath)) {
      return { canceled: true, error: 'File yang dipilih tidak ditemukan di disk.' };
    }

    const stat = fs.statSync(selectedPath);
    return {
      canceled: false,
      filePath: selectedPath,
      fileName: path.basename(selectedPath),
      fileSize: stat.size,
    };
  } catch (err) {
    return {
      canceled: true,
      error: err instanceof Error ? err.message : 'Gagal membuka dialog pemilihan file.',
    };
  }
});

// IPC: Calculate File SHA-256 Checksum on demand
ipcMain.handle('calculate-file-hash', async (_event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Jalur file tidak valid.' };
    }
    const hash = await calculateSha256ForFile(filePath);
    return { success: true, sha256: hash };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghitung SHA-256 hash.',
    };
  }
});

// IPC: Check GitHub CLI status (installed and authenticated)
ipcMain.handle('check-gh-cli-status', async () => {
  // 1. Check gh installation
  const versionRes = await execGhCommand(['--version']);
  if (versionRes.code !== 0 || versionRes.error) {
    return {
      installed: false,
      authenticated: false,
      version: null,
      account: null,
      error: 'GitHub CLI (gh) belum terpasang di komputer ini. Silakan pasang dari https://cli.github.com atau buka terminal dan jalankan "winget install GitHub.cli".',
    };
  }

  const versionMatch = versionRes.stdout.match(/gh version ([0-9.]+)/i);
  const ghVersion = versionMatch ? versionMatch[1] : 'installed';

  // 2. Check gh authentication status
  const authRes = await execGhCommand(['auth', 'status']);
  const isAuthOk = authRes.code === 0;

  // Extract account name if possible
  const combinedOutput = `${authRes.stdout}\n${authRes.stderr}`;
  const accountMatch = combinedOutput.match(/Logged in to [^\s]+ account ([^\s(]+)/i) || combinedOutput.match(/account ([a-zA-Z0-9_-]+)/i);
  const account = accountMatch ? accountMatch[1] : null;

  if (!isAuthOk) {
    return {
      installed: true,
      authenticated: false,
      version: ghVersion,
      account: null,
      error: 'GitHub CLI belum login ke akun GitHub. Silakan buka Terminal / PowerShell dan jalankan "gh auth login" untuk mengautentikasi.',
    };
  }

  return {
    installed: true,
    authenticated: true,
    version: ghVersion,
    account: account || 'Active Session',
  };
});

// IPC: One-Click GitHub CLI Release Publisher Transaction
ipcMain.handle('publish-release-gh-cli', async (event, params) => {
  const sendProgress = (step, progressPercent, message, extra = {}) => {
    try {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('release-publish-progress', {
          step,
          progressPercent,
          message,
          ...extra,
        });
      }
    } catch {}
  };

  try {
    const {
      appId,
      appName,
      version,
      filePath,
      releaseNotes,
      repoOwner = 'yaladzan92-creator',
      repoName = 'Alco-Releases',
    } = params || {};

    // 1. Input Sanitization & Verification
    if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
      return {
        success: false,
        step: 'failed',
        error: `File installer tidak ditemukan di komputer: ${filePath || '(kosong)'}`,
      };
    }

    if (!filePath.toLowerCase().endsWith('.exe')) {
      return {
        success: false,
        step: 'failed',
        error: 'File yang dipilih harus berupa file executable installer Windows (.exe).',
      };
    }

    const cleanAppId = (appId || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const cleanVersion = (version || '1.0.0').toString().trim().replace(/^v/i, '').replace(/[^0-9.]/g, '') || '1.0.0';
    const cleanRepoOwner = (repoOwner || 'yaladzan92-creator').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    const cleanRepoName = (repoName || 'Alco-Releases').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    const repoSlug = `${cleanRepoOwner}/${cleanRepoName}`;

    const tagName = `${cleanAppId}-v${cleanVersion}`;
    const releaseTitle = `${appName || cleanAppId} v${cleanVersion}`;
    const cleanNotes = (releaseNotes || `Rilis resmi ${appName || cleanAppId} v${cleanVersion} didistribusikan melalui ALCO Hub.`).trim();
    const fileName = path.basename(filePath);
    const fileStat = fs.statSync(filePath);

    // Step 1: Preparing & Checking GitHub CLI
    sendProgress('preparing', 10, 'Memeriksa ketersediaan & status login GitHub CLI di sistem...', {
      tag: tagName,
      fileName,
    });

    const versionCheck = await execGhCommand(['--version']);
    if (versionCheck.code !== 0 || versionCheck.error) {
      const errorMsg = 'GitHub CLI (gh) belum terpasang di komputer ini. Silakan pasang dari https://cli.github.com atau jalankan "winget install GitHub.cli" di PowerShell.';
      sendProgress('failed', 0, errorMsg, { error: errorMsg });
      return { success: false, step: 'preparing', error: errorMsg };
    }

    const authCheck = await execGhCommand(['auth', 'status']);
    if (authCheck.code !== 0) {
      const errorMsg = 'GitHub CLI belum login ke akun GitHub. Silakan buka Terminal / PowerShell dan jalankan "gh auth login" terlebih dahulu.';
      sendProgress('failed', 0, errorMsg, { error: errorMsg });
      return { success: false, step: 'preparing', error: errorMsg };
    }

    // Step 2: Calculating SHA-256 Hash
    sendProgress('calculating_sha', 25, 'Menghitung & memvalidasi SHA-256 Checksum file installer lokal...');
    let sha256 = '';
    try {
      sha256 = await calculateSha256ForFile(filePath);
    } catch (hashErr) {
      const errorMsg = `Gagal menghitung SHA-256 hash: ${hashErr.message}`;
      sendProgress('failed', 0, errorMsg, { error: errorMsg });
      return { success: false, step: 'calculating_sha', error: errorMsg };
    }

    sendProgress('calculating_sha', 40, 'SHA-256 Checksum terverifikasi.', { sha256 });

    // Step 3: Check & Create GitHub Release
    sendProgress('creating_release', 50, `Memeriksa status rilis "${tagName}" di GitHub repo ${repoSlug}...`, { sha256 });

    const checkReleaseRes = await execGhCommand([
      'release',
      'view',
      tagName,
      '--repo',
      repoSlug,
      '--json',
      'tagName,name,url,assets',
    ]);

    let releaseExists = checkReleaseRes.code === 0;

    if (!releaseExists) {
      sendProgress('creating_release', 60, `Membuat GitHub Release baru "${releaseTitle}" (${tagName})...`, { sha256 });
      const createRes = await execGhCommand([
        'release',
        'create',
        tagName,
        '--repo',
        repoSlug,
        '--title',
        releaseTitle,
        '--notes',
        cleanNotes,
      ]);

      if (createRes.code !== 0) {
        // If create failed because release was created concurrently or already exists, double check
        const retryView = await execGhCommand(['release', 'view', tagName, '--repo', repoSlug]);
        if (retryView.code !== 0) {
          const errorMsg = `Gagal membuat GitHub Release: ${createRes.stderr || 'Koneksi GitHub gagal'}`;
          sendProgress('failed', 0, errorMsg, { error: errorMsg, sha256 });
          return { success: false, step: 'creating_release', error: errorMsg };
        }
      }
    } else {
      sendProgress('creating_release', 60, `Release "${tagName}" sudah ada di GitHub. Melanjutkan upload installer...`, { sha256 });
    }

    // Step 4: Upload Installer (.exe) with --clobber
    sendProgress('uploading', 70, `Mengunggah installer ${fileName} (${Math.round((fileStat.size / 1024 / 1024) * 10) / 10} MB) ke GitHub Releases...`, {
      sha256,
      fileName,
      fileSize: fileStat.size,
    });

    const uploadRes = await execGhCommand([
      'release',
      'upload',
      tagName,
      filePath,
      '--repo',
      repoSlug,
      '--clobber',
    ]);

    if (uploadRes.code !== 0) {
      const errorMsg = `Gagal mengunggah binary installer ke GitHub Releases: ${uploadRes.stderr || 'Koneksi terputus'}`;
      sendProgress('failed', 0, errorMsg, { error: errorMsg, sha256 });
      return { success: false, step: 'uploading', error: errorMsg };
    }

    // Step 5: Verifying Asset on GitHub (Source of Truth)
    sendProgress('verifying', 90, 'Memverifikasi asset rilis di GitHub Releases CDN...', { sha256 });

    const finalViewRes = await execGhCommand([
      'release',
      'view',
      tagName,
      '--repo',
      repoSlug,
      '--json',
      'tagName,name,url,assets',
    ]);

    let verifiedAsset = null;
    let finalTagName = tagName;
    let finalHtmlUrl = `https://github.com/${repoSlug}/releases/tag/${encodeURIComponent(tagName)}`;
    let releaseName = releaseTitle;

    if (finalViewRes.code === 0 && finalViewRes.stdout) {
      try {
        const viewData = JSON.parse(finalViewRes.stdout);
        if (viewData.tagName) finalTagName = viewData.tagName;
        if (viewData.url) finalHtmlUrl = viewData.url;
        if (viewData.name) releaseName = viewData.name;
        if (Array.isArray(viewData.assets) && viewData.assets.length > 0) {
          verifiedAsset =
            viewData.assets.find(
              (a) => a.name && (a.name.toLowerCase() === fileName.toLowerCase() || a.name.toLowerCase() === path.basename(filePath).toLowerCase())
            ) ||
            viewData.assets.find((a) => a.name && a.name.toLowerCase().endsWith('.exe')) ||
            viewData.assets[0];
        }
      } catch (parseErr) {
        console.warn('[Release] Failed to parse gh release view JSON:', parseErr);
      }
    }

    // Jika belum ditemukan melalui exact tagName, cari dari daftar seluruh release repo
    if (!verifiedAsset) {
      const listRes = await execGhCommand([
        'release',
        'list',
        '--repo',
        repoSlug,
        '--json',
        'tagName,name,isLatest,createdAt',
      ]);
      if (listRes.code === 0 && listRes.stdout) {
        try {
          const releases = JSON.parse(listRes.stdout);
          const targetClean = cleanAppId.replace(/[^a-z0-9]/g, '');
          const matchingRel = releases.find((r) => {
            const rTag = (r.tagName || '').toLowerCase();
            const rTitle = (r.name || '').toLowerCase();
            return (
              (rTag.includes(cleanVersion) || rTitle.includes(cleanVersion)) &&
              (rTag.includes(cleanAppId) || rTag.replace(/[^a-z0-9]/g, '').includes(targetClean.slice(0, 6)))
            );
          });

          if (matchingRel) {
            const detailRes = await execGhCommand([
              'release',
              'view',
              matchingRel.tagName,
              '--repo',
              repoSlug,
              '--json',
              'tagName,name,url,assets',
            ]);
            if (detailRes.code === 0 && detailRes.stdout) {
              const detailData = JSON.parse(detailRes.stdout);
              if (detailData.tagName) finalTagName = detailData.tagName;
              if (detailData.url) finalHtmlUrl = detailData.url;
              if (detailData.name) releaseName = detailData.name;
              if (Array.isArray(detailData.assets) && detailData.assets.length > 0) {
                verifiedAsset =
                  detailData.assets.find(
                    (a) => a.name && (a.name.toLowerCase() === fileName.toLowerCase() || a.name.toLowerCase().endsWith('.exe'))
                  ) || detailData.assets[0];
              }
            }
          }
        } catch {}
      }
    }

    // Jika asset tidak ditemukan sama sekali di GitHub: ABORT & BERI PESAN RESMI
    if (!verifiedAsset) {
      const errorMsg = 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.';
      sendProgress('failed', 0, errorMsg, { error: errorMsg, sha256 });
      return { success: false, step: 'verifying', error: errorMsg };
    }

    const actualAssetName = verifiedAsset.name || fileName;
    // Pada GitHub CLI JSON output: asset.url adalah direct download link jika dimulai dengan github.com/.../releases/download/...
    let actualDownloadUrl = verifiedAsset.browser_download_url || verifiedAsset.url;
    if (!actualDownloadUrl || !actualDownloadUrl.includes('/releases/download/')) {
      actualDownloadUrl = `https://github.com/${repoSlug}/releases/download/${encodeURIComponent(finalTagName)}/${encodeURIComponent(actualAssetName)}`;
    }

    const payload = {
      appId: cleanAppId,
      appName: appName || cleanAppId,
      version: cleanVersion,
      tag: finalTagName,
      releaseName: releaseName,
      downloadUrl: actualDownloadUrl,
      sha256,
      fileName: actualAssetName,
      fileSize: verifiedAsset.size || fileStat.size,
      htmlUrl: finalHtmlUrl,
      repoSlug,
      releaseNotes: cleanNotes,
    };

    sendProgress('verifying', 100, 'Binary installer berhasil diunggah & diverifikasi di GitHub Releases!', {
      sha256,
      releaseData: payload,
    });

    return {
      success: true,
      data: payload,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat proses publikasi rilis.';
    sendProgress('failed', 0, errorMsg, { error: errorMsg });
    return {
      success: false,
      step: 'failed',
      error: errorMsg,
    };
  }
});

// IPC: Verify any GitHub Release Asset on demand
ipcMain.handle('verify-gh-release-asset', async (_event, params) => {
  const {
    tag,
    repoOwner = 'yaladzan92-creator',
    repoName = 'Alco-Releases',
  } = params || {};

  const repoSlug = `${repoOwner}/${repoName}`;
  if (!tag) {
    return { success: false, error: 'Tag release diperlukan.' };
  }

  const viewRes = await execGhCommand([
    'release',
    'view',
    tag,
    '--repo',
    repoSlug,
    '--json',
    'tagName,name,url,assets',
  ]);

  if (viewRes.code !== 0 || !viewRes.stdout) {
    return {
      success: false,
      error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
    };
  }

  try {
    const data = JSON.parse(viewRes.stdout);
    if (!Array.isArray(data.assets) || data.assets.length === 0) {
      return {
        success: false,
        error: 'GitHub release asset tidak ditemukan. Metadata tidak dipublish.',
      };
    }

    const exeAsset = data.assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) || data.assets[0];
    const downloadUrl = exeAsset.browser_download_url || exeAsset.url || `https://github.com/${repoSlug}/releases/download/${encodeURIComponent(data.tagName)}/${encodeURIComponent(exeAsset.name)}`;

    return {
      success: true,
      data: {
        tag: data.tagName,
        releaseName: data.name,
        fileName: exeAsset.name,
        downloadUrl,
        size: exeAsset.size,
        htmlUrl: data.url,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: 'Gagal memproses data rilis dari GitHub.',
    };
  }
});

// IPC: List all GitHub Releases specifically filtered for a target application
ipcMain.handle('list-gh-app-releases', async (_event, params) => {
  const {
    appId,
    appName,
    repoOwner = 'yaladzan92-creator',
    repoName = 'Alco-Releases',
  } = params || {};

  const repoSlug = `${repoOwner}/${repoName}`;
  if (!appId) {
    return { success: false, error: 'App ID diperlukan.' };
  }

  const cleanAppId = (appId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const appSlugKeywords = cleanAppId
    .split('-')
    .filter((w) => w.length > 2 && w !== 'alco' && w !== 'app');

  const isReleaseForApp = (tagName, releaseTitle) => {
    const rTag = (tagName || '').toLowerCase();
    const rTitle = (releaseTitle || '').toLowerCase();

    // 1. Exact match with cleanAppId or with "alco-" prefix
    if (rTag.includes(cleanAppId) || rTitle.includes(cleanAppId)) return true;

    // 2. Typo tolerant check for specific apps
    if (cleanAppId.includes('creative') && (rTag.includes('creative') || rTitle.includes('creative'))) return true;
    if (cleanAppId.includes('audio') && (rTag.includes('audio') || rTitle.includes('audio'))) return true;
    if (cleanAppId.includes('content') && (rTag.includes('content') || rTitle.includes('content'))) return true;
    if (cleanAppId.includes('render') && (rTag.includes('render') || rTitle.includes('render'))) return true;
    if (cleanAppId.includes('palette') && (rTag.includes('palette') || rTitle.includes('palette'))) return true;

    // 3. Check combined words
    if (appSlugKeywords.length > 0) {
      const matchCount = appSlugKeywords.filter((kw) => rTag.includes(kw) || rTitle.includes(kw)).length;
      if (matchCount >= Math.min(2, appSlugKeywords.length)) return true;
    }

    return false;
  };

  // 1. Attempt via GitHub CLI
  try {
    const listRes = await execGhCommand([
      'release',
      'list',
      '--repo',
      repoSlug,
      '--limit',
      '100',
      '--json',
      'tagName,name,isLatest,isDraft,isPrerelease,createdAt,publishedAt',
    ]);

    if (listRes.code === 0 && listRes.stdout) {
      const rawReleases = JSON.parse(listRes.stdout);
      const appReleases = [];

      for (const rel of rawReleases) {
        if (isReleaseForApp(rel.tagName, rel.name)) {
          let assets = [];
          let htmlUrl = `https://github.com/${repoSlug}/releases/tag/${encodeURIComponent(rel.tagName)}`;
          let body = '';

          const viewRes = await execGhCommand([
            'release',
            'view',
            rel.tagName,
            '--repo',
            repoSlug,
            '--json',
            'tagName,name,url,assets,body',
          ]);

          if (viewRes.code === 0 && viewRes.stdout) {
            try {
              const viewData = JSON.parse(viewRes.stdout);
              if (viewData.url) htmlUrl = viewData.url;
              if (Array.isArray(viewData.assets)) assets = viewData.assets;
              if (viewData.body) body = viewData.body;
            } catch {}
          }

          const exeAsset = assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) || assets[0];
          const verMatch = (rel.tagName || '').match(/v?([0-9]+(\.[0-9]+)*)/i) || (rel.name || '').match(/v?([0-9]+(\.[0-9]+)*)/i);
          const version = verMatch ? verMatch[1] : rel.tagName.replace(/^[a-z_-]+/i, '');

          let dlUrl = exeAsset ? (exeAsset.browser_download_url || exeAsset.url) : '';
          if (dlUrl && !dlUrl.includes('/releases/download/')) {
            dlUrl = `https://github.com/${repoSlug}/releases/download/${encodeURIComponent(rel.tagName)}/${encodeURIComponent(exeAsset.name)}`;
          }

          appReleases.push({
            tagName: rel.tagName,
            name: rel.name || rel.tagName,
            version: version || '1.0.0',
            publishedAt: rel.publishedAt || rel.createdAt || null,
            createdAt: rel.createdAt || null,
            isLatest: Boolean(rel.isLatest),
            isDraft: Boolean(rel.isDraft),
            isPrerelease: Boolean(rel.isPrerelease),
            htmlUrl,
            assetFilename: exeAsset?.name || null,
            downloadUrl: dlUrl || null,
            size: exeAsset?.size || 0,
            body,
          });
        }
      }

      appReleases.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      const formatted = appReleases.map((item, index) => {
        let statusBadge = 'OLD';
        if (index === 0) statusBadge = 'LATEST';
        else if (index === 1) statusBadge = 'PREVIOUS';
        return {
          ...item,
          statusBadge,
        };
      });

      return { success: true, releases: formatted };
    }
  } catch (cliErr) {
    console.warn('[Electron] gh release list failed, trying HTTPS API fallback:', cliErr);
  }

  // 2. Fallback via HTTPS GitHub API
  try {
    const apiUrl = `https://api.github.com/repos/${repoSlug}/releases?per_page=100`;
    const rawReleases = await fetchGitHubApiJson(apiUrl);

    if (Array.isArray(rawReleases)) {
      const appReleases = [];

      for (const rel of rawReleases) {
        if (isReleaseForApp(rel.tag_name, rel.name)) {
          const assets = Array.isArray(rel.assets) ? rel.assets : [];
          const exeAsset = assets.find((a) => a.name?.toLowerCase().endsWith('.exe')) || assets[0];
          const verMatch = (rel.tag_name || '').match(/v?([0-9]+(\.[0-9]+)*)/i) || (rel.name || '').match(/v?([0-9]+(\.[0-9]+)*)/i);
          const version = verMatch ? verMatch[1] : rel.tag_name.replace(/^[a-z_-]+/i, '');

          appReleases.push({
            id: rel.id,
            tagName: rel.tag_name,
            name: rel.name || rel.tag_name,
            version: version || '1.0.0',
            publishedAt: rel.published_at || rel.created_at || null,
            createdAt: rel.created_at || null,
            isLatest: Boolean(rel.make_latest || false),
            isDraft: Boolean(rel.draft),
            isPrerelease: Boolean(rel.prerelease),
            htmlUrl: rel.html_url || `https://github.com/${repoSlug}/releases/tag/${encodeURIComponent(rel.tag_name)}`,
            assetFilename: exeAsset?.name || null,
            downloadUrl: exeAsset?.browser_download_url || null,
            size: exeAsset?.size || 0,
            body: rel.body || '',
          });
        }
      }

      appReleases.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      const formatted = appReleases.map((item, index) => {
        let statusBadge = 'OLD';
        if (index === 0) statusBadge = 'LATEST';
        else if (index === 1) statusBadge = 'PREVIOUS';
        return {
          ...item,
          statusBadge,
        };
      });

      return { success: true, releases: formatted };
    }
  } catch (apiErr) {
    return {
      success: false,
      error: `Gagal memuat riwayat rilis dari GitHub: ${apiErr instanceof Error ? apiErr.message : 'Koneksi gagal'}`,
      releases: [],
    };
  }

  return { success: true, releases: [] };
});

// IPC: Delete a GitHub Release (with its Git tag) via GitHub CLI
ipcMain.handle('delete-gh-release', async (_event, params) => {
  const {
    tag,
    repoOwner = 'yaladzan92-creator',
    repoName = 'Alco-Releases',
  } = params || {};

  const repoSlug = `${repoOwner}/${repoName}`;
  if (!tag) {
    return { success: false, error: 'Tag release diperlukan untuk penghapusan.' };
  }

  const deleteRes = await execGhCommand([
    'release',
    'delete',
    tag,
    '--repo',
    repoSlug,
    '--yes',
    '--cleanup-tag',
  ]);

  if (deleteRes.code !== 0) {
    return {
      success: false,
      error: deleteRes.stderr || deleteRes.stdout || `Gagal menghapus release ${tag} dari GitHub.`,
    };
  }

  return {
    success: true,
    message: `Release "${tag}" dan installer berhasil dihapus dari GitHub Releases.`,
  };
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
