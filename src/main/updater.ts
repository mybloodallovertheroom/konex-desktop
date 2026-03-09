/**
 * Konex Desktop - Auto Updater
 *
 * Robust update system using electron-updater with GitHub Releases
 * Features:
 * - Automatic update check on startup
 * - Manual update check
 * - Progress tracking
 * - Error handling with retry
 * - Update notification to renderer
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

// Update state
interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
}

const state: UpdateState = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  progress: 0,
  version: null,
};

/**
 * Send update state to renderer
 */
function sendUpdateState(): void {
  mainWindow?.webContents.send('update:state', state);
}

/**
 * Initialize auto-updater
 */
export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  // Configure updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  // Set update feed URL if not using electron-builder publish config
  // autoUpdater.setFeedURL({
  //   provider: 'github',
  //   owner: 'konex-sh',
  //   repo: 'konex-desktop',
  // });

  // Event: Checking for updates
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
    state.checking = true;
    state.error = null;
    sendUpdateState();
  });

  // Event: Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] Update available:', info.version);
    state.checking = false;
    state.available = true;
    state.version = info.version;
    sendUpdateState();

    // Notify user
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Mise à jour disponible',
        message: `Une nouvelle version de Konex est disponible (v${info.version})`,
        detail: 'Voulez-vous télécharger et installer la mise à jour ?',
        buttons: ['Télécharger', 'Plus tard'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          downloadUpdate();
        }
      });
  });

  // Event: Update not available
  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No updates available');
    state.checking = false;
    state.available = false;
    sendUpdateState();
  });

  // Event: Download progress
  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    console.log(`[Updater] Download progress: ${progress.percent.toFixed(1)}%`);
    state.progress = progress.percent;
    sendUpdateState();

    // Update taskbar progress (Windows)
    mainWindow?.setProgressBar(progress.percent / 100);
  });

  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] Update downloaded:', info.version);
    state.downloaded = true;
    state.progress = 100;
    sendUpdateState();

    // Clear taskbar progress
    mainWindow?.setProgressBar(-1);

    // Ask user to restart
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Mise à jour prête',
        message: 'La mise à jour a été téléchargée',
        detail: 'Konex va redémarrer pour appliquer la mise à jour.',
        buttons: ['Redémarrer maintenant', 'Plus tard'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  // Event: Error
  autoUpdater.on('error', (error: Error) => {
    console.error('[Updater] Error:', error.message);
    state.checking = false;
    state.error = error.message;
    sendUpdateState();

    // Clear taskbar progress
    mainWindow?.setProgressBar(-1);
  });

  // IPC handlers
  ipcMain.on('update:check', () => checkForUpdates());
  ipcMain.on('update:download', () => downloadUpdate());
  ipcMain.on('update:install', () => installUpdate());
  ipcMain.handle('update:getState', () => state);

  // Check for updates on startup (after 5 seconds)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Check for updates every 4 hours
  updateCheckInterval = setInterval(
    () => {
      checkForUpdates();
    },
    4 * 60 * 60 * 1000
  );
}

/**
 * Check for updates manually
 */
export function checkForUpdates(): void {
  if (state.checking) return;

  console.log('[Updater] Manual update check triggered');
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[Updater] Check failed:', err.message);
    state.checking = false;
    state.error = err.message;
    sendUpdateState();
  });
}

/**
 * Download update
 */
function downloadUpdate(): void {
  if (!state.available || state.downloaded) return;

  console.log('[Updater] Starting download...');
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[Updater] Download failed:', err.message);
    state.error = err.message;
    sendUpdateState();
    mainWindow?.setProgressBar(-1);
  });
}

/**
 * Install update
 */
function installUpdate(): void {
  if (!state.downloaded) return;

  console.log('[Updater] Installing update...');
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Cleanup
 */
export function cleanupUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}
