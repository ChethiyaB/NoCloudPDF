import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface MergeViewProps {
  files: string[];
  onBack: () => void;
}

export function MergeView({ files, onBack }: MergeViewProps) {
  const [fileList, setFileList] = useState<string[]>(files);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFiles = [...fileList];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index - 1];
    newFiles[index - 1] = temp;
    setFileList(newFiles);
  };

  const moveDown = (index: number) => {
    if (index === fileList.length - 1) return;
    const newFiles = [...fileList];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index + 1];
    newFiles[index + 1] = temp;
    setFileList(newFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = fileList.filter((_, i) => i !== index);
    setFileList(newFiles);
  };

  const handleMerge = async () => {
    if (fileList.length < 2) {
      setError('Please select at least two PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      if (!window.electronAPI) {
        throw new Error("Electron API is required for reading files.");
      }

      const mergedPdf = await PDFDocument.create();

      for (const filePath of fileList) {
        // Read file using IPC
        const fileBuffer = await window.electronAPI.readFile(filePath);
        
        // Load PDF document
        const pdfDoc = await PDFDocument.load(fileBuffer);
        
        // Copy all pages
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        
        // Add to merged PDF
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }

      // Serialize the merged document
      const mergedPdfBytes = await mergedPdf.save();
      
      // Save dialog
      const savePath = await window.electronAPI.saveFile('merged.pdf');
      if (savePath) {
        await window.electronAPI.writeFile(savePath, (mergedPdfBytes.buffer as ArrayBuffer).slice(mergedPdfBytes.byteOffset, mergedPdfBytes.byteOffset + mergedPdfBytes.byteLength));
        setSuccess(`Successfully merged and saved to ${savePath}`);
      } else {
        setError('Save operation canceled.');
      }
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during merging.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container"
      style={{ width: '100%', maxWidth: '800px', margin: '0 auto', marginTop: '2rem' }}
    >
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} /> Back to Menu
      </button>

      <h2>Merge PDFs</h2>
      <p>Rearrange the files below and click Merge to combine them.</p>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: '#34d399', marginBottom: '1rem' }}>{success}</div>}

      <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '16px', marginTop: '1rem' }}>
        {fileList.map((file, i) => (
          <div key={i} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem 1rem', 
            borderRadius: '8px', marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
              <FileText size={20} color="var(--accent-color)" />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {file.split('/').pop() || file.split('\\').pop()}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => moveUp(i)} disabled={i === 0} style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>↑</button>
              <button onClick={() => moveDown(i)} disabled={i === fileList.length - 1} style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: i === fileList.length - 1 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}>↓</button>
              <button onClick={() => removeFile(i)} style={{ padding: '0.25rem 0.5rem', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px' }}>X</button>
            </div>
          </div>
        ))}
        {fileList.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No files selected.</p>}
      </div>

      <button 
        onClick={handleMerge}
        disabled={isProcessing || fileList.length < 2}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: '100%', padding: '1rem', marginTop: '1.5rem',
          background: 'var(--accent-color)', color: 'white', border: 'none',
          borderRadius: '8px', fontSize: '1.1rem', cursor: (isProcessing || fileList.length < 2) ? 'not-allowed' : 'pointer',
          opacity: (isProcessing || fileList.length < 2) ? 0.7 : 1,
          transition: 'background 0.2s'
        }}
      >
        <Save size={20} />
        {isProcessing ? 'Merging...' : 'Merge and Save'}
      </button>
    </motion.div>
  );
}
