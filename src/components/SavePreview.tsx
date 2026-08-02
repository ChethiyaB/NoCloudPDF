import { motion } from 'framer-motion';
import { Save, FileText, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface SavePreviewProps {
  pdfBytes: Uint8Array | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}

export function SavePreview({ pdfBytes, onCancel, onConfirm, successMessage, errorMessage }: SavePreviewProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Parse size
  const sizeInBytes = pdfBytes ? pdfBytes.byteLength : 0;
  const sizeInMb = (sizeInBytes / (1024 * 1024)).toFixed(2);

  const handleConfirm = async () => {
    setIsSaving(true);
    await onConfirm();
    setIsSaving(false);
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
        maxWidth: '500px',
        margin: '2rem auto',
        textAlign: 'center',
      }}
    >
      <FileText size={48} color="var(--accent-color)" style={{ margin: '0 auto', display: 'block' }} />
      <h2 style={{ marginTop: '1rem' }}>Ready to Save</h2>
      
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', textAlign: 'left' }}>
        <p style={{ margin: '0.5rem 0' }}><strong>Format:</strong> PDF Document (.pdf)</p>
        <p style={{ margin: '0.5rem 0' }}><strong>Estimated Size:</strong> {sizeInMb} MB</p>
      </div>

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
