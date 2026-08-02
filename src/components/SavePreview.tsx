import { motion, AnimatePresence } from 'framer-motion';
import { Save, FileText, CheckCircle, Eye, X, FolderOpen, Copy } from 'lucide-react';
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

  const handleWhatsApp = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openExternal('https://web.whatsapp.com/');
    }
  };

  const handleGmail = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openExternal('https://mail.google.com/');
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
      className={`bg-surface-container-lowest border border-surface-variant rounded-2xl p-8 mx-auto text-center transition-all duration-300 shadow-xl ${previewUrl ? 'max-w-4xl' : 'max-w-xl'}`}
    >
      <FileText size={48} className={`mx-auto mb-4 ${successMessage ? 'text-green-500' : 'text-primary'}`} />
      <h2 className="text-2xl font-bold text-on-surface">{successMessage ? 'Saved Successfully!' : 'Ready to Save'}</h2>
      
      {!successMessage && (
        <div className="bg-surface-container-low p-4 rounded-lg my-6 text-left flex justify-between items-center border border-surface-variant">
          <div>
            <p className="my-1 text-on-surface"><strong>Format:</strong> PDF Document (.pdf)</p>
            <p className="my-1 text-on-surface"><strong>Estimated Size:</strong> {sizeInMb} MB</p>
          </div>
          <button 
            onClick={handlePreview}
            className="px-4 py-2 bg-surface border border-primary text-primary rounded-lg hover:bg-primary-light transition-colors flex items-center gap-2 font-medium shadow-sm"
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
            className="mb-6 rounded-lg overflow-hidden border border-surface-variant shadow-inner"
          >
            <iframe 
              src={previewUrl} 
              className="w-full h-full border-none bg-neutral-100" 
              title="PDF Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {errorMessage && <div className="text-error mb-4 font-medium">{errorMessage}</div>}
      
      {successMessage && (
        <div className="my-6">
          <p className="text-green-600 flex items-center justify-center gap-2 mb-6 font-medium bg-green-50 py-3 rounded-lg border border-green-100">
            <CheckCircle size={20} /> {successMessage}
          </p>

          <p className="text-secondary mb-4 text-sm font-semibold uppercase tracking-wider text-left">Share Options</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button 
              onClick={handleShowInFolder} 
              className="sm:col-span-2 flex items-center justify-center gap-2 p-3 bg-primary text-white border border-transparent rounded-lg hover:bg-primary-hover shadow-sm transition-colors font-medium"
            >
              <FolderOpen size={18} /> Show in Folder
            </button>
            <button 
              onClick={handleWhatsApp} 
              className="flex items-center justify-center gap-2 p-3 bg-surface border border-surface-variant rounded-lg text-on-surface hover:bg-surface-container transition-colors font-medium shadow-sm"
            >
               Share in WhatsApp
            </button>
            <button 
              onClick={handleGmail} 
              className="flex items-center justify-center gap-2 p-3 bg-surface border border-surface-variant rounded-lg text-on-surface hover:bg-surface-container transition-colors font-medium shadow-sm"
            >
               Share via Gmail
            </button>
            <button 
              onClick={handleCopyPath} 
              className="sm:col-span-2 flex items-center justify-center gap-2 p-3 bg-transparent border border-secondary text-secondary rounded-lg hover:bg-surface-container transition-colors font-medium"
            >
              <Copy size={18} /> {copied ? 'Copied to clipboard!' : 'Copy File Path'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 p-3 bg-surface border border-secondary text-secondary rounded-lg hover:bg-surface-container transition-colors font-medium"
        >
          {successMessage ? 'Back to Menu' : 'Back'}
        </button>
        
        {!successMessage && (
          <button 
            onClick={handleConfirm}
            disabled={isSaving || !pdfBytes}
            className="flex-[2] p-3 bg-primary text-white border-none flex justify-center items-center gap-2 rounded-lg cursor-pointer hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-medium"
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
