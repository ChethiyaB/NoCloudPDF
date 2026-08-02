let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	openFiles: () => electron.ipcRenderer.invoke("dialog:openFiles"),
	saveFile: (defaultName) => electron.ipcRenderer.invoke("dialog:saveFile", defaultName)
});
//#endregion
