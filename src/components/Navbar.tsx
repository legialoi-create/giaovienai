import React from 'react';
import { Sparkles, PenTool, BookOpen, History, HelpCircle, Monitor, Type } from 'lucide-react';

interface NavbarProps {
  onOpenScratchpad: () => void;
  onOpenSamples: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  aiStatus: { configured: boolean; model: string };
  onNewProblem: () => void;
  isStudying: boolean;
  fontScale: '14pt' | '16pt' | '18pt' | '20pt';
  onCycleFontScale: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScratchpad,
  onOpenSamples,
  onOpenHistory,
  historyCount,
  aiStatus,
  onNewProblem,
  isStudying,
  fontScale,
  onCycleFontScale,
}) => {
  const fontLabel =
    fontScale === '14pt'
      ? '14pt (Chuẩn)'
      : fontScale === '16pt'
      ? '16pt (Lớn)'
      : fontScale === '18pt'
      ? '18pt (Rất lớn)'
      : '20pt (Siêu lớn)';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div
          onClick={onNewProblem}
          className="flex items-center gap-3 cursor-pointer group"
          title="Về trang chủ GỢI MỞ TỪNG BƯỚC"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-lg tracking-tighter">∑</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-none">
                GỢI MỞ TỪNG BƯỚC
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md">
                Giáo viên AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Hiểu đề – Tự suy nghĩ – Giải từng bước
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Projector Font Size Toggle Button */}
          <button
            type="button"
            onClick={onCycleFontScale}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title={`Chỉnh cỡ chữ máy chiếu / màn hình lớp học (Hiện tại: ${fontLabel} - Bấm để chuyển cỡ)`}
          >
            <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Cỡ chiếu:</span>
            <span className="font-black text-blue-700 bg-white px-1.5 py-0.5 rounded-md border border-blue-200 shadow-2xs">
              {fontScale}
            </span>
          </button>

          {/* AI Status Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              aiStatus.configured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={
              aiStatus.configured
                ? `Đang kết nối mô hình: ${aiStatus.model}`
                : 'Chưa có khóa API server. Đang chạy ở chế độ trải nghiệm mẫu.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{aiStatus.configured ? 'AI Sư phạm' : 'Chế độ Demo'}</span>
          </div>

          {/* New problem button (if currently in session) */}
          {isStudying && (
            <button
              type="button"
              onClick={onNewProblem}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-xl transition-colors"
            >
              Nhập đề mới
            </button>
          )}

          {/* Scratchpad button */}
          <button
            type="button"
            onClick={onOpenScratchpad}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Mở bảng nháp & vẽ hình"
          >
            <PenTool className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Bảng nháp</span>
          </button>

          {/* Samples library button */}
          <button
            type="button"
            onClick={onOpenSamples}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Thư viện bài toán mẫu"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Bài mẫu</span>
          </button>

          {/* History button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="relative px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Xem lịch sử phiên học"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Lịch sử</span>
            {historyCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
