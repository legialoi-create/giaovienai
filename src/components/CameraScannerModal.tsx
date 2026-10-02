import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  FlipHorizontal,
  RotateCcw,
  Grid,
  Image as ImageIcon,
} from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isLoading, setIsLoading] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'environment' | 'user') => {
    setIsLoading(true);
    setHasError(false);
    stopStream();

    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('No getUserMedia');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play();
        }
      } catch (e2) {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  // Shutter action
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    setIsFlashing(true);
    playShutterSound();

    const canvas = canvasRef.current || document.createElement('canvas');
    const origWidth = video.videoWidth || 1280;
    const origHeight = video.videoHeight || 720;
    const targetWidth = Math.min(origWidth, 1600);
    const targetHeight = Math.round((targetWidth * origHeight) / origWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setTimeout(() => {
      stopStream();

      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const filename = `anh-chup-de-toan-${Date.now()}.jpg`;
      const file = new File([u8arr], filename, { type: mime });

      onCapture(file);
      onClose();
    }, 120);
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopStream();
      onCapture(file);
      onClose();
    }
  };

  const handleTouchFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTapPosition({ x, y });
    setTimeout(() => setTapPosition(null), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex select-none overflow-hidden touch-none font-sans">
      {/* White Flash Effect when snapping */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white opacity-95 animate-out fade-out duration-150 pointer-events-none" />
      )}

      {/* Main Camera Video Viewport (Takes entire screen, completely open & unobstructed) */}
      <div
        onClick={handleTouchFocus}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair bg-black"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-black"
        />

        {/* 3x3 Grid Lines (Off by default, thin and subtle) */}
        {showGrid && !isLoading && !hasError && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>
        )}

        {/* 4 Subtle Corner Framing Markers (Clean perimeter, NO central text or laser line obscuring the view) */}
        {!hasError && !isLoading && (
          <div className="absolute inset-3 sm:inset-6 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg" />
          </div>
        )}

        {/* Tap to Focus indicator */}
        {tapPosition && (
          <div
            className="absolute w-12 h-12 border-2 border-amber-400 rounded-full animate-ping pointer-events-none z-20"
            style={{
              left: `${tapPosition.x - 24}px`,
              top: `${tapPosition.y - 24}px`,
            }}
          />
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black z-20">
            <RotateCcw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-300">Đang bật máy ảnh...</p>
          </div>
        )}

        {/* Error Fallback */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-slate-950 p-4 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold max-w-xs text-slate-200">
              Trình duyệt đang hạn chế WebRTC. Bấm nút dưới để chụp ảnh ngay:
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp Ảnh Bằng Máy Ảnh</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Top Controls (Minimal, Translucent, Does not block document) */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white z-20 pointer-events-none">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-300 tracking-wide">QUÉT ĐỀ BÀI</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              showGrid ? 'bg-amber-400/40 text-amber-300' : 'bg-black/40 hover:bg-black/60 text-white/80'
            }`}
            title="Lưới căn chỉnh"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Flip Camera */}
          {hasMultipleCameras && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all active:scale-90 cursor-pointer"
              title="Đổi camera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Close Camera */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white transition-all active:scale-90 cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Shutter Controls (Responsive: Bottom in Portrait, Right edge in Landscape) */}
      <div className="absolute z-20 pointer-events-none bottom-4 left-0 right-0 flex items-center justify-center landscape:bottom-0 landscape:top-0 landscape:left-auto landscape:right-3 landscape:flex-col landscape:justify-center">
        <div className="pointer-events-auto flex items-center gap-6 landscape:flex-col landscape:gap-4 bg-black/35 backdrop-blur-md px-5 py-2.5 landscape:px-2.5 landscape:py-4 rounded-full border border-white/10 shadow-2xl">
          {/* Gallery Pick */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Chọn ảnh từ máy"
          >
            <ImageIcon className="w-4 h-4 text-slate-200" />
          </button>

          {/* Main Shutter Button */}
          {!hasError && !isLoading ? (
            <button
              type="button"
              onClick={handleSnap}
              className="w-16 h-16 rounded-full p-1 border-3 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all shadow-lg group cursor-pointer"
              title="Chụp ảnh ngay"
            >
              <div className="w-full h-full rounded-full bg-white group-hover:bg-emerald-400 group-active:scale-90 transition-all" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full border-2 border-emerald-400 flex items-center justify-center bg-emerald-500/20 active:scale-90 transition-all cursor-pointer"
            >
              <Camera className="w-6 h-6 text-emerald-400" />
            </button>
          )}

          {/* Camera orientation indicator */}
          <div className="w-10 h-10 flex items-center justify-center text-white/70 text-[10px] font-bold">
            {facingMode === 'environment' ? 'SAU' : 'TRƯỚC'}
          </div>
        </div>
      </div>

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackFile}
        className="hidden"
      />
    </div>
  );
};
