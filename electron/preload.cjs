const { contextBridge, ipcRenderer } = require('electron');

/**
 * Validates that the URL is a safe HTTPS URL string.
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

// Expose safe, scoped API to renderer without exposing raw Node/Electron APIs
contextBridge.exposeInMainWorld('alcoHub', {
  openExternal: (rawUrl) => {
    if (isValidSecureUrl(rawUrl)) {
      return ipcRenderer.invoke('open-external', rawUrl);
    }
    return Promise.reject(new Error('Invalid or unpermitted URL protocol. Hanya HTTPS yang diperbolehkan.'));
  },
});
