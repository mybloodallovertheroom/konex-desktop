import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog } from 'electron';

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
    sendUpdateState();
    mainWindow?.setProgressBar(-1);

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
