import { BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import * as path from 'path';

export async function openScreenPicker(parent: BrowserWindow): Promise<string | null> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  const serializedSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon?.toDataURL() ?? null,
    display_id: s.display_id,
  }));

  return new Promise((resolve) => {
    const pickerWindow = new BrowserWindow({
      width: 860,
      height: 580,
      modal: true,
      parent,
      frame: false,
      resizable: false,
      backgroundColor: '#0b0b0d',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'screenPickerPreload.js'),
      },
    });

    const htmlPath = path.join(__dirname, '../../public/screenPicker.html');
    pickerWindow.loadFile(htmlPath);

    pickerWindow.webContents.once('did-finish-load', () => {
      pickerWindow.webContents.send('screen-picker:sources', serializedSources);
    });

    let resolved = false;

    const onSelected = (_: Electron.IpcMainEvent, sourceId: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      pickerWindow.close();
      resolve(sourceId);
    };

    const onCancel = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      pickerWindow.close();
      resolve(null);
    };

    const cleanup = () => {
      ipcMain.removeListener('screen-picker:selected', onSelected);
      ipcMain.removeListener('screen-picker:cancel', onCancel);
    };

    ipcMain.once('screen-picker:selected', onSelected);
    ipcMain.once('screen-picker:cancel', onCancel);

    pickerWindow.on('closed', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    });
  });
}
