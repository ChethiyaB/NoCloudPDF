import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { fabric } from 'fabric';

interface EditorPageProps {
  page: pdfjsLib.PDFPageProxy;
  pageIndex: number;
  scale: number;
  activeTool: 'select' | 'select-text' | 'draw' | 'highlight' | 'text' | 'eraser';
  textColor: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  rotation: number;
  onAnnotationAdded?: () => void;
}

export interface EditorPageRef {
  getAnnotations: () => any[];
  pageIndex: number;
  getOriginalDimensions: () => { width: number, height: number };
}

export const EditorPage = forwardRef<EditorPageRef, EditorPageProps>(({ 
  page, 
  pageIndex, 
  scale,
  activeTool,
  textColor,
  fontFamily,
  isBold,
  isItalic,
  isUnderline,
  rotation,
  onAnnotationAdded
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [textItems, setTextItems] = useState<any[]>([]);
  const [viewportState, setViewportState] = useState<any>(null);
  
  const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getAnnotations: () => {
      if (!fabricCanvas) return [];
      return fabricCanvas.getObjects().map(obj => obj.toObject(['id', 'customType']));
    },
    pageIndex,
    getOriginalDimensions: () => originalDims
  }));

  // Render PDF and Initialize Fabric
  useEffect(() => {
    let fCanvas: fabric.Canvas | null = null;
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfCanvasRef.current || !fabricCanvasRef.current) return;
      
      const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
      setViewportState(viewport);
      setOriginalDims({ 
        width: page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 }).width, 
        height: page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 }).height 
      });

      // Fetch Text Content
      const textContent = await page.getTextContent();
      if (!isCancelled) {
        setTextItems(textContent.items);
      }

      // PDF Canvas
      const pdfCanvas = pdfCanvasRef.current;
      const context = pdfCanvas.getContext('2d');
      if (!context) return;
      
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      if (isCancelled) return;

      // Fabric Canvas
      const fC = fabricCanvasRef.current;
      fC.width = viewport.width;
      fC.height = viewport.height;
      
      fCanvas = new fabric.Canvas(fC, {
        isDrawingMode: false,
        selection: true,
      });
      
      setFabricCanvas(fCanvas);
      
      fCanvas.on('path:created', () => {
        if (onAnnotationAdded) onAnnotationAdded();
      });
    };

    renderPage();
    
    return () => {
      isCancelled = true;
      if (fCanvas) {
        fCanvas.dispose();
      }
    };
  }, [page, scale, rotation]);

  // Tool handling
  useEffect(() => {
    if (!fabricCanvas) return;

    // Reset modes
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = activeTool === 'select';
    fabricCanvas.defaultCursor = 'default';
    
    // Disable selection for all objects unless in select mode
    fabricCanvas.getObjects().forEach(obj => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select';
    });

    // Remove old listeners
    fabricCanvas.off('mouse:down');

    if (activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'eraser') {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      
      if (activeTool === 'highlight') {
        fabricCanvas.freeDrawingBrush.color = 'rgba(255, 224, 0, 0.4)';
        fabricCanvas.freeDrawingBrush.width = 16 * scale;
      } else if (activeTool === 'eraser') {
        fabricCanvas.freeDrawingBrush.color = '#ffffff';
        fabricCanvas.freeDrawingBrush.width = 20 * scale; // wide brush for whiteout
      } else {
        fabricCanvas.freeDrawingBrush.color = textColor;
        fabricCanvas.freeDrawingBrush.width = 3 * scale;
      }
    } 
    else if (activeTool === 'text') {
      fabricCanvas.defaultCursor = 'text';
      fabricCanvas.on('mouse:down', (o) => {
        if (o.target) return; // Clicked on existing object
        const pointer = fabricCanvas.getPointer(o.e);
        const text = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: fontFamily,
          fill: textColor,
          fontSize: 20 * scale,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          underline: isUnderline,
          selectable: true
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        text.enterEditing();
        if (onAnnotationAdded) onAnnotationAdded();
      });
    }

    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, activeTool, textColor, fontFamily, isBold, isItalic, isUnderline, scale, onAnnotationAdded]);

  // Update active object styles when they change
  useEffect(() => {
    if (!fabricCanvas || activeTool !== 'select') return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
      (activeObj as fabric.IText).set({
        fontFamily,
        fill: textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        underline: isUnderline,
      });
      fabricCanvas.requestRenderAll();
    }
  }, [textColor, fontFamily, isBold, isItalic, isUnderline, activeTool]);

  return (
    <div ref={containerRef} className="relative shadow-md mx-auto mb-8 bg-white" style={{ width: originalDims.width * scale, height: originalDims.height * scale }}>
      <canvas ref={pdfCanvasRef} className="absolute top-0 left-0 z-0" style={{ width: '100%', height: '100%' }} />
      
      {/* Selectable Text Layer */}
      {viewportState && (
        <div 
          className="absolute top-0 left-0 w-full h-full z-10 overflow-hidden" 
          style={{ pointerEvents: activeTool === 'select-text' ? 'auto' : 'none' }}
        >
          {textItems.map((item, i) => {
            const [x, y] = viewportState.convertToViewportPoint(item.transform[4], item.transform[5]);
            // y is the baseline of the text. To get top-left, we subtract the font size.
            const fontSize = item.transform[3] * scale;
            const width = item.width * scale;
            
            return (
              <span 
                key={i} 
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y - fontSize}px`,
                  fontSize: `${fontSize}px`,
                  width: `${width}px`,
                  height: `${fontSize}px`,
                  color: 'transparent',
                  transformOrigin: 'left bottom',
                  whiteSpace: 'pre',
                  cursor: 'text'
                }}
              >
                {item.str}
              </span>
            );
          })}
        </div>
      )}
      
      <canvas ref={fabricCanvasRef} className="absolute top-0 left-0 z-20" style={{ pointerEvents: activeTool === 'select-text' ? 'none' : 'auto' }} />
    </div>
  );
});
