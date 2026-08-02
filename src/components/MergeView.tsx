import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Settings } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { SavePreview } from './SavePreview';

// Configure pdfjs worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface MergeViewProps {
  files: string[];
  onBack: () => void;
}

interface PdfFileData {
  id: string; // for framer-motion key
  path: string;
  name: string;
  thumbnailUrl: string;
}

export function MergeView({ files, onBack }: MergeViewProps) {
  const [fileList, setFileList] = useState<PdfFileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const loadThumbnails = async () => {
      try {
        if (!window.electronAPI) throw new Error("Electron API is required.");
        
        const loadedFiles: PdfFileData[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const filePath = files[i];
          const buffer = await window.electronAPI.readFile(filePath);
          
          // Load PDF to get first page thumbnail
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
        setError("Failed to load PDF thumbnails: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnails();
  }, [files]);

  const removeFile = (id: string) => {
    setFileList(fileList.filter(f => f.id !== id));
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
        await window.electronAPI.writeFile(
          savePath, 
          (generatedPdfBytes.buffer as ArrayBuffer).slice(generatedPdfBytes.byteOffset, generatedPdfBytes.byteOffset + generatedPdfBytes.byteLength)
        );
        setSaveSuccess(`Successfully merged and saved to ${savePath}`);
      } else {
        setSaveError('Save operation canceled.');
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

      <h2>Merge PDFs</h2>
      <p>Drag and drop the documents to reorder them before merging.</p>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Settings size={40} className="spinner" style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '1rem' }}>Loading thumbnails...</p>
        </div>
      ) : (
        <>
          <div style={{ marginTop: '2rem' }}>
            <Reorder.Group 
              axis="y" 
              values={fileList} 
              onReorder={setFileList}
              style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {fileList.map((file) => (
                <Reorder.Item 
                  key={file.id} 
                  value={file}
                  style={{
                    background: 'var(--glass-bg)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    cursor: 'grab',
                    position: 'relative'
                  }}
                  whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1 }}
                >
                  <img 
                    src={file.thumbnailUrl} 
                    alt={file.name} 
                    style={{ width: '80px', height: '110px', objectFit: 'contain', background: 'white', borderRadius: '4px' }} 
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Drag to reorder
                    </p>
                  </div>
                  <button 
                    onClick={() => removeFile(file.id)} 
                    style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={24} />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
          
          {fileList.length === 0 && <div style={{ textAlign: 'center', padding: '2rem' }}>No files selected.</div>}

          <button 
            onClick={handlePrepareMerge}
            disabled={isProcessing || fileList.length < 2}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '1rem', marginTop: '2rem',
              background: 'var(--accent-color)', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '1.1rem', cursor: (isProcessing || fileList.length < 2) ? 'not-allowed' : 'pointer',
              opacity: (isProcessing || fileList.length < 2) ? 0.7 : 1,
              transition: 'background 0.2s'
            }}
          >
            <Save size={20} />
            {isProcessing ? 'Processing...' : 'Merge and Continue'}
          </button>
        </>
      )}
    </motion.div>
  );
}
