/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFiles: () => Promise<string[]>;
    saveFile: (defaultName: string) => Promise<string | null>;
  };
}
