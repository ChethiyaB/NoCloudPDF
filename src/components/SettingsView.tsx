import { motion } from 'framer-motion';
import { Settings, Moon, Sun, FolderOpen } from 'lucide-react';

interface SettingsViewProps {
  onBack?: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  defaultSavePath: string;
  setDefaultSavePath: (path: string) => void;
}

export function SettingsView({ onBack, theme, setTheme, defaultSavePath, setDefaultSavePath }: SettingsViewProps) {
  
  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setDefaultSavePath(path);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto w-full"
    >
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 text-secondary hover:bg-surface-container rounded-full transition-colors"
            aria-label="Back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
        )}
        <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
          <Settings className="text-primary" size={28} /> Settings
        </h1>
      </div>
      <p className="text-secondary text-lg mb-8">Customize your NoCloudPDF workspace.</p>
      
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-8 flex flex-col gap-8 shadow-sm">
        
        {/* Theme Settings */}
        <div>
          <h2 className="text-xl font-semibold text-on-surface mb-4">Appearance</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => setTheme('light')}
              className={`flex-1 py-4 px-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${theme === 'light' ? 'bg-primary-light border-primary text-primary' : 'bg-surface border-surface-variant text-secondary hover:bg-surface-container'}`}
            >
              <Sun size={24} />
              <span className="font-medium">Light</span>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex-1 py-4 px-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${theme === 'dark' ? 'bg-primary-light border-primary text-primary' : 'bg-surface border-surface-variant text-secondary hover:bg-surface-container'}`}
            >
              <Moon size={24} />
              <span className="font-medium">Dark</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-surface-variant w-full"></div>

        {/* Save Location Settings */}
        <div>
          <h2 className="text-xl font-semibold text-on-surface mb-4">File Management</h2>
          <label className="block text-sm font-medium text-secondary mb-2">Default Save Location</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={defaultSavePath || 'Same as original file'}
              className="flex-1 bg-surface border border-surface-variant rounded-md px-4 py-2 text-on-surface focus:outline-none"
            />
            <button 
              onClick={handleSelectDirectory}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm font-medium"
            >
              <FolderOpen size={18} /> Browse
            </button>
          </div>
          <p className="text-xs text-secondary mt-2">If not set, saved files will be placed in the same directory as the original document.</p>
        </div>

      </div>
    </motion.div>
  );
}
