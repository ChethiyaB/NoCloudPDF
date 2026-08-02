import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Settings, File } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { SavePreview } from './SavePreview';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface ReorderDeleteViewProps {
  files: string[];
  onBack: () => void;
  onSave?: (path: string) => void;
}

interface PageData {
  id: string; // unique ID for dnd-kit key
  originalIndex: number;
  thumbnailUrl: string;
}

function SortableItem({ page, index, onRemove }: { page: PageData, index: number, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
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
      className={`relative group bg-surface-container-lowest border border-surface-variant rounded-md shadow-sm transition-shadow cursor-move overflow-hidden aspect-[1/1.4] flex flex-col ${isDragging ? 'shadow-2xl ring-2 ring-primary' : 'hover:shadow-md'}`}
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-2 left-2 bg-on-surface/70 text-white text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm z-10">
        {index + 1}
      </div>
      
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(page.id); }} 
        aria-label={`Delete page ${index + 1}`}
        className="absolute top-2 right-2 bg-primary text-white w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-hover shadow-sm z-10"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex-1 bg-surface-container-lowest w-full h-full p-2">
        <div className="w-full h-full bg-surface-container-lowest border border-surface-variant shadow-sm overflow-hidden flex items-center justify-center text-surface-variant relative">
           {page.thumbnailUrl ? (
             <img 
               src={page.thumbnailUrl} 
               alt={`Page ${index+1}`} 
               className="w-full h-full object-contain pointer-events-none"
             />
           ) : (
             <File size={40} className="text-surface-variant" />
           )}
        </div>
      </div>
    </div>
  );
}

export function ReorderDeleteView({ files, onBack, onSave }: ReorderDeleteViewProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');

  const targetFile = files[0];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const loadPdf = async () => {
      try {
        if (!window.electronAPI) throw new Error("Electron API is required.");
        const buffer = await window.electronAPI.readFile(targetFile);

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const pageDataArray: PageData[] = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas as any }).promise;
          }
          
          pageDataArray.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i - 1,
            thumbnailUrl: canvas.toDataURL(),
          });
        }
        
        setPages(pageDataArray);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load PDF: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (targetFile) loadPdf();
  }, [targetFile]);

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePrepareSave = async () => {
    if (!window.electronAPI) return;
    setProcessing(true);
    setError('');

    try {
      const freshBuffer = await window.electronAPI.readFile(targetFile);
      const originalPdf = await PDFDocument.load(freshBuffer);
      const newPdf = await PDFDocument.create();
      
      const indicesToCopy = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, indicesToCopy);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      setGeneratedPdfBytes(pdfBytes);
      setShowPreview(true);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process PDF');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!generatedPdfBytes || !window.electronAPI) return;
    setSaveError('');
    try {
      const savePath = await window.electronAPI.saveFile(`modified-${targetFile.split('/').pop()}`);
      if (savePath) {
        await window.electronAPI.writeFile(savePath, generatedPdfBytes);
        setSavedFilePath(savePath);
        setSaveSuccess(`Saved successfully to ${savePath}`);
        if (onSave) onSave(savePath);
      } else {
        setSaveError('Save canceled.');
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
        <h1 className="text-3xl font-bold text-on-surface mb-2">Organize Pages</h1>
        <p className="text-lg font-medium text-secondary mb-1">{targetFile.split('/').pop() || targetFile.split('\\').pop()}</p>
        <p className="text-secondary text-sm">Drag and drop pages to reorder, or click the trash icon to delete.</p>
      </div>

      {error && <div className="text-error mb-4">{error}</div>}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Settings size={40} className="animate-spin text-secondary mb-4" />
          <p className="text-secondary">Loading PDF pages...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8 flex-1 content-start">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                {pages.map((page, i) => (
                  <SortableItem key={page.id} page={page} index={i} onRemove={removePage} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="sticky bottom-0 bg-background pt-4 pb-8 z-20">
            <button 
              onClick={handlePrepareSave}
              disabled={processing || pages.length === 0}
              className="w-full bg-primary hover:bg-primary-hover text-on-primary font-semibold py-3 px-6 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <><Settings className="animate-spin" size={20} /> Processing...</>
              ) : (
                <><Save size={20} /> Continue to Save</>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
