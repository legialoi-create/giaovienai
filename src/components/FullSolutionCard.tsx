import React, { useState } from 'react';
import { Lock, Unlock, Award, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { FullSolution } from '../types/math';
import { MathView } from './MathView';

interface FullSolutionCardProps {
  fullSolution: FullSolution;
  isUnlocked: boolean;
  onForceUnlock: () => void;
  completedStepsCount: number;
  totalStepsCount: number;
}

export const FullSolutionCard: React.FC<FullSolutionCardProps> = ({
  fullSolution,
  isUnlocked,
  onForceUnlock,
  completedStepsCount,
  totalStepsCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!isUnlocked) {
    return (
      <div id="full-solution-section" className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-6 sm:p-8 text-center space-y-4 scroll-mt-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <div className="max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
            Lời giải chi tiết (Đang khóa 🔒)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Để rèn luyện tư duy độc lập, lời giải hoàn chỉnh sẽ tự động mở sau khi bạn hoàn thành{' '}
            <span className="font-bold text-blue-600">
              {completedStepsCount}/{totalStepsCount} bước
            </span>{' '}
            suy luận phía trên.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="text-xs text-slate-400 hover:text-slate-600 underline font-medium transition-colors"
          >
            Em cần xem lời giải tham khảo trước?
          </button>
        </div>

        {/* Confirmation modal before forced unlock */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Bạn có chắc muốn xem ngay?</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tự mình tìm ra lời giải qua các câu hỏi gợi mở sẽ giúp bạn nhớ sâu hơn 5 lần so với đọc đáp án sẵn!
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                >
                  Tiếp tục tự giải
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    onForceUnlock();
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
                >
                  Mở khóa luôn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="full-solution-section" className="bg-white rounded-3xl border-2 border-emerald-500/30 shadow-lg overflow-hidden space-y-0 scroll-mt-6">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Award className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg">Lời giải chi tiết chuẩn mực</h3>
              <span className="text-[11px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Đã mở khóa
              </span>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Đáp số và các bước trình bày chuẩn theo Bareme chấm thi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-7 space-y-6">
          {/* Final Result Highlight Box */}
          <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kết quả cuối cùng:
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-950 pl-5">
              <MathView content={fullSolution.finalResult} />
            </div>
          </div>

          {/* Detailed step-by-step presentation */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trình bày bài giải hoàn chỉnh:
            </h4>
            {fullSolution.detailedSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
              >
                <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{step.stepTitle}</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-7 overflow-x-auto">
                  <MathView content={step.stepDetail} />
                </div>
              </div>
            ))}
          </div>

          {/* Verification / Sanity check method */}
          {fullSolution.verification && (
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-1.5 text-xs">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Cách kiểm tra lại kết quả (Thử nghiệm & Đánh giá):
              </div>
              <div className="text-blue-800 leading-relaxed pl-5">
                <MathView content={fullSolution.verification} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
