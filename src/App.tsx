import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ListOrdered, Trash2, Edit3, ArrowLeft } from 'lucide-react';
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

  const renderLanding = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="landing-grid"
    >
      <div className="action-card" onClick={() => handleActionClick('merge')}>
        <div className="icon-wrapper">
          <Layers size={32} color="#60a5fa" />
        </div>
        <h2>Merge PDFs</h2>
        <p>Combine multiple PDF files into a single document.</p>
      </div>

      <div className="action-card" onClick={() => handleActionClick('reorder')}>
        <div className="icon-wrapper">
          <ListOrdered size={32} color="#34d399" />
        </div>
        <h2>Reorder Pages</h2>
        <p>Rearrange the order of pages within a PDF.</p>
      </div>

      <div className="action-card" onClick={() => handleActionClick('delete')}>
        <div className="icon-wrapper">
          <Trash2 size={32} color="#f87171" />
        </div>
        <h2>Delete Pages</h2>
        <p>Remove specific pages from your PDF file.</p>
      </div>

      <div className="action-card" onClick={() => handleActionClick('edit')}>
        <div className="icon-wrapper">
          <Edit3 size={32} color="#c084fc" />
        </div>
        <h2>Edit PDF</h2>
        <p>Modify structural aspects of your PDF seamlessly.</p>
      </div>
    </motion.div>
  );

  const renderPlaceholderView = (title: string) => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container"
      style={{ width: '100%', textAlign: 'center', marginTop: '2rem' }}
    >
      <button className="back-button" onClick={() => setCurrentView('landing')}>
        <ArrowLeft size={20} /> Back to Menu
      </button>
      <h2>{title} View</h2>
      <p>Selected Files: {selectedFiles.length}</p>
      <div style={{ background: 'var(--glass-bg)', padding: '2rem', borderRadius: '16px', marginTop: '2rem' }}>
        {selectedFiles.map((file, i) => (
          <div key={i} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            {file}
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>PDF Studio</h1>
        <p>Seamless, powerful, and beautiful PDF manipulation.</p>
      </header>

      <AnimatePresence mode="wait">
        {currentView === 'landing' && renderLanding()}
        {currentView === 'merge' && renderPlaceholderView('Merge')}
        {currentView === 'reorder' && renderPlaceholderView('Reorder')}
        {currentView === 'delete' && renderPlaceholderView('Delete')}
        {currentView === 'edit' && renderPlaceholderView('Edit')}
      </AnimatePresence>
    </div>
  );
}

export default App;
