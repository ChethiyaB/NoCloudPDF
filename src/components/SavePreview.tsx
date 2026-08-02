import { motion, AnimatePresence } from 'framer-motion';
import { Save, FileText, CheckCircle, Eye, X, FolderOpen, Mail, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SavePreviewProps {
  pdfBytes: Uint8Array | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  savedFilePath?: string;
}

export function SavePreview({ pdfBytes, onCancel, onConfirm, successMessage, errorMessage, savedFilePath }: SavePreviewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sizeInBytes = pdfBytes ? pdfBytes.byteLength : 0;
  const sizeInMb = (sizeInBytes / (1024 * 1024)).toFixed(2);

  const handleConfirm = async () => {
    setIsSaving(true);
    await onConfirm();
    setIsSaving(false);
  };

  const handlePreview = () => {
    if (previewUrl) {
      setPreviewUrl(null);
    } else if (pdfBytes) {
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  };

  const handleShowInFolder = async () => {
    if (savedFilePath && window.electronAPI) {
      await window.electronAPI.showItemInFolder(savedFilePath);
    }
  };

  const handleEmail = async () => {
    const subject = encodeURIComponent("Check out this PDF");
    const body = encodeURIComponent("I've saved a PDF. Please find it attached.\n\n(Remember to manually attach the file before sending!)");
    if (window.electronAPI) {
      await window.electronAPI.openExternal(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const handleCopyPath = () => {
    if (savedFilePath) {
      navigator.clipboard.writeText(savedFilePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: previewUrl ? '900px' : '500px',
        width: '100%',
        margin: '2rem auto',
        textAlign: 'center',
        transition: 'max-width 0.3s ease'
      }}
    >
      <FileText size={48} color={successMessage ? "#34d399" : "var(--accent-color)"} style={{ margin: '0 auto', display: 'block' }} />
      <h2 style={{ marginTop: '1rem' }}>{successMessage ? 'Saved Successfully!' : 'Ready to Save'}</h2>
      
      {!successMessage && (
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0.5rem 0' }}><strong>Format:</strong> PDF Document (.pdf)</p>
            <p style={{ margin: '0.5rem 0' }}><strong>Estimated Size:</strong> {sizeInMb} MB</p>
          </div>
          <button 
            onClick={handlePreview}
            style={{
              padding: '0.5rem 1rem', background: 'transparent',
              border: '1px solid var(--accent-color)', color: 'var(--accent-color)',
              borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {previewUrl ? <><X size={16} /> Close Preview</> : <><Eye size={16} /> Preview PDF</>}
          </button>
        </div>
      )}

      <AnimatePresence>
        {previewUrl && !successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '500px' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden' }}
          >
            <iframe 
              src={previewUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 'none', background: 'white' }} 
              title="PDF Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {errorMessage && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{errorMessage}</div>}
      
      {successMessage && (
        <div style={{ margin: '1.5rem 0' }}>
          <p style={{ color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle size={20} /> {successMessage}
          </p>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Share Options</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={handleShowInFolder} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              <FolderOpen size={18} /> Show in Folder
            </button>
            <button onClick={handleEmail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              <Mail size={18} /> Email
            </button>
            <button onClick={handleCopyPath} style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'transparent', border: '1px solid var(--text-secondary)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <Copy size={18} /> {copied ? 'Copied to clipboard!' : 'Copy File Path'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.75rem', background: 'transparent',
            border: '1px solid var(--text-secondary)', color: 'var(--text-primary)',
            borderRadius: '8px', cursor: 'pointer'
          }}
        >
          {successMessage ? 'Back to Menu' : 'Back'}
        </button>
        
        {!successMessage && (
          <button 
            onClick={handleConfirm}
            disabled={isSaving || !pdfBytes}
            style={{
              flex: 2, padding: '0.75rem', background: 'var(--accent-color)',
              border: 'none', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
              borderRadius: '8px', cursor: (isSaving || !pdfBytes) ? 'not-allowed' : 'pointer',
              opacity: (isSaving || !pdfBytes) ? 0.7 : 1
            }}
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
