import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Minimize, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface CompressViewProps {
  files: string[];
  onBack: () => void;
  onSave?: (path: string) => void;
  defaultSavePath: string;
}

interface FileState {
  path: string;
  name: string;
  originalSize: number;
  status: 'pending' | 'compressing' | 'success' | 'error';
  compressedSize?: number;
  errorMsg?: string;
  savedPath?: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export function CompressView({ files, onBack, onSave, defaultSavePath }: CompressViewProps) {
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initFiles = async () => {
      if (!window.electronAPI) return;
      const states: FileState[] = [];
      for (const path of files) {
        const originalSize = await window.electronAPI.getFileSize(path);
        states.push({
          path,
          name: path.split('/').pop() || path.split('\\').pop() || 'Unknown',
          originalSize,
          status: 'pending',
        });
      }
      setFileStates(states);
      setLoading(false);
    };
    initFiles();
  }, [files]);

  const getPredictedSize = (originalSize: number) => {
    const ratio = compressionLevel === 'high' ? 0.4 : compressionLevel === 'medium' ? 0.6 : 0.8;
    return originalSize * ratio;
  };

  const handleCompress = async () => {
    if (!window.electronAPI) return;
    setIsProcessing(true);
    
    // We update all pending to compressing (we can do them in parallel or sequentially)
    // To prevent freezing and show progress, we do it one by one or Promise.all. Let's do Promise.all for batch parallel!
    
    const tasks = fileStates.filter(f => f.status === 'pending' || f.status === 'error').map(async (fileState) => {
      setFileStates(prev => prev.map(f => f.path === fileState.path ? { ...f, status: 'compressing' } : f));
      
      const fileName = fileState.name.replace('.pdf', '');
      const defaultDir = defaultSavePath || fileState.path.substring(0, fileState.path.lastIndexOf('/') !== -1 ? fileState.path.lastIndexOf('/') : fileState.path.lastIndexOf('\\'));
      
      const outputPath = `${defaultDir}/${fileName}_compressed.pdf`;
      
      try {
        await window.electronAPI!.compressPdf(fileState.path, outputPath, compressionLevel);
        const newSize = await window.electronAPI!.getFileSize(outputPath);
        
        setFileStates(prev => prev.map(f => f.path === fileState.path ? { 
          ...f, 
          status: 'success', 
          compressedSize: newSize,
          savedPath: outputPath 
        } : f));
        
        if (onSave) onSave(outputPath);
      } catch (e: any) {
        setFileStates(prev => prev.map(f => f.path === fileState.path ? { 
          ...f, 
          status: 'error', 
          errorMsg: e.message 
        } : f));
      }
    });

    await Promise.all(tasks);
    setIsProcessing(false);
  };

  const completedCount = fileStates.filter(f => f.status === 'success').length;
  const isFinished = completedCount > 0 && !isProcessing;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto w-full flex-1 flex flex-col"
    >
      <button 
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-on-surface transition-colors mb-6 self-start" 
        onClick={onBack}
      >
        <ArrowLeft size={16} /> Back to Menu
      </button>

      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Compress PDFs</h1>
          <p className="text-secondary text-sm">Batch compress your PDFs to save space.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-secondary">Compression Level</label>
          <select 
            value={compressionLevel}
            onChange={(e) => setCompressionLevel(e.target.value as any)}
            disabled={isProcessing}
            className="bg-surface-container-low border border-surface-variant rounded-md py-2 px-3 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="low">Low (High Quality, Less Compression)</option>
            <option value="medium">Medium (E-book Quality, Balanced)</option>
            <option value="high">High (Screen Quality, Max Compression)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Settings size={40} className="animate-spin text-secondary mb-4" />
          <p className="text-secondary">Loading files...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6 shadow-sm mb-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {fileStates.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-surface-variant">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-on-surface font-medium truncate mb-1" title={file.name}>{file.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span>Original: {formatBytes(file.originalSize)}</span>
                      {file.status === 'pending' && (
                        <span>→ Predicted: ~{formatBytes(getPredictedSize(file.originalSize))}</span>
                      )}
                      {file.status === 'success' && file.compressedSize && (
                        <span className="text-success font-medium">→ New: {formatBytes(file.compressedSize)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center pl-4 shrink-0">
                  {file.status === 'pending' && <span className="text-secondary text-sm">Ready</span>}
                  {file.status === 'compressing' && <Settings className="animate-spin text-primary" size={20} />}
                  {file.status === 'success' && <CheckCircle className="text-success" size={20} />}
                  {file.status === 'error' && (
                    <div className="flex items-center gap-2 text-error" title={file.errorMsg}>
                      <AlertCircle size={20} />
                      <span className="text-sm">Failed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-auto">
        <button 
          className="px-6 py-2.5 rounded-md font-medium text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
          onClick={onBack}
          disabled={isProcessing}
        >
          {isFinished ? 'Done' : 'Cancel'}
        </button>
        
        {!isFinished && (
          <button 
            className="px-6 py-2.5 rounded-md font-medium bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            onClick={handleCompress}
            disabled={isProcessing || fileStates.length === 0}
          >
            {isProcessing ? (
              <>
                <Settings size={18} className="animate-spin" /> Compressing...
              </>
            ) : (
              <>
                <Minimize size={18} /> Compress {fileStates.length} Files
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
