import { useState, useEffect, useRef, createRef } from 'react';
import { ArrowLeft, Save, Undo, Redo, MousePointer2, Settings, Highlighter, PenTool, Type as TypeIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EditorPage, EditorPageRef } from './EditorPage';
import { SavePreview } from './SavePreview';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface EditorViewProps {
  targetFile: string;
  onBack: () => void;
  onSave?: (path: string) => void;
}

export function EditorView({ targetFile, onBack, onSave }: EditorViewProps) {
  const [pages, setPages] = useState<pdfjsLib.PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Toolbar states
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'highlight' | 'text'>('select');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [textColor, setTextColor] = useState('#b90010');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Save states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');

  // Refs for each page to access annotations
  const pageRefs = useRef<React.RefObject<EditorPageRef>[]>([]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        if (!window.electronAPI) throw new Error("Electron API is required.");
        const buffer = await window.electronAPI.readFile(targetFile);

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const loadedPages = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          loadedPages.push(page);
        }
        
        pageRefs.current = loadedPages.map(() => createRef<EditorPageRef>());
        setPages(loadedPages);
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.message || '';
        if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
          setError("This file could not be found. It may have been moved or deleted.");
        } else {
          setError("Failed to load PDF: " + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (targetFile) {
      loadPdf();
    }
  }, [targetFile]);

  const handlePrepareSave = async () => {
    setIsProcessing(true);
    setError('');

    try {
      if (!window.electronAPI) throw new Error("Electron API is required.");
      const buffer = await window.electronAPI.readFile(targetFile);
      const pdfDoc = await PDFDocument.load(buffer);
      const pdfPages = pdfDoc.getPages();
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < pageRefs.current.length; i++) {
        const pageRef = pageRefs.current[i].current;
        if (!pageRef) continue;
        
        const annotations = pageRef.getAnnotations();
        const originalDims = pageRef.getOriginalDimensions();
        const targetPdfPage = pdfPages[i];
        const pageHeight = targetPdfPage.getHeight();
        const pageWidth = targetPdfPage.getWidth();
        
        // Scale ratio in case the rendered PDF dimensions differ slightly from pdf-lib
        const scaleX = pageWidth / originalDims.width;
        const scaleY = pageHeight / originalDims.height;

        for (const ann of annotations) {
          if (ann.type === 'i-text') {
            // Very basic text placement, proper font embedding requires font files, using StandardFonts for now.
            // Converting hex to RGB
            const hex = ann.fill.replace('#', '');
            const r = parseInt(hex.substring(0,2), 16) / 255;
            const g = parseInt(hex.substring(2,4), 16) / 255;
            const b = parseInt(hex.substring(4,6), 16) / 255;
            
            // Fabric uses top-left origin, pdf-lib uses bottom-left origin
            targetPdfPage.drawText(ann.text, {
              x: ann.left * scaleX,
              y: pageHeight - (ann.top * scaleY) - (ann.fontSize * scaleY),
              size: ann.fontSize * scaleY,
              color: rgb(r, g, b),
              font: helveticaFont,
            });
          } else if (ann.type === 'path') {
            const svgPath = ann.path.map((cmd: any[]) => cmd.join(' ')).join(' ');
            const hex = ann.stroke.includes('rgba') ? '000000' : ann.stroke.replace('#', ''); // Naive rgba parsing for highlight
            let r=0, g=0, b=0, opacity=1;
            
            if (ann.stroke.includes('rgba')) {
              const parts = ann.stroke.match(/[\d.]+/g);
              if (parts) {
                r = parseInt(parts[0])/255; g = parseInt(parts[1])/255; b = parseInt(parts[2])/255; opacity = parseFloat(parts[3]);
              }
            } else {
              r = parseInt(hex.substring(0,2), 16) / 255;
              g = parseInt(hex.substring(2,4), 16) / 255;
              b = parseInt(hex.substring(4,6), 16) / 255;
            }

            targetPdfPage.drawSvgPath(svgPath, {
              x: ann.left * scaleX,
              y: pageHeight - (ann.top * scaleY),
              borderColor: rgb(r, g, b),
              borderWidth: ann.strokeWidth * scaleY,
              borderOpacity: opacity,
            });
          }
        }
      }

      const mergedPdfBytes = await pdfDoc.save();
      setGeneratedPdfBytes(mergedPdfBytes);
      setShowPreview(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during saving.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!generatedPdfBytes || !window.electronAPI) return;
    setSaveError('');
    try {
      const savePath = await window.electronAPI.saveFile('edited.pdf');
      if (savePath) {
        await window.electronAPI.writeFile(savePath, generatedPdfBytes);
        setSavedFilePath(savePath);
        setSaveSuccess(`Successfully saved to ${savePath}`);
        if (onSave) onSave(savePath);
      } else {
        setSaveError('Save operation canceled.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'Error saving file.');
    }
  };

  if (showPreview) {
    return (
      <div className="p-8 h-full bg-background overflow-y-auto">
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
    <div className="flex flex-col h-full bg-surface text-on-surface">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center h-16 px-6 w-full bg-surface-container-lowest z-50 border-b border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface-container text-secondary transition-colors" title="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg truncate max-w-md">{targetFile.split('/').pop() || targetFile.split('\\').pop()}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrepareSave}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
          >
            {isProcessing ? <Settings className="animate-spin" size={16} /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </header>

      {/* Editor Toolbar */}
      <div className="flex items-center justify-start h-12 px-6 w-full bg-surface-container-low border-b border-outline-variant sticky top-0 z-40 flex-shrink-0 gap-2 overflow-x-auto">
        <button className="p-1.5 rounded hover:bg-surface-container-highest text-secondary transition-colors opacity-50" title="Undo (Coming soon)">
          <Undo size={18} />
        </button>
        <button className="p-1.5 rounded hover:bg-surface-container-highest text-secondary transition-colors opacity-50" title="Redo (Coming soon)">
          <Redo size={18} />
        </button>

        <div className="w-px h-6 bg-outline-variant mx-2"></div>

        {/* Zoom */}
        <select 
          className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-on-surface"
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
        >
          <option value={0.5}>50%</option>
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
        </select>

        <div className="w-px h-6 bg-outline-variant mx-2"></div>

        {/* Typography */}
        <select 
          className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer w-32 text-on-surface"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
        >
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier</option>
        </select>
        
        <input 
          type="color" 
          value={textColor} 
          onChange={(e) => setTextColor(e.target.value)}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer ml-2"
          title="Text/Draw Color"
        />

        <div className="w-px h-6 bg-outline-variant mx-2"></div>

        <button 
          onClick={() => setIsBold(!isBold)} 
          className={`p-1.5 rounded transition-colors font-bold ${isBold ? 'bg-surface-container-highest text-primary' : 'hover:bg-surface-container-highest text-on-surface'}`}
        >
          B
        </button>
        <button 
          onClick={() => setIsItalic(!isItalic)} 
          className={`p-1.5 rounded transition-colors italic ${isItalic ? 'bg-surface-container-highest text-primary' : 'hover:bg-surface-container-highest text-on-surface'}`}
        >
          I
        </button>
        <button 
          onClick={() => setIsUnderline(!isUnderline)} 
          className={`p-1.5 rounded transition-colors underline ${isUnderline ? 'bg-surface-container-highest text-primary' : 'hover:bg-surface-container-highest text-on-surface'}`}
        >
          U
        </button>

        <div className="w-px h-6 bg-outline-variant mx-2"></div>

        {/* Annotation Tools */}
        <button 
          onClick={() => setActiveTool('select')}
          className={`p-1.5 rounded transition-colors ${activeTool === 'select' ? 'bg-surface-container-highest text-primary border border-outline-variant' : 'hover:bg-surface-container-highest text-on-surface'}`} 
          title="Select"
        >
          <MousePointer2 size={18} />
        </button>
        <button 
          onClick={() => setActiveTool('text')}
          className={`p-1.5 rounded transition-colors ${activeTool === 'text' ? 'bg-surface-container-highest text-primary border border-outline-variant' : 'hover:bg-surface-container-highest text-on-surface'}`} 
          title="Add Text"
        >
          <TypeIcon size={18} />
        </button>
        <button 
          onClick={() => setActiveTool('highlight')}
          className={`p-1.5 rounded transition-colors ${activeTool === 'highlight' ? 'bg-surface-container-highest text-primary border border-outline-variant' : 'hover:bg-surface-container-highest text-on-surface'}`} 
          title="Highlight"
        >
          <Highlighter size={18} />
        </button>
        <button 
          onClick={() => setActiveTool('draw')}
          className={`p-1.5 rounded transition-colors ${activeTool === 'draw' ? 'bg-surface-container-highest text-primary border border-outline-variant' : 'hover:bg-surface-container-highest text-on-surface'}`} 
          title="Draw Signature"
        >
          <PenTool size={18} />
        </button>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 bg-background overflow-y-auto relative py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 h-full">
            <Settings size={40} className="animate-spin text-secondary mb-4" />
            <p className="text-secondary">Loading Document Editor...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center p-12 h-full">
            <p className="text-error">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {pages.map((page, idx) => (
              <EditorPage 
                key={`page-${idx}`}
                ref={pageRefs.current[idx]}
                page={page}
                pageIndex={idx}
                scale={scale}
                activeTool={activeTool}
                textColor={textColor}
                fontFamily={fontFamily}
                isBold={isBold}
                isItalic={isItalic}
                isUnderline={isUnderline}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
