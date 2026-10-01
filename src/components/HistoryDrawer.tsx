import React, { useState } from 'react';
import { History, X, Trash2, ArrowRight, CheckCircle2, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { SessionHistoryItem } from '../types/math';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionHistoryItem[];
  onSelectSession: (session: SessionHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onClearHistory,
  onDeleteSession,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClear = () => {
    onClearHistory();
    setShowConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Lịch sử bài học của bạn</h3>
              <p className="text-[11px] text-slate-300">{sessions.length} phiên học đã lưu</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowConfirmClear(false);
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-slate-600">Chưa có lịch sử học tập</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Khi bạn nhập đề bài và bắt đầu học, các phiên tự học sẽ tự động được lưu tại đây.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition-all cursor-pointer shadow-2xs group relative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      Lớp {s.grade}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[130px]">
                      {s.topicLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.isCompleted ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn thành
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Bước {s.currentStepIndex + 1}/{s.totalSteps}
                      </span>
                    )}

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                        title="Xóa bài này khỏi lịch sử"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {s.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-mono bg-slate-50 p-1.5 rounded-md">
                  {s.problemSnippet}
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(s.updatedAt).toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Tiếp tục học <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Inline Confirmation */}
        {sessions.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {showConfirmClear ? (
              <div className="w-full flex items-center justify-between gap-2 animate-in fade-in">
                <span className="text-xs text-rose-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Xóa tất cả?
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(false)}
                    className="text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClear}
                    className="text-xs text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg font-bold shadow-xs cursor-pointer active:scale-95"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa toàn bộ lịch sử
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
