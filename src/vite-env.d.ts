/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFiles: () => Promise<string[]>;
    saveFile: (defaultName: string) => Promise<string | null>;
    readFile: (filePath: string) => Promise<ArrayBuffer>;
    writeFile: (filePath: string, data: Uint8Array) => Promise<boolean>;
    showItemInFolder: (fullPath: string) => Promise<void>;
  };
}
