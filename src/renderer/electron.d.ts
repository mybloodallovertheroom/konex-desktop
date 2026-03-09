/**
 * Type declarations for Electron IPC API
 */

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
}

interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
  app: {
    ready: () => void;
    getVersion: () => Promise<string>;
    getKonexUrl: () => Promise<string>;
    getPartition: () => Promise<string>;
    openExternal: (url: string) => void;
  };
  webview: {
    loaded: () => void;
    failed: () => void;
    reload: () => void;
    onReload: (callback: () => void) => () => void;
    onShowOffline: (callback: () => void) => () => void;
  };
  update: {
    check: () => void;
    download: () => void;
    install: () => void;
    getState: () => Promise<UpdateState>;
    onStateChange: (callback: (state: UpdateState) => void) => () => void;
  };
  splash: {
    onAppReady: (callback: () => void) => () => void;
  };
  discord: {
    updateActivity: (title: string) => void;
    reset: () => void;
  };
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
