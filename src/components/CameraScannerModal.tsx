import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  FlipHorizontal,
  RotateCcw,
  Grid,
  Image as ImageIcon,
  Sparkles,
  Zap,
  ZapOff,
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
  const [showGrid, setShowGrid] = useState(true);
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
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
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
      // Fallback try user facing camera
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

  // Shutter action: simulate mobile camera snap with flash and sound
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual flash & audio click
    setIsFlashing(true);
    playShutterSound();

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setTimeout(() => {
      stopStream();

      // Convert dataURL to File
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
    }, 150);
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
    setTimeout(() => setTapPosition(null), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none overflow-hidden touch-none font-sans">
      {/* White Flash Effect when snapping */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white opacity-95 animate-out fade-out duration-200 pointer-events-none" />
      )}

      {/* Top Phone Camera Header */}
      <div className="w-full px-5 py-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-300">
            Quét Đề Bài AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${
              showGrid ? 'bg-amber-400/20 text-amber-300' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title="Bật/tắt lưới căn chỉnh"
          >
            <Grid className="w-5 h-5" />
          </button>

          {/* Flip Camera */}
          {hasMultipleCameras && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
              title="Đổi camera trước / sau"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          )}

          {/* Close Camera */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-all active:scale-90"
            title="Đóng máy ảnh"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Camera Live Viewfinder */}
      <div
        onClick={handleTouchFocus}
        className="relative flex-1 w-full max-w-2xl flex items-center justify-center overflow-hidden cursor-crosshair"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover bg-black"
        />

        {/* 3x3 Grid Lines */}
        {showGrid && !isLoading && !hasError && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-30">
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

        {/* Framing & Laser Scanner Effect */}
        {!hasError && !isLoading && (
          <div className="absolute inset-6 sm:inset-12 pointer-events-none z-10 flex flex-col items-center justify-between border-2 border-emerald-400/50 rounded-3xl overflow-hidden bg-emerald-500/5">
            {/* 4 Corner Markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-sm" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-sm" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-sm" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-sm" />

            {/* Animated Laser Scanning Line */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-bounce" />

            {/* Prompt tip in center */}
            <div className="bg-black/60 backdrop-blur-md text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Đặt đề bài vào giữa khung rồi bấm nút chụp
            </div>
          </div>
        )}

        {/* Tap to Focus Circle */}
        {tapPosition && (
          <div
            className="absolute w-16 h-16 border-2 border-amber-400 rounded-full animate-ping pointer-events-none z-20"
            style={{
              left: `${tapPosition.x - 32}px`,
              top: `${tapPosition.y - 32}px`,
            }}
          />
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black z-20">
            <RotateCcw className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Đang khởi động máy ảnh...</p>
          </div>
        )}

        {/* Fallback Screen if camera is blocked */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white bg-slate-950 p-6 text-center z-20">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold max-w-xs">
              Mở ứng dụng Camera trên thiết bị để chụp ảnh đề bài
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>Bật Máy Ảnh Chụp Ngay</span>
            </button>
          </div>
        )}
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

      {/* Bottom Camera Controls Bar (Phone Camera Shutter Bar) */}
      <div className="w-full pb-8 pt-5 px-8 flex items-center justify-between z-20 bg-gradient-to-t from-black via-black/80 to-transparent max-w-md">
        {/* Left: Gallery Album Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer"
          title="Chọn ảnh từ thư viện"
        >
          <ImageIcon className="w-5 h-5 text-slate-200" />
        </button>

        {/* Center: Real Phone Shutter Button */}
        {!hasError && !isLoading ? (
          <button
            type="button"
            onClick={handleSnap}
            className="w-20 h-20 rounded-full p-1.5 border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] group cursor-pointer"
            title="Chớp ảnh đề bài"
          >
            <div className="w-full h-full rounded-full bg-white group-hover:bg-emerald-400 group-active:scale-90 transition-all shadow-inner" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full p-1.5 border-4 border-emerald-400 flex items-center justify-center bg-emerald-500/20 active:scale-90 transition-all cursor-pointer"
          >
            <Camera className="w-8 h-8 text-emerald-400" />
          </button>
        )}

        {/* Right: Camera Flip or Mode Indicator */}
        <div className="w-12 h-12 flex items-center justify-center text-white/50 text-[10px] font-bold">
          {facingMode === 'environment' ? 'SAU' : 'TRƯỚC'}
        </div>
      </div>
    </div>
  );
};
