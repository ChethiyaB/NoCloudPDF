let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	openFiles: () => electron.ipcRenderer.invoke("dialog:openFiles"),
	saveFile: (defaultName) => electron.ipcRenderer.invoke("dialog:saveFile", defaultName),
	readFile: (filePath) => electron.ipcRenderer.invoke("fs:readFile", filePath),
	writeFile: (filePath, data) => electron.ipcRenderer.invoke("fs:writeFile", filePath, data)
});
//#endregion
