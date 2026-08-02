import { BrowserWindow, app, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true
		},
		titleBarStyle: "hidden",
		backgroundColor: "#0f172a"
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);
ipcMain.handle("dialog:openFiles", async () => {
	if (!win) return [];
	const { canceled, filePaths } = await dialog.showOpenDialog(win, {
		properties: ["openFile", "multiSelections"],
		filters: [{
			name: "PDFs",
			extensions: ["pdf"]
		}]
	});
	if (canceled) return [];
	return filePaths;
});
ipcMain.handle("dialog:saveFile", async (event, defaultName) => {
	if (!win) return null;
	const { canceled, filePath } = await dialog.showSaveDialog(win, {
		defaultPath: defaultName,
		filters: [{
			name: "PDF",
			extensions: ["pdf"]
		}]
	});
	if (canceled) return null;
	return filePath;
});
ipcMain.handle("fs:readFile", async (event, filePath) => {
	try {
		return (await fs.readFile(filePath)).buffer;
	} catch (error) {
		console.error("Error reading file:", error);
		throw error;
	}
});
ipcMain.handle("fs:writeFile", async (event, filePath, data) => {
	try {
		await fs.writeFile(filePath, Buffer.from(data));
		return true;
	} catch (error) {
		console.error("Error writing file:", error);
		throw error;
	}
});
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
