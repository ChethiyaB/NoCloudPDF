/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFiles: () => Promise<string[]>;
    saveFile: (defaultName: string) => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
    readFile: (filePath: string) => Promise<ArrayBuffer>;
    writeFile: (filePath: string, data: Uint8Array) => Promise<void>;
    getFileSize: (filePath: string) => Promise<number>;
    showItemInFolder: (fullPath: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
  };
}
