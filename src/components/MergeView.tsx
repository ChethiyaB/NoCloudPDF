import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Settings, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { SavePreview } from './SavePreview';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface MergeViewProps {
  files: string[];
  onBack: () => void;
  onSave?: (path: string) => void;
}

interface PdfFileData {
  id: string; // unique ID for dnd-kit
  path: string;
  name: string;
  thumbnailUrl: string;
}

function SortableItem({ file, onRemove }: { file: PdfFileData, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-surface-container-lowest border border-surface-variant rounded-md shadow-sm transition-shadow cursor-move overflow-hidden flex items-center gap-4 p-3 ${isDragging ? 'shadow-2xl ring-2 ring-primary' : 'hover:shadow-md'}`}
      {...attributes}
      {...listeners}
    >
      <div className="w-16 h-20 bg-surface-container-lowest border border-surface-variant flex-shrink-0 flex items-center justify-center p-1 rounded">
        {file.thumbnailUrl ? (
          <img 
            src={file.thumbnailUrl} 
            alt={file.name} 
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <FileText className="text-secondary" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-on-surface font-semibold truncate mb-1">{file.name}</h3>
        <p className="text-secondary text-sm">Drag to reorder</p>
      </div>

      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(file.id); }} 
        aria-label="Remove file"
        className="p-2 text-secondary hover:text-primary transition-colors flex-shrink-0 rounded-md hover:bg-surface-container"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}

export function MergeView({ files, onBack, onSave }: MergeViewProps) {
  const [fileList, setFileList] = useState<PdfFileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const loadThumbnails = async () => {
      try {
        if (!window.electronAPI) throw new Error("Electron API is required.");
        
        const loadedFiles: PdfFileData[] = [];
        for (let i = 0; i < files.length; i++) {
          const filePath = files[i];
          const buffer = await window.electronAPI.readFile(filePath);
          
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.3 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas as any }).promise;
          }
          
          loadedFiles.push({
            id: `file-${i}-${Date.now()}`,
            path: filePath,
            name: filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown',
            thumbnailUrl: canvas.toDataURL(),
          });
        }
        
        setFileList(loadedFiles);
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.message || '';
        if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
          setError("One or more files could not be found. They may have been moved or deleted from your device.");
        } else {
          setError("Failed to load PDF: " + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadThumbnails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = (id: string) => {
    setFileList(fileList.filter(f => f.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFileList((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddFiles = async () => {
    if (!window.electronAPI) return;
    try {
      const newFiles = await window.electronAPI.openFiles();
      if (!newFiles || newFiles.length === 0) return;
      
      setIsProcessing(true);
      const addedFiles: PdfFileData[] = [];
      
      for (let i = 0; i < newFiles.length; i++) {
        const filePath = newFiles[i];
        if (fileList.some(f => f.path === filePath)) continue;
        
        const buffer = await window.electronAPI.readFile(filePath);
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.2 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        let thumbnailUrl = '';
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport, canvas: canvas as any }).promise;
          thumbnailUrl = canvas.toDataURL();
        }
        
        addedFiles.push({
          id: `file-new-${Date.now()}-${i}`,
          path: filePath,
          name: filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown',
          thumbnailUrl,
        });
      }
      
      setFileList(prev => [...prev, ...addedFiles]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || '';
      if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
        setError("One or more files could not be found. They may have been moved or deleted.");
      } else {
        setError("Failed to load PDF: " + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrepareMerge = async () => {
    if (fileList.length < 2) {
      setError('Please select at least two PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    setError('');

    try {
      if (!window.electronAPI) throw new Error("Electron API is required.");

      const mergedPdf = await PDFDocument.create();

      for (const fileData of fileList) {
        const fileBuffer = await window.electronAPI.readFile(fileData.path);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      setGeneratedPdfBytes(mergedPdfBytes);
      setShowPreview(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during merging.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!generatedPdfBytes || !window.electronAPI) return;
    setSaveError('');
    try {
      const savePath = await window.electronAPI.saveFile('merged.pdf');
      if (savePath) {
        await window.electronAPI.writeFile(savePath, generatedPdfBytes);
        setSavedFilePath(savePath);
        setSaveSuccess(`Successfully merged and saved to ${savePath}`);
        if (onSave) onSave(savePath);
      } else {
        setSaveError('Save operation canceled.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Error saving file.');
    }
  };

  if (showPreview) {
    return (
      <div className="p-8">
        <SavePreview 
          pdfBytes={generatedPdfBytes}
          savedFilePath={savedFilePath}
          onCancel={() => { 
            setShowPreview(false); 
            setGeneratedPdfBytes(null); 
            setSaveSuccess(''); 
            setSaveError('');
            setSavedFilePath('');
            if (saveSuccess) {
              onBack();
            }
          }}
          onConfirm={handleConfirmSave}
          successMessage={saveSuccess}
          errorMessage={saveError}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto w-full flex-1 flex flex-col"
    >
      <button 
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-on-surface transition-colors mb-6 self-start" 
        onClick={onBack}
      >
        <ArrowLeft size={16} /> Back to Menu
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-on-surface mb-2">Merge PDFs</h1>
        <p className="text-secondary text-sm">Drag and drop the documents to reorder them before merging.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Settings size={40} className="animate-spin text-secondary mb-4" />
          <p className="text-secondary">Loading thumbnails...</p>
        </div>
      ) : error && fileList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <FileText size={48} className="text-error mb-4" />
          <h2 className="text-2xl font-bold text-on-surface mb-2">File Not Found</h2>
          <p className="text-secondary mb-6">{error}</p>
          <button 
            onClick={onBack}
            className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition-colors"
          >
            Return to Workspace
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-on-surface">Files to Merge ({fileList.length})</h2>
            <button 
              onClick={handleAddFiles}
              disabled={isProcessing}
              className="text-primary font-medium hover:bg-primary-light px-4 py-2 rounded-md transition-colors text-sm disabled:opacity-50"
            >
              + Add More Files
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mb-8">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fileList.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-4 max-w-3xl">
                  {fileList.map((file) => (
                    <SortableItem key={file.id} file={file} onRemove={removeFile} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {fileList.length === 0 && (
              <div className="text-center p-12 text-secondary">
                No files selected.
              </div>
            )}
          </div>
          
          <div className="sticky bottom-0 bg-background pt-4 pb-8 z-20">
            <button 
              onClick={handlePrepareMerge}
              disabled={isProcessing || fileList.length < 2}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 px-6 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <><Settings className="animate-spin" size={20} /> Processing...</>
              ) : (
                <><Save size={20} /> Merge and Continue</>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
