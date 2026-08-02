import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Settings } from 'lucide-react';
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
      style={{
        ...style,
        background: 'var(--glass-bg)',
        borderRadius: '8px',
        padding: '0.5rem',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        width: '180px',
        cursor: 'grab',
        boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.5)' : 'none'
      }}
      {...attributes}
      {...listeners}
    >
      <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
        {index + 1}
      </span>
      
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(page.id); }} 
        style={{ position: 'absolute', top: 5, right: 5, padding: '0.25rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      >
        <Trash2 size={16} />
      </button>

      <img 
        src={page.thumbnailUrl} 
        alt={`Page ${index+1}`} 
        style={{ width: '100%', height: 'auto', borderRadius: '4px', background: 'white', marginTop: '1.5rem', pointerEvents: 'none' }} 
      />
    </div>
  );
}

export function ReorderDeleteView({ files, onBack }: ReorderDeleteViewProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

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
        setPdfBuffer(buffer);

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
    if (!pdfBuffer || !window.electronAPI) return;
    setProcessing(true);
    setError('');

    try {
      const originalPdf = await PDFDocument.load(pdfBuffer);
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
        setSaveSuccess(`Saved successfully to ${savePath}`);
      } else {
        setSaveError('Save canceled.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Error saving file.');
    }
  };

  if (showPreview) {
    return (
      <div style={{ padding: '2rem' }}>
        <SavePreview 
          pdfBytes={generatedPdfBytes}
          onCancel={() => { setShowPreview(false); setGeneratedPdfBytes(null); setSaveSuccess(''); setSaveError(''); }}
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
      className="view-container"
      style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', marginTop: '2rem' }}
    >
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} /> Back to Menu
      </button>

      <h2>Organize Pages</h2>
      <p>{targetFile.split('/').pop() || targetFile.split('\\').pop()}</p>
      <p style={{ color: 'var(--text-secondary)' }}>Drag and drop pages to reorder, or click the trash icon to delete.</p>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Settings size={40} className="spinner" style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '1rem' }}>Loading PDF pages...</p>
        </div>
      ) : (
        <>
          <div style={{ marginTop: '2rem' }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                  {pages.map((page, index) => (
                    <SortableItem key={page.id} page={page} index={index} onRemove={removePage} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          
          {pages.length === 0 && <div style={{ textAlign: 'center', padding: '2rem' }}>No pages left.</div>}

          <button 
            onClick={handlePrepareSave}
            disabled={processing || pages.length === 0}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '1rem', marginTop: '2rem',
              background: 'var(--accent-color)', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '1.1rem', cursor: (processing || pages.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (processing || pages.length === 0) ? 0.7 : 1,
              transition: 'background 0.2s'
            }}
          >
            <Save size={20} />
            {processing ? 'Processing...' : 'Continue to Save'}
          </button>
        </>
      )}
    </motion.div>
  );
}
