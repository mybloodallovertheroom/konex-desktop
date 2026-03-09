/**
 * Konex Desktop - Main Process
 *
 * Handles:
 * - Splash screen with video loader
 * - Main window with custom titlebar
 * - Persistent session/cookies
 * - Auto-updates via GitHub Releases
 * - Offline handling
 */

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
import { openScreenPicker } from './screenPicker';
import { initDiscordRPC, destroyDiscordRPC, updateActivityFromTitle, resetActivity } from './discordRPC';

// Constants
const KONEX_URL = 'https://konex.lol';
const PARTITION = 'persist:konex';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KonexDesktop/1.0.0';

// Window references
let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// App state
let isQuitting = false;

/**
 * Create the splash screen window
 */
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

  // Load splash HTML
  const splashPath = path.join(__dirname, '../../public/splash.html');
  splashWindow.loadFile(splashPath);

  // Prevent closing splash manually
  splashWindow.on('close', (e) => {
    if (!isQuitting && mainWindow && !mainWindow.isVisible()) {
      e.preventDefault();
    }
  });
}

/**
 * Create the main application window
 */
function createMainWindow(): void {
  // Get persistent session
  const ses = session.fromPartition(PARTITION);

  // Configure session permissions (micro/caméra/audio pour LiveKit)
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

  // Appelé quand la page demande une permission (ex: navigator.mediaDevices.getUserMedia)
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });

  // Appelé quand navigator.permissions.query() est utilisé (LiveKit check initial)
  ses.setPermissionCheckHandler((_webContents, permission) => {
    return allowedPermissions.includes(permission);
  });

  // Autorise les périphériques HID/USB/serial (audio USB, casques, etc.)
  ses.setDevicePermissionHandler((_details) => {
    return true;
  });

  // Injecter le preload dans le webview (konex.lol) pour screen share + audio
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
    trafficLightPosition: { x: -100, y: -100 }, // Hide Mac traffic lights
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: PARTITION,
      webviewTag: true,
      backgroundThrottling: false, // Keep voice/audio working in background
    },
  });

  // Set user agent
  mainWindow.webContents.setUserAgent(USER_AGENT);

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  // Raccourci Ctrl+R / Cmd+R pour vider le cache et rafraîchir
  mainWindow.webContents.on('before-input-event', async (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      event.preventDefault();

      // Ctrl+Shift+R : Hard refresh (vide TOUT le cache)
      if (input.shift) {
        console.log('[Konex] Hard refresh: clearing ALL cache...');
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
        });
        mainWindow?.webContents.reloadIgnoringCache();
        console.log('[Konex] Hard refresh complete!');
      }
      // Ctrl+R : Clear cache et reload (pour les problèmes de logos)
      else {
        console.log('[Konex] Clearing cache and reloading...');
        await ses.clearCache();
        mainWindow?.webContents.reloadIgnoringCache();
        console.log('[Konex] Cache cleared and reloaded!');
      }
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('spotify:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle window close (minimize to tray)
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

/**
 * Create system tray
 */
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

/**
 * Signal splash that app is ready (wait for video to finish)
 */
function signalSplashReady(): void {
  if (!splashWindow) return;
  splashWindow.webContents.send('splash:ready');
}

/**
 * Show main window and close splash
 */
function showMainWindow(): void {
  if (!mainWindow || !splashWindow) return;

  // Fade out splash, show main
  mainWindow.show();
  mainWindow.focus();

  // Close splash after fade animation
  setTimeout(() => {
    splashWindow?.close();
    splashWindow = null;
  }, 500);
}

/**
 * Setup IPC handlers
 */
function setupIPC(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Get window state
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // App ready signal from renderer
  ipcMain.on('app:ready', () => showMainWindow());

  // Webview loaded - signal splash to finish video then show
  ipcMain.on('webview:loaded', () => signalSplashReady());

  // Webview failed to load
  ipcMain.on('webview:failed', () => {
    // Keep splash but send offline signal
    mainWindow?.webContents.send('show:offline');
  });

  // Reload webview
  ipcMain.on('webview:reload', () => {
    mainWindow?.webContents.send('webview:reload');
  });

  // Get app version
  ipcMain.handle('app:version', () => app.getVersion());

  // Check for updates
  ipcMain.on('app:checkUpdates', () => checkForUpdates());

  // Open external URL
  ipcMain.on('open:external', (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
  });

  // Open any URL externally (including spotify: URIs) — called from konex.lol webview
  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url);
  });

  // Get Konex URL
  ipcMain.handle('app:getKonexUrl', () => KONEX_URL);

  // Get partition name
  ipcMain.handle('app:getPartition', () => PARTITION);

  // Discord RPC updates depuis le renderer
  ipcMain.on('discord:updateActivity', (_, title: string) => {
    updateActivityFromTitle(title);
  });
  ipcMain.on('discord:reset', () => {
    resetActivity();
  });

  // Screen share : ouvre la modal de sélection d'écran
  ipcMain.handle('screen-picker:pick', async () => {
    if (!mainWindow) return null;
    return openScreenPicker(mainWindow);
  });
}

/**
 * App initialization
 */
app.whenReady().then(async () => {
  // Create splash first
  createSplashWindow();

  // Setup IPC
  setupIPC();

  // Create main window (hidden)
  createMainWindow();

  // Create tray
  createTray();

  // Initialize auto-updater
  initAutoUpdater(mainWindow!);

  // Initialize Discord RPC
  initDiscordRPC();

  // Handle activate (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before quit
app.on('before-quit', () => {
  isQuitting = true;
  destroyDiscordRPC();
});

// Security + permissions pour tous les webContents (dont les webviews)
app.on('web-contents-created', (_, contents) => {
  // Bloquer la navigation vers des URLs externes
  contents.on('will-navigate', (event, url) => {
    // Autoriser accounts.spotify.com pour le flow OAuth (redirige ensuite vers konex.lol)
    if (url.startsWith('https://accounts.spotify.com/')) return;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.origin !== KONEX_URL && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // URL invalide (ex: spotify:track:...) → ouvrir via shell
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Appliquer les permissions media sur chaque webContents (webview inclus)
  // Au cas où le webview utilise une session différente de la session parente
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

// Prevent multiple instances
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
