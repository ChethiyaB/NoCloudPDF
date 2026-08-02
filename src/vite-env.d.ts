/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFiles: () => Promise<string[]>;
    saveFile: (defaultName: string) => Promise<string | null>;
    readFile: (filePath: string) => Promise<ArrayBuffer>;
    writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>;
  };
}
