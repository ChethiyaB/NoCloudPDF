import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Upload, Combine, ListOrdered, Trash2, Edit3, Minimize, Settings, HelpCircle } from 'lucide-react';
import { MergeView } from './components/MergeView';
import { ReorderDeleteView } from './components/ReorderDeleteView';
import { ToolboxView } from './components/ToolboxView';
import { SettingsView } from './components/SettingsView';
import { FileListView, type FileData } from './components/FileListView';
import './App.css';

type AppView = 'landing' | 'merge' | 'reorder' | 'delete' | 'edit' | 'my-files' | 'recent' | 'settings';
type ThemeMode = 'light' | 'dark' | 'system';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Settings & State
  const [myFiles, setMyFiles] = useState<FileData[]>(() => {
    const saved = localStorage.getItem('nocloudpdf_files');
    return saved ? JSON.parse(saved) : [];
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('nocloudpdf_theme') as ThemeMode) || 'light';
  });
  const [defaultSavePath, setDefaultSavePath] = useState<string>(() => {
    return localStorage.getItem('nocloudpdf_save_path') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Persist State
  useEffect(() => {
    localStorage.setItem('nocloudpdf_files', JSON.stringify(myFiles));
  }, [myFiles]);

  useEffect(() => {
    localStorage.setItem('nocloudpdf_theme', theme);
    localStorage.setItem('nocloudpdf_save_path', defaultSavePath);
    
    // Apply theme
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, defaultSavePath]);

  // Sync default save path with electron if needed in future (it can just be passed down)

  const handleActionClick = async (action: 'merge' | 'reorder' | 'delete' | 'edit', files?: string[]) => {
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setCurrentView(action);
      
      // Update last accessed
      setMyFiles(prev => prev.map(f => 
        files.includes(f.path) ? { ...f, lastAccessed: Date.now() } : f
      ));
      return;
    }

    if (window.electronAPI) {
      const selected = await window.electronAPI.openFiles();
      if (selected && selected.length > 0) {
        addFilesToWorkspace(selected);
        setSelectedFiles(selected);
        setCurrentView(action);
      }
    } else {
      console.warn('Electron API not found. Running in browser?');
      setSelectedFiles(['dummy.pdf']);
      setCurrentView(action);
    }
  };

  const handleUploadFiles = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openFiles();
      if (selected && selected.length > 0) {
        await addFilesToWorkspace(selected);
        setCurrentView('my-files');
      }
    }
  };

  const addFilesToWorkspace = async (paths: string[]) => {
    const fileInfos = await Promise.all(
      paths.map(async (path) => {
        let size = 0;
        if (window.electronAPI?.getFileSize) {
          size = await window.electronAPI.getFileSize(path);
        }
        return {
          path,
          name: path.split('/').pop() || path.split('\\').pop() || 'Unknown',
          size,
          lastAccessed: Date.now()
        };
      })
    );

    setMyFiles(prev => {
      const newFiles = [...prev];
      fileInfos.forEach(info => {
        if (!newFiles.find(f => f.path === info.path)) {
          newFiles.push(info);
        }
      });
      return newFiles;
    });
  };

  const navItemClass = (active: boolean) => 
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      active 
        ? 'text-primary bg-primary-light' 
        : 'text-secondary hover:bg-surface-container hover:text-on-surface'
    }`;
    
  const topNavClass = (active: boolean) => 
    `py-5 transition-colors ${
      active 
        ? 'text-primary border-b-2 border-primary font-semibold' 
        : 'text-secondary hover:text-on-surface'
    }`;

  const renderPlaceholderView = (title: string) => (
    <div className="p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col">
      <button 
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-on-surface transition-colors mb-6 self-start"
        onClick={() => setCurrentView('landing')}
      >
        &larr; Back to Menu
      </button>
      <h1 className="text-3xl font-bold text-on-surface mb-2">{title} View</h1>
      <p className="text-lg font-medium text-secondary mb-1">Not supported yet</p>
    </div>
  );

  const getRecentFiles = () => [...myFiles].sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 10);

  return (
    <div className="font-sans antialiased text-on-surface bg-surface h-screen flex flex-col overflow-hidden">
      {/* TopHeader */}
      <header className="bg-surface border-b border-surface-variant h-16 flex items-center px-4 justify-between shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-6 w-64 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <img alt="NoCloudPDF Logo" className="h-10 w-auto object-contain" src={isDarkMode ? "/src/assets/logo-dark.png" : "/src/assets/logo-light.png"} />
        </div>
        
        <div className="flex-1 max-w-xl px-4 hidden md:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary">
              <Search size={18} />
            </span>
            <input 
              className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-10 pr-4 text-sm text-on-surface placeholder-secondary outline-none transition-all" 
              placeholder="Search files..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value && currentView !== 'my-files' && currentView !== 'recent') {
                  setCurrentView('my-files');
                }
              }}
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm mr-4 h-full">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }} className={topNavClass(currentView === 'landing')}>Tools</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('my-files'); }} className={topNavClass(currentView === 'my-files')}>My Files</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('recent'); }} className={topNavClass(currentView === 'recent')}>Recent</a>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-surface-variant flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-1">Workspace</h2>
            <p className="text-sm text-secondary mb-6">Professional Tools</p>
            
            <button 
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 mb-6 shadow-sm"
              onClick={handleUploadFiles}
            >
              <Upload size={18} /> Upload Files
            </button>

            <nav className="space-y-1">
              <div className={navItemClass(currentView === 'merge')}>
                <Combine size={18} className="text-center w-5" /> Merge
              </div>
              <div className={navItemClass(currentView === 'reorder')}>
                <ListOrdered size={18} className="text-center w-5" /> Reorder
              </div>
              <div className={navItemClass(currentView === 'delete')}>
                <Trash2 size={18} className="text-center w-5" /> Delete
              </div>
              <div className={navItemClass(currentView === 'edit')}>
                <Edit3 size={18} className="text-center w-5" /> Edit
              </div>
              <div className={navItemClass(false)}>
                <Minimize size={18} className="text-center w-5 text-secondary" /> Compress
              </div>
            </nav>
          </div>
          
          <div className="mt-auto p-4 border-t border-surface-variant">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('settings'); }} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'settings' ? 'text-primary bg-primary-light' : 'text-secondary hover:bg-surface-container'}`}>
              <Settings size={18} className="text-center w-5" /> Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:bg-surface-container transition-colors">
              <HelpCircle size={18} className="text-center w-5" /> Help
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-background overflow-y-auto flex flex-col p-8">
          <AnimatePresence mode="wait">
            {currentView === 'landing' && <ToolboxView key="landing" onSelectAction={handleActionClick} />}
            {currentView === 'my-files' && <FileListView key="my-files" title="My Files" files={myFiles} searchQuery={searchQuery} onSelectAction={handleActionClick} />}
            {currentView === 'recent' && <FileListView key="recent" title="Recent Documents" files={getRecentFiles()} searchQuery={searchQuery} onSelectAction={handleActionClick} />}
            
            {currentView === 'settings' && (
              <SettingsView 
                key="settings" 
                onBack={() => setCurrentView('landing')}
                theme={theme}
                setTheme={setTheme}
                defaultSavePath={defaultSavePath}
                setDefaultSavePath={setDefaultSavePath}
              />
            )}
            
            {/* Tool Views */}
            {currentView === 'merge' && <MergeView key="merge" files={selectedFiles} onBack={() => setCurrentView('landing')} onSave={(path) => addFilesToWorkspace([path])} />}
            {currentView === 'reorder' && <ReorderDeleteView key="reorder" files={selectedFiles} onBack={() => setCurrentView('landing')} onSave={(path) => addFilesToWorkspace([path])} />}
            {currentView === 'delete' && <ReorderDeleteView key="delete" files={selectedFiles} onBack={() => setCurrentView('landing')} onSave={(path) => addFilesToWorkspace([path])} />}
            {currentView === 'edit' && renderPlaceholderView('Edit')}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
