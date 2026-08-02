import { motion } from 'framer-motion';
import { FileText, MoreVertical, Combine, ListOrdered, Trash2, Edit3 } from 'lucide-react';
import { useState } from 'react';

export interface FileData {
  path: string;
  name: string;
  lastAccessed: number;
  size: number;
}

interface FileListViewProps {
  files: FileData[];
  searchQuery: string;
  onSelectAction: (action: 'merge' | 'reorder' | 'delete' | 'edit', filePaths: string[]) => void;
  title: string;
}

export function FileListView({ files, searchQuery, onSelectAction, title }: FileListViewProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto w-full"
    >
      <h1 className="text-3xl font-bold text-on-surface mb-2">{title}</h1>
      <p className="text-secondary text-lg mb-8">
        {searchQuery ? `Search results for "${searchQuery}"` : 'Manage your workspace documents.'}
      </p>

      {filteredFiles.length === 0 ? (
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-12 text-center shadow-sm">
          <FileText size={48} className="mx-auto text-surface-variant mb-4" />
          <h3 className="text-xl font-semibold text-on-surface mb-2">No files found</h3>
          <p className="text-secondary">Upload a document to get started.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-variant text-secondary text-sm font-semibold uppercase tracking-wider">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold hidden md:table-cell">Last Accessed</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Size</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file, index) => {
                const isLast = index >= filteredFiles.length - 2 && filteredFiles.length > 2;
                return (
                <tr key={file.path} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="font-medium text-on-surface truncate max-w-xs md:max-w-md lg:max-w-lg" title={file.name}>
                        {file.name}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-secondary hidden md:table-cell whitespace-nowrap">
                    {formatDate(file.lastAccessed)}
                  </td>
                  <td className="p-4 text-secondary hidden lg:table-cell whitespace-nowrap">
                    {formatSize(file.size)}
                  </td>
                  <td className="p-4 text-right relative">
                    <button 
                      className="p-2 text-secondary hover:text-on-surface rounded-full hover:bg-surface-container transition-colors focus:outline-none"
                      onClick={() => setMenuOpenId(menuOpenId === file.path ? null : file.path)}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {menuOpenId === file.path && (
                      <div className={`absolute right-8 ${isLast ? 'bottom-12' : 'top-12'} w-48 bg-surface-container-lowest border border-surface-variant rounded-md shadow-lg py-1 z-50 text-left`}>
                        <button 
                          className="w-full px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                          onClick={() => { setMenuOpenId(null); onSelectAction('reorder', [file.path]); }}
                        >
                          <ListOrdered size={16} className="text-secondary" /> Organize Pages
                        </button>
                        <button 
                          className="w-full px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                          onClick={() => { setMenuOpenId(null); onSelectAction('merge', [file.path]); }}
                        >
                          <Combine size={16} className="text-secondary" /> Merge with...
                        </button>
                        <button 
                          className="w-full px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                          onClick={() => { setMenuOpenId(null); onSelectAction('delete', [file.path]); }}
                        >
                          <Trash2 size={16} className="text-secondary" /> Delete Pages
                        </button>
                        <button 
                          className="w-full px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                          onClick={() => { setMenuOpenId(null); onSelectAction('edit', [file.path]); }}
                        >
                          <Edit3 size={16} className="text-secondary" /> Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
