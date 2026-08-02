import { BrowserWindow as e, app as t, dialog as n, ipcMain as r } from "electron";
import i from "node:path";
import a from "node:fs/promises";
import { fileURLToPath as o } from "node:url";
//#region electron/main.ts
var s = i.dirname(o(import.meta.url));
process.env.APP_ROOT = i.join(s, "..");
var c = process.env.VITE_DEV_SERVER_URL, l = i.join(process.env.APP_ROOT, "dist-electron"), u = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? i.join(process.env.APP_ROOT, "public") : u;
var d;
function f() {
	d = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: i.join(s, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		},
		backgroundColor: "#0f172a"
	}), c ? d.loadURL(c) : d.loadFile(i.join(u, "index.html"));
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), d = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && f();
}), t.whenReady().then(f), r.handle("dialog:openFiles", async () => {
	if (!d) return [];
	let { canceled: e, filePaths: t } = await n.showOpenDialog(d, {
		properties: ["openFile", "multiSelections"],
		filters: [{
			name: "PDFs",
			extensions: ["pdf"]
		}]
	});
	return e ? [] : t;
}), r.handle("dialog:saveFile", async (e, t) => {
	if (!d) return null;
	let { canceled: r, filePath: i } = await n.showSaveDialog(d, {
		defaultPath: t,
		filters: [{
			name: "PDF",
			extensions: ["pdf"]
		}]
	});
	return r ? null : i;
}), r.handle("fs:readFile", async (e, t) => {
	try {
		return (await a.readFile(t)).buffer;
	} catch (e) {
		throw console.error("Error reading file:", e), e;
	}
}), r.handle("fs:writeFile", async (e, t, n) => {
	try {
		return await a.writeFile(t, Buffer.from(n)), !0;
	} catch (e) {
		throw console.error("Error writing file:", e), e;
	}
});
//#endregion
export { l as MAIN_DIST, u as RENDERER_DIST, c as VITE_DEV_SERVER_URL };
