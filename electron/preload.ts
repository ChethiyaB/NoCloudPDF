import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:getFileSize', filePath),
  compressPdf: (inputPath: string, outputPath: string, level: string) => ipcRenderer.invoke('fs:compressPdf', inputPath, outputPath, level),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('os:showItemInFolder', fullPath),
  openExternal: (url: string) => ipcRenderer.invoke('os:openExternal', url),
});
