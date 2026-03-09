/**
 * Webview Preload - injecté dans konex.lol via ses.setPreloads()
 * Expose l'API screen picker et le bridge konex dans le monde principal de la page
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__electronScreenPicker__', {
  pick: (): Promise<string | null> => ipcRenderer.invoke('screen-picker:pick'),
});

// Bridge général pour konex.lol (spotify URIs, liens externes, etc.)
contextBridge.exposeInMainWorld('__konexBridge__', {
  openExternal: (url: string): void => ipcRenderer.send('shell:openExternal', url),
});
