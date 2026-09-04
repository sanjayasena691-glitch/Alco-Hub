const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
