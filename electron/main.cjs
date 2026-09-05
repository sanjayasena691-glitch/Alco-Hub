const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

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
  const installRoots = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs'),
    process.env.ProgramFiles || '',
    process.env['ProgramFiles(x86)'] || '',
  ].filter(Boolean);

  const installedCandidates = installRoots.flatMap((root) => (
    appDefinition.executableNames.flatMap((executableName) => [
      path.join(root, appDefinition.label, executableName),
      path.join(root, appDefinition.projectFolder, executableName),
    ])
  ));

  const developmentCandidates = appDefinition.executableNames.flatMap((executableName) => [
    path.resolve(__dirname, '..', '..', appDefinition.projectFolder, 'dist-electron', 'win-unpacked', executableName),
    path.resolve(__dirname, '..', '..', 'Alco Ecosystem', appDefinition.projectFolder, 'dist-electron', 'win-unpacked', executableName),
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
  const possibleEntries = [
    registry,
    registry?.contentEngine,
    registry?.['content-engine'],
    registry?.['alco-content-engine'],
    registry?.apps?.contentEngine,
    registry?.apps?.['content-engine'],
    registry?.apps?.['alco-content-engine'],
    registry?.products?.contentEngine,
    registry?.products?.['content-engine'],
    registry?.products?.['alco-content-engine'],
  ];

  return possibleEntries.find((entry) => entry && typeof entry === 'object') || null;
}

function validateRegistryEntry(entry) {
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
  const mainWindow = new BrowserWindow({
    title: 'ALCO Hub',
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
  'content-engine': {
    label: 'ALCO Content Engine',
    envKey: 'ALCO_CONTENT_ENGINE_EXE',
    projectFolder: 'Alco Content Engine',
    executableNames: ['ALCO Content Engine.exe', 'electron.exe'],
  },
  'auto-motion': {
    label: 'ALCO Auto Motion',
    envKey: 'ALCO_AUTO_MOTION_EXE',
    projectFolder: 'Alco Auto Motion',
    executableNames: ['ALCO Auto Motion.exe', 'electron.exe'],
  },
  'creative-system': {
    label: 'ALCO Creative System',
    envKey: 'ALCO_CREATIVE_SYSTEM_EXE',
    projectFolder: 'Alco Creative System',
    executableNames: ['ALCO Creative System.exe', 'electron.exe'],
  },
  'product-forge': {
    label: 'ALCO Product Forge',
    envKey: 'ALCO_PRODUCT_FORGE_EXE',
    projectFolder: 'Alco Product Forge',
    executableNames: ['ALCO Product Forge.exe', 'electron.exe'],
  },
};

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

ipcMain.handle('open-desktop-app', async (_event, appId) => {
  const appDefinition = desktopApps[appId];
  if (!appDefinition) {
    return { success: false, error: 'Aplikasi desktop ALCO tidak dikenal.' };
  }

  const executablePath = resolveDesktopAppExecutable(appDefinition);
  if (!executablePath) {
    return {
      success: false,
      error: `${appDefinition.label} belum ditemukan. Pasang installer ${appDefinition.label} terlebih dahulu.`,
    };
  }

  const errorMessage = await shell.openPath(executablePath);
  return errorMessage
    ? { success: false, error: errorMessage }
    : { success: true };
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
