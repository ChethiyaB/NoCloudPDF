import { motion, AnimatePresence } from 'framer-motion';
import { Save, FileText, CheckCircle, Eye, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SavePreviewProps {
  pdfBytes: Uint8Array | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}

export function SavePreview({ pdfBytes, onCancel, onConfirm, successMessage, errorMessage }: SavePreviewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Parse size
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
      <FileText size={48} color="var(--accent-color)" style={{ margin: '0 auto', display: 'block' }} />
      <h2 style={{ marginTop: '1rem' }}>Ready to Save</h2>
      
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

      <AnimatePresence>
        {previewUrl && (
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
      {successMessage && <div style={{ color: '#34d399', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> {successMessage}</div>}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.75rem', background: 'transparent',
            border: '1px solid var(--text-secondary)', color: 'var(--text-primary)',
            borderRadius: '8px', cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button 
          onClick={handleConfirm}
          disabled={isSaving || !pdfBytes || !!successMessage}
          style={{
            flex: 2, padding: '0.75rem', background: 'var(--accent-color)',
            border: 'none', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
            borderRadius: '8px', cursor: (isSaving || !pdfBytes || !!successMessage) ? 'not-allowed' : 'pointer',
            opacity: (isSaving || !pdfBytes || !!successMessage) ? 0.7 : 1
          }}
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </motion.div>
  );
}
