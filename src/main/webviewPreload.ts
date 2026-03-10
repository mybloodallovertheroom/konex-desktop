import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__konexBridge__', {
  openExternal: (url: string): void => ipcRenderer.send('shell:openExternal', url),
  updateRPC: (title: string): void => ipcRenderer.send('discord:updateActivity', title),
});
