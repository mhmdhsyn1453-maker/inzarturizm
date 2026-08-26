import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Crop, Move, RefreshCw } from 'lucide-react';

const VIEW_SIZE = 260; // Circular crop viewport diameter in px
const OUTPUT_SIZE = 360; // Exported square/circle canvas resolution in px

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirmCrop,
  title = 'Fotoğrafı Kırp & Ayarla'
}) {
  const [zoom, setZoom] = useState(1); // 1.0 to 3.0
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, baseWidth: VIEW_SIZE, baseHeight: VIEW_SIZE });

  const imgRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);

  // Keep onCloseRef current
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Only reset states when modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
    wasOpenRef.current = !!isOpen;
  }, [isOpen]);

  // Load and calculate image base dimensions
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || 400;
      const nh = img.naturalHeight || 400;

      // Calculate base dimensions so image fills the circle viewport at zoom = 1.0
      const minDim = Math.min(nw, nh);
      const baseScale = VIEW_SIZE / minDim;
      const bw = nw * baseScale;
      const bh = nh * baseScale;

      setImgDimensions({
        width: nw,
        height: nh,
        baseWidth: bw,
        baseHeight: bh
      });
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Window-level mouse move / up listeners for completely fluid drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const currentW = (imgDimensions.baseWidth || VIEW_SIZE) * zoom;
      const currentH = (imgDimensions.baseHeight || VIEW_SIZE) * zoom;
      const maxPanX = Math.max(0, (currentW - VIEW_SIZE) / 2 + 50);
      const maxPanY = Math.max(0, (currentH - VIEW_SIZE) / 2 + 50);

      setPosition({
        x: Math.min(maxPanX, Math.max(-maxPanX, newX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, newY))
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, imgDimensions, zoom]);

  // Touch handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;

    const currentW = (imgDimensions.baseWidth || VIEW_SIZE) * zoom;
    const currentH = (imgDimensions.baseHeight || VIEW_SIZE) * zoom;
    const maxPanX = Math.max(0, (currentW - VIEW_SIZE) / 2 + 50);
    const maxPanY = Math.max(0, (currentH - VIEW_SIZE) / 2 + 50);

    setPosition({
      x: Math.min(maxPanX, Math.max(-maxPanX, newX)),
      y: Math.min(maxPanY, Math.max(-maxPanY, newY))
    });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // High-Resolution Canvas Export
  const handleConfirm = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ratio = OUTPUT_SIZE / VIEW_SIZE;

    ctx.save();
    // Center point
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    // Rotation
    ctx.rotate((rotation * Math.PI) / 180);
    // User Pan offset
    ctx.translate(position.x * ratio, position.y * ratio);

    const finalWidth = (imgDimensions.baseWidth || VIEW_SIZE) * zoom * ratio;
    const finalHeight = (imgDimensions.baseHeight || VIEW_SIZE) * zoom * ratio;

    ctx.drawImage(
      imgRef.current,
      -finalWidth / 2,
      -finalHeight / 2,
      finalWidth,
      finalHeight
    );

    ctx.restore();

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.90);
    onConfirmCrop(croppedBase64);
    if (onCloseRef.current) onCloseRef.current();
  };

  if (!isOpen || !imageSrc) return null;

  const currentDisplayWidth = (imgDimensions.baseWidth || VIEW_SIZE) * zoom;
  const currentDisplayHeight = (imgDimensions.baseHeight || VIEW_SIZE) * zoom;

  const modalContent = (
    <div 
      onClick={() => onCloseRef.current && onCloseRef.current()}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none"
      style={{ margin: 0 }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="pearl-card bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200/90 space-y-5 animate-scale-up"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800 shadow-3xs">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Fotoğrafı sürükleyerek ortalayın ve yakınlaştırın.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current && onCloseRef.current()}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewport Box with Circular Crop Mask */}
        <div className="flex flex-col items-center justify-center py-1">
          <div
            style={{ width: `${VIEW_SIZE}px`, height: `${VIEW_SIZE}px` }}
            className="relative rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-slate-900 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Kırpılacak Görsel"
              draggable={false}
              className="absolute top-1/2 left-1/2 max-w-none pointer-events-none origin-center will-change-transform"
              style={{
                width: `${currentDisplayWidth}px`,
                height: `${currentDisplayHeight}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg)`
              }}
            />

            {/* Circular Overlay Guides */}
            <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white/80 bg-black/50 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Move className="h-2.5 w-2.5 text-emerald-400" /> Sürükleyip Ortalayın
              </span>
            </div>
          </div>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-3xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5 text-emerald-700" /> Yakınlaştırma (Zoom)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                title="Sıfırla"
              >
                <RefreshCw className="h-2.5 w-2.5" /> Sıfırla
              </button>
              <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-3xs">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-3xs active:scale-95"
              title="Uzaklaştır"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-3xs active:scale-95"
              title="Yakınlaştır"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-3xs active:scale-95"
              title="90° Sağa Döndür"
            >
              <RotateCw className="h-4 w-4 text-amber-600" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onCloseRef.current && onCloseRef.current()}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white text-xs font-black tracking-wide shadow-lg shadow-emerald-900/25 cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Kırp ve Uygula</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
