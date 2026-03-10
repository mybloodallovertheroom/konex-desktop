import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

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

function sendUpdateState(): void {
  mainWindow?.webContents.send('update:state', state);
}

export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    state.checking = true;
    state.error = null;
    sendUpdateState();
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    state.checking = false;
    state.available = true;
    state.version = info.version;
    sendUpdateState();
  });

  autoUpdater.on('update-not-available', () => {
    state.checking = false;
    state.available = false;
    sendUpdateState();
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    state.progress = progress.percent;
    sendUpdateState();
    mainWindow?.setProgressBar(progress.percent / 100);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    state.downloaded = true;
    state.progress = 100;
    state.version = info.version;
    sendUpdateState();
    mainWindow?.setProgressBar(-1);
  });

  autoUpdater.on('error', (error: Error) => {
    state.checking = false;
    state.error = error.message;
    sendUpdateState();
    mainWindow?.setProgressBar(-1);
  });

  ipcMain.on('update:check', () => checkForUpdates());
  ipcMain.on('update:download', () => downloadUpdate());
  ipcMain.on('update:install', () => installUpdate());
  ipcMain.handle('update:getState', () => state);

  setTimeout(() => checkForUpdates(), 5000);

  updateCheckInterval = setInterval(() => checkForUpdates(), 4 * 60 * 60 * 1000);
}

export function checkForUpdates(): void {
  if (state.checking) return;
  autoUpdater.checkForUpdates().catch((err) => {
    state.checking = false;
    state.error = err.message;
    sendUpdateState();
  });
}

function downloadUpdate(): void {
  if (!state.available || state.downloaded) return;
  autoUpdater.downloadUpdate().catch((err) => {
    state.error = err.message;
    sendUpdateState();
    mainWindow?.setProgressBar(-1);
  });
}

function installUpdate(): void {
  if (!state.downloaded) return;
  autoUpdater.quitAndInstall(false, true);
}

export function cleanupUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}
