import {
  app,
  BrowserWindow,
  session,
  ipcMain,
  shell,
  nativeImage,
  Menu,
  Tray,
} from 'electron';
import * as path from 'path';
import { initAutoUpdater, checkForUpdates } from './updater';
import { initDiscordRPC, destroyDiscordRPC, updateActivityFromTitle, resetActivity } from './discordRPC';

const KONEX_URL = 'https://konex.lol';
const PARTITION = 'persist:konex';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KonexDesktop/1.0.0';

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 600,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const splashPath = path.join(__dirname, '../../public/splash.html');
  splashWindow.loadFile(splashPath);

  splashWindow.on('close', (e) => {
    if (!isQuitting && mainWindow && !mainWindow.isVisible()) {
      e.preventDefault();
    }
  });
}

function createMainWindow(): void {
  const ses = session.fromPartition(PARTITION);

  const allowedPermissions = [
    'media',
    'mediaKeySystem',
    'notifications',
    'clipboard-read',
    'microphone',
    'camera',
    'speaker-selection',
    'fullscreen',
  ];

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });

  ses.setPermissionCheckHandler((_webContents, permission) => {
    return allowedPermissions.includes(permission);
  });

  ses.setDevicePermissionHandler((_details) => {
    return true;
  });

  const webviewPreloadPath = path.join(__dirname, 'webviewPreload.js');
  ses.setPreloads([webviewPreloadPath]);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#0b0b0d',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: PARTITION,
      webviewTag: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.webContents.setUserAgent(USER_AGENT);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.webContents.on('before-input-event', async (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (input.shift) {
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
        });
        mainWindow?.webContents.reloadIgnoringCache();
      } else {
        await ses.clearCache();
        mainWindow?.webContents.reloadIgnoringCache();
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('spotify:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Konex',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Vérifier les mises à jour',
      click: () => checkForUpdates(),
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Konex');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
    }
  });
}

function signalSplashReady(): void {
  if (!splashWindow) return;
  splashWindow.webContents.send('splash:ready');
}

function showMainWindow(): void {
  if (!mainWindow || !splashWindow) return;
  mainWindow.show();
  mainWindow.focus();
  setTimeout(() => {
    splashWindow?.close();
    splashWindow = null;
  }, 500);
}

function setupIPC(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
  ipcMain.on('app:ready', () => showMainWindow());
  ipcMain.on('webview:loaded', () => signalSplashReady());
  ipcMain.on('webview:failed', () => {
    mainWindow?.webContents.send('show:offline');
  });
  ipcMain.on('webview:reload', () => {
    mainWindow?.webContents.send('webview:reload');
  });
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.on('app:checkUpdates', () => checkForUpdates());
  ipcMain.on('open:external', (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
  });
  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url);
  });
  ipcMain.handle('app:getKonexUrl', () => KONEX_URL);
  ipcMain.handle('app:getPartition', () => PARTITION);
  ipcMain.on('discord:updateActivity', (_, title: string) => {
    updateActivityFromTitle(title);
  });
  ipcMain.on('discord:reset', () => {
    resetActivity();
  });
}

app.whenReady().then(async () => {
  createSplashWindow();
  setupIPC();
  createMainWindow();
  createTray();
  initAutoUpdater(mainWindow!);
  initDiscordRPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyDiscordRPC();
});

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('https://accounts.spotify.com/')) return;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.origin !== KONEX_URL && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const mediaPermissions = [
    'media',
    'mediaKeySystem',
    'notifications',
    'clipboard-read',
    'microphone',
    'camera',
    'speaker-selection',
    'fullscreen',
  ];

  const webviewSession = contents.session;
  if (webviewSession) {
    webviewSession.setPermissionRequestHandler((wc, permission, callback) => {
      callback(mediaPermissions.includes(permission));
    });
    webviewSession.setPermissionCheckHandler((_wc, permission) => {
      return mediaPermissions.includes(permission);
    });
    webviewSession.setDevicePermissionHandler((_details) => {
      return true;
    });
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
