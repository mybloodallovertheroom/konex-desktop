/**
 * Screen Picker Modal Preload
 * Expose l'API IPC pour la fenêtre de sélection d'écran
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
  display_id: string;
}

contextBridge.exposeInMainWorld('screenPickerAPI', {
  onSources: (callback: (sources: ScreenSource[]) => void) => {
    const handler = (_: IpcRendererEvent, sources: ScreenSource[]) => callback(sources);
    ipcRenderer.on('screen-picker:sources', handler);
  },
  select: (sourceId: string) => ipcRenderer.send('screen-picker:selected', sourceId),
  cancel: () => ipcRenderer.send('screen-picker:cancel'),
  platform: process.platform,
});
