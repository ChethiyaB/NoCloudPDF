import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Settings } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { SavePreview } from './SavePreview';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface ReorderDeleteViewProps {
  files: string[];
  onBack: () => void;
}

interface PageData {
  id: string; // unique ID for framer-motion key
  originalIndex: number;
  thumbnailUrl: string;
}

export function ReorderDeleteView({ files, onBack }: ReorderDeleteViewProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const targetFile = files[0];

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
            id: `page-${i}-${Date.now()}`, // ensure unique
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
        await window.electronAPI.writeFile(
          savePath, 
          (generatedPdfBytes.buffer as ArrayBuffer).slice(generatedPdfBytes.byteOffset, generatedPdfBytes.byteOffset + generatedPdfBytes.byteLength)
        );
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
          onCancel={() => {
            setShowPreview(false);
            setGeneratedPdfBytes(null);
            setSaveSuccess('');
            setSaveError('');
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
            {/* Using a wrapping div for the grid, but Reorder.Group wraps it. Reorder with grid can be tricky, 
                framer-motion Reorder supports flex/grid if we pass axis="x" or "y", but for 2D grids, 
                framer-motion recommends Reorder.Group without specific axis and custom CSS. 
                Wait, for a grid, Reorder needs a custom layout. Let's make it a wrapping flex container.
             */}
            <Reorder.Group 
              axis="x"
              values={pages} 
              onReorder={setPages}
              style={{ 
                listStyle: 'none', padding: 0, margin: 0, 
                display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' 
              }}
            >
              {pages.map((page, index) => (
                <Reorder.Item 
                  key={page.id} 
                  value={page}
                  style={{
                    background: 'var(--glass-bg)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    width: '180px',
                    cursor: 'grab'
                  }}
                  whileDrag={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1 }}
                >
                  <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    {index + 1}
                  </span>
                  
                  <button 
                    onClick={() => removePage(page.id)} 
                    style={{ position: 'absolute', top: 5, right: 5, padding: '0.25rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <img 
                    src={page.thumbnailUrl} 
                    alt={`Page ${index+1}`} 
                    style={{ width: '100%', height: 'auto', borderRadius: '4px', background: 'white', marginTop: '1.5rem', pointerEvents: 'none' }} 
                  />
                  
                </Reorder.Item>
              ))}
            </Reorder.Group>
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
