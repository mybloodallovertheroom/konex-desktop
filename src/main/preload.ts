import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
}

type UpdateStateCallback = (state: UpdateState) => void;
type VoidCallback = () => void;

const windowAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window:maximizeChanged', handler);
    return () => ipcRenderer.removeListener('window:maximizeChanged', handler);
  },
};

const appAPI = {
  ready: () => ipcRenderer.send('app:ready'),
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  getKonexUrl: () => ipcRenderer.invoke('app:getKonexUrl') as Promise<string>,
  getPartition: () => ipcRenderer.invoke('app:getPartition') as Promise<string>,
  openExternal: (url: string) => ipcRenderer.send('open:external', url),
};

const webviewAPI = {
  loaded: () => ipcRenderer.send('webview:loaded'),
  failed: () => ipcRenderer.send('webview:failed'),
  reload: () => ipcRenderer.send('webview:reload'),
  onReload: (callback: VoidCallback) => {
    const handler = () => callback();
    ipcRenderer.on('webview:reload', handler);
    return () => ipcRenderer.removeListener('webview:reload', handler);
  },
  onShowOffline: (callback: VoidCallback) => {
    const handler = () => callback();
    ipcRenderer.on('show:offline', handler);
    return () => ipcRenderer.removeListener('show:offline', handler);
  },
};

const updateAPI = {
  check: () => ipcRenderer.send('update:check'),
  download: () => ipcRenderer.send('update:download'),
  install: () => ipcRenderer.send('update:install'),
  getState: () => ipcRenderer.invoke('update:getState') as Promise<UpdateState>,
  onStateChange: (callback: UpdateStateCallback) => {
    const handler = (_: IpcRendererEvent, state: UpdateState) => callback(state);
    ipcRenderer.on('update:state', handler);
    return () => ipcRenderer.removeListener('update:state', handler);
  },
};

const discordAPI = {
  updateActivity: (title: string) => ipcRenderer.send('discord:updateActivity', title),
  reset: () => ipcRenderer.send('discord:reset'),
};

const splashAPI = {
  onAppReady: (callback: VoidCallback) => {
    const handler = () => callback();
    ipcRenderer.on('splash:ready', handler);
    return () => ipcRenderer.removeListener('splash:ready', handler);
  },
};

contextBridge.exposeInMainWorld('electron', {
  window: windowAPI,
  app: appAPI,
  webview: webviewAPI,
  update: updateAPI,
  splash: splashAPI,
  discord: discordAPI,
  platform: process.platform,
});

declare global {
  interface Window {
    electron: {
      window: typeof windowAPI;
      app: typeof appAPI;
      webview: typeof webviewAPI;
      update: typeof updateAPI;
      splash: typeof splashAPI;
      discord: typeof discordAPI;
      platform: NodeJS.Platform;
    };
  }
}
