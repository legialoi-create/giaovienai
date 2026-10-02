import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  FileType,
  Image as ImageIcon,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileCode,
  Clipboard,
  Camera,
} from 'lucide-react';
import { MathView } from './MathView';
import { CameraScannerModal } from './CameraScannerModal';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognized: (text: string, estimatedGrade?: number) => void;
  currentGrade: number;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onRecognized,
  currentGrade,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataBase64: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    formattedText: string;
    estimatedGrade: number;
    topicLabel: string;
    isClear: boolean;
    note?: string;
  } | null>(null);
  const [editableText, setEditableText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Support Ctrl + V (Paste image / file directly from clipboard)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1 || item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const namedFile =
              file.name && file.name !== 'image.png'
                ? file
                : new File(
                    [file],
                    `anh-dan-${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}.png`,
                    { type: file.type || 'image/png' }
                  );
            handleFile(namedFile);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setCountdown(0);
    const validExtensions = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp', '.txt'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileNameLower.endsWith(ext)) || file.type.startsWith('image/');

    if (!isValid) {
      setError('Vui lòng chọn tệp PDF, Word (.docx), Ảnh (.png, .jpg) hoặc văn bản (.txt).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Dung lượng tệp tối đa là 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type || (fileNameLower.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : fileNameLower.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        dataBase64: base64,
      };
      setSelectedFile(fileInfo);
      processFile(fileInfo);
    };
    reader.onerror = () => {
      setError('Lỗi khi đọc tệp tin. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const processFile = async (fileInfo: { name: string; size: number; type: string; dataBase64: string }) => {
    setIsProcessing(true);
    setError(null);
    setParseResult(null);

    try {
      const res = await fetch('/api/math/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: fileInfo.dataBase64,
          mimeType: fileInfo.type,
          fileName: fileInfo.name,
          gradeHint: currentGrade,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isRateLimit && data.retryDelay) {
          setCountdown(data.retryDelay);
        }
        throw new Error(data.error || 'Trích xuất đề bài thất bại');
      }

      setParseResult(data);
      setEditableText(data.formattedText);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err.message || 'Không thể trích xuất đề toán từ tệp tin. Vui lòng kiểm tra lại tệp.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setEditableText('');
    setError(null);
    setCountdown(0);
  };

  const handleConfirmAndStart = () => {
    if (!editableText.trim()) return;
    onRecognized(editableText, parseResult?.estimatedGrade);
    onClose();
  };

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FileType className="w-8 h-8 text-blue-600" />;
    if (lower.endsWith('.txt')) return <FileCode className="w-8 h-8 text-slate-600" />;
    return <ImageIcon className="w-8 h-8 text-emerald-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Upload className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Tải đề bài (PDF, Word hoặc Ảnh)</h3>
              <p className="text-xs text-blue-100">Hỗ trợ nhận diện, dán ảnh (Ctrl + V) và trích xuất công thức toán</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!selectedFile ? (
            <div className="space-y-4">
              {/* Dropzone with Paste Support */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 rounded-3xl p-7 sm:p-9 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group relative"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt,image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <input
                  id="mobile-camera-capture-input"
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md group-hover:scale-110 text-blue-600 flex items-center justify-center transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-800">
                    Kéo thả tệp đề vào đây, bấm để chọn tệp hoặc nhấn Ctrl + V để dán ảnh
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ tệp <strong>PDF</strong>, <strong>Word (.docx)</strong>, <strong>Ảnh (.jpg, .png)</strong> hoặc <strong>Văn bản (.txt)</strong>
                  </p>
                </div>

                {/* Badges of supported filetypes & Paste indicator */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Clipboard className="w-3.5 h-3.5 text-indigo-600" /> Dán ảnh (Ctrl + V)
                  </span>
                  <span className="text-[11px] font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </span>
                  <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <FileType className="w-3.5 h-3.5" /> Word (.docx)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraOpen(true);
                    }}
                    className="text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
                    title="Bấm để mở Camera chụp ảnh bài toán trực tiếp"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-700" /> Ảnh chụp / Scan
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* File Processing & Result Review */
            <div className="space-y-4">
              {/* Selected File Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-white rounded-xl shadow-2xs shrink-0">
                    {getFileIcon(selectedFile.name)}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Đổi tệp khác
                </button>
              </div>

              {/* Status Indicator */}
              {isProcessing ? (
                <div className="p-6 text-center space-y-2 bg-blue-50/70 rounded-2xl border border-blue-100">
                  <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-blue-900">
                    AI đang trích xuất và chuẩn hóa công thức toán sang LaTeX...
                  </p>
                  <p className="text-[11px] text-blue-600">Đang nhận diện cấu trúc các câu hỏi và dữ kiện</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900 leading-snug">{error}</p>
                      <p className="text-[11px] text-amber-700">
                        Hệ thống đã chuẩn bị sẵn cơ chế thử lại tự động hoặc bạn có thể dán trực tiếp đề vào ô nhập tay.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={countdown > 0}
                      onClick={() => processFile(selectedFile)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{countdown > 0 ? `Thử lại sau (${countdown}s)` : 'Thử trích xuất lại ngay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                    >
                      Đóng & Tự gõ đề
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Trích xuất đề thành công!</span>
                    {parseResult?.topicLabel && (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] ml-auto font-bold">
                        {parseResult.topicLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Vui lòng kiểm tra lại nội dung bên dưới và chỉnh sửa nếu cần trước khi bắt đầu giải từng bước.
                  </p>
                </div>
              )}

              {/* Editable Text Area */}
              {!isProcessing && editableText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Nội dung đề toán trích xuất được:
                    </label>
                  </div>
                  <textarea
                    rows={5}
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Nội dung đề toán..."
                  />

                  {/* Math Preview */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Xem trước định dạng công thức:
                    </div>
                    <div className="text-xs max-h-36 overflow-y-auto">
                      <MathView content={editableText} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Đóng
          </button>
          {selectedFile && !isProcessing && editableText.trim() && (
            <button
              type="button"
              onClick={handleConfirmAndStart}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Sử dụng đề này để học
            </button>
          )}
        </div>
      </div>

      {/* Live Camera Scanner Viewfinder Modal */}
      {isCameraOpen && (
        <CameraScannerModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(capturedFile) => {
            setIsCameraOpen(false);
            handleFile(capturedFile);
          }}
        />
      )}
    </div>
  );
};
