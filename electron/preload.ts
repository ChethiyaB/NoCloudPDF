import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('os:showItemInFolder', fullPath),
  openExternal: (url: string) => ipcRenderer.invoke('os:openExternal', url),
});
