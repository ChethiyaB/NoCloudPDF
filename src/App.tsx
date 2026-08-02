import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Upload, Combine, ListOrdered, Trash2, Edit3, Minimize, Settings, HelpCircle } from 'lucide-react';
import { MergeView } from './components/MergeView';
import { ReorderDeleteView } from './components/ReorderDeleteView';
import { ToolboxView } from './components/ToolboxView';
import './App.css';

type AppView = 'landing' | 'merge' | 'reorder' | 'delete' | 'edit';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleActionClick = async (view: AppView) => {
    if (window.electronAPI) {
      const files = await window.electronAPI.openFiles();
      if (files && files.length > 0) {
        setSelectedFiles(files);
        setCurrentView(view);
      }
    } else {
      console.warn('Electron API not found. Running in browser?');
      // Fallback for browser testing
      setSelectedFiles(['dummy.pdf']);
      setCurrentView(view);
    }
  };

  const navItemClass = (active: boolean) => 
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      active 
        ? 'text-primary bg-primary-light' 
        : 'text-neutral-700 hover:bg-surface-container'
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

  return (
    <div className="font-sans antialiased text-on-surface bg-surface h-screen flex flex-col overflow-hidden">
      {/* TopHeader */}
      <header className="bg-surface border-b border-surface-variant h-16 flex items-center px-4 justify-between shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-6 w-64">
          <img alt="NoCloudPDF Logo" className="h-10 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGKJEUnzpfcGw4k6eWFp_6FSy3QVuEAw21JvNidduk4cQj5OeHBb_00IFPamA5_zggaBr55nJVrCiYLGPi9-HdU3NeoA9S3BOsONVYf43qpnsdFG6BP3rqcxZob0MH2yqLFSAHiyo5OIqr7FJXeOTMGPuYA5BmVWkTor0jO-yc3pPe-m51dxwzn3kN4abe3j0BAvj3t7caAnrR29vWPm3MKyEnQKWtNccfZQXHy6nRrPwGa0CEldr_" />
        </div>
        
        <div className="flex-1 max-w-xl px-4 hidden md:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary">
              <Search size={18} />
            </span>
            <input 
              className="w-full bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-md py-2 pl-10 pr-4 text-sm text-on-surface placeholder-secondary outline-none" 
              placeholder="Search files..." 
              type="text" 
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium mr-4">
          <a className="text-primary border-b-2 border-primary py-5" href="#">Tools</a>
          <a className="text-secondary hover:text-on-surface transition-colors py-5" href="#">My Files</a>
          <a className="text-secondary hover:text-on-surface transition-colors py-5" href="#">Recent</a>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-surface-variant flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-1">Workspace</h2>
            <p className="text-sm text-secondary mb-6">Professional Tools</p>
            
            <button 
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 mb-6"
              onClick={() => handleActionClick('landing')} // In real flow, probably opens global file picker
            >
              <Upload size={18} /> Upload Files
            </button>

            <nav className="space-y-1">
              <a href="#" className={navItemClass(currentView === 'merge')} onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }}>
                <Combine size={18} className="text-center w-5" /> Merge
              </a>
              <a href="#" className={navItemClass(currentView === 'reorder')} onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }}>
                <ListOrdered size={18} className="text-center w-5" /> Reorder
              </a>
              <a href="#" className={navItemClass(currentView === 'delete')} onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }}>
                <Trash2 size={18} className="text-center w-5" /> Delete
              </a>
              <a href="#" className={navItemClass(currentView === 'edit')} onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }}>
                <Edit3 size={18} className="text-center w-5" /> Edit
              </a>
              <a href="#" className={navItemClass(false)}>
                <Minimize size={18} className="text-center w-5 text-secondary" /> Compress
              </a>
            </nav>
          </div>
          
          <div className="mt-auto p-4 border-t border-surface-variant">
            <a className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:bg-surface-container transition-colors" href="#">
              <Settings size={18} className="text-center w-5" /> Settings
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:bg-surface-container transition-colors" href="#">
              <HelpCircle size={18} className="text-center w-5" /> Help
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-background overflow-y-auto flex flex-col p-8">
          <AnimatePresence mode="wait">
            {currentView === 'landing' && <ToolboxView key="landing" onSelectAction={handleActionClick} />}
            {currentView === 'merge' && <MergeView key="merge" files={selectedFiles} onBack={() => setCurrentView('landing')} />}
            {currentView === 'reorder' && <ReorderDeleteView key="reorder" files={selectedFiles} onBack={() => setCurrentView('landing')} />}
            {currentView === 'delete' && <ReorderDeleteView key="delete" files={selectedFiles} onBack={() => setCurrentView('landing')} />}
            {currentView === 'edit' && renderPlaceholderView('Edit')}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
