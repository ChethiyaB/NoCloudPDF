import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface ReorderDeleteViewProps {
  files: string[];
  mode: 'reorder' | 'delete';
  onBack: () => void;
}

interface PageData {
  id: string;
  originalIndex: number;
  thumbnailUrl: string;
}

export function ReorderDeleteView({ files, mode, onBack }: ReorderDeleteViewProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  // We only support reordering/deleting from ONE file for simplicity here
  const targetFile = files[0];

  useEffect(() => {
    const loadPdf = async () => {
      try {
        if (!window.electronAPI) throw new Error("Electron API is required.");
        const buffer = await window.electronAPI.readFile(targetFile);
        setPdfBuffer(buffer);

        // Load with pdfjs for thumbnails
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const pageDataArray: PageData[] = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport: viewport, canvas: canvas } as any).promise;
          
          pageDataArray.push({
            id: `page-${i}`,
            originalIndex: i - 1, // 0-indexed for pdf-lib
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

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
    setPages(newPages);
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    setPages(newPages);
  };

  const removePage = (index: number) => {
    setPages(pages.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!pdfBuffer || !window.electronAPI) return;
    
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const originalPdf = await PDFDocument.load(pdfBuffer);
      const newPdf = await PDFDocument.create();
      
      const indicesToCopy = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, indicesToCopy);
      
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      
      const savePath = await window.electronAPI.saveFile(`modified-${targetFile.split('/').pop()}`);
      if (savePath) {
        await window.electronAPI.writeFile(savePath, (pdfBytes.buffer as ArrayBuffer).slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength));
        setSuccess(`Saved successfully to ${savePath}`);
      } else {
        setError('Save canceled.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save PDF');
    } finally {
      setProcessing(false);
    }
  };

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

      <h2>{mode === 'reorder' ? 'Reorder Pages' : 'Delete Pages'}</h2>
      <p>{targetFile}</p>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: '#34d399', marginBottom: '1rem' }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading PDF...</div>
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
            gap: '1rem', 
            marginTop: '2rem' 
          }}>
            {pages.map((page, i) => (
              <div key={page.id} style={{
                background: 'var(--glass-bg)',
                borderRadius: '8px',
                padding: '0.5rem',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', top: 5, left: 10, background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                  {i + 1}
                </span>
                <img src={page.thumbnailUrl} alt={`Page ${i+1}`} style={{ width: '100%', height: 'auto', borderRadius: '4px', marginBottom: '0.5rem' }} />
                
                <div style={{ display: 'flex', gap: '0.25rem', width: '100%', justifyContent: 'center' }}>
                  {mode === 'reorder' ? (
                    <>
                      <button onClick={() => moveLeft(i)} disabled={i === 0} style={{ flex: 1, padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>←</button>
                      <button onClick={() => moveRight(i)} disabled={i === pages.length - 1} style={{ flex: 1, padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: i === pages.length - 1 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>→</button>
                    </>
                  ) : (
                    <button onClick={() => removePage(i)} style={{ flex: 1, padding: '0.25rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}>
                      <Trash2 size={16} style={{ display: 'block', margin: '0 auto' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {pages.length === 0 && <div style={{ textAlign: 'center', padding: '2rem' }}>No pages left.</div>}

          <button 
            onClick={handleSave}
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
            {processing ? 'Processing...' : 'Save PDF'}
          </button>
        </>
      )}
    </motion.div>
  );
}
