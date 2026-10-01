import React, { useState } from 'react';
import { Sparkles, AlertOctagon, BookmarkCheck, ArrowRight, Eye, EyeOff, BookOpen } from 'lucide-react';
import { ReinforcementData } from '../types/math';
import { MathView } from './MathView';

interface ReinforcementCardProps {
  reinforcement: ReinforcementData;
  onPracticeSimilar: (problemText: string) => void;
}

export const ReinforcementCard: React.FC<ReinforcementCardProps> = ({
  reinforcement,
  onPracticeSimilar,
}) => {
  const [showSimilarHint, setShowSimilarHint] = useState(false);
  const [showSimilarAnswer, setShowSimilarAnswer] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
          <BookmarkCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
            Củng cố kiến thức & Rèn luyện sâu
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Khắc sâu phương pháp và phòng tránh các bẫy thường gặp
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Takeaway */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Ghi nhớ vàng (Bí quyết giải):
          </div>
          <div className="text-xs sm:text-sm text-amber-950 leading-relaxed pl-1">
            <MathView content={reinforcement.keyTakeaway} />
          </div>
        </div>

        {/* Common Pitfalls */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-200/80 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Các bẫy & sai lầm cần tránh:
          </div>
          <ul className="space-y-1.5 pl-1">
            {reinforcement.commonPitfalls.map((pitfall, idx) => (
              <li key={idx} className="text-xs sm:text-sm text-rose-950 flex items-start gap-2 leading-relaxed">
                <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                <span>{pitfall}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Practice Similar Problem */}
      {reinforcement.similarProblem && (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                {reinforcement.similarProblem.title || 'Bài toán tương tự để tự luyện'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => onPracticeSimilar(reinforcement.similarProblem.problem)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            >
              <span>Nạp bài này vào học</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto">
            <MathView content={reinforcement.similarProblem.problem} />
          </div>

          {/* Reveal Hint & Answer buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setShowSimilarHint(!showSimilarHint)}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {showSimilarHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showSimilarHint ? 'Ẩn gợi ý' : 'Xem gợi ý bài tương tự'}
            </button>

            <button
              type="button"
              onClick={() => setShowSimilarAnswer(!showSimilarAnswer)}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {showSimilarAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showSimilarAnswer ? 'Ẩn đáp số' : 'Xem đáp số kiểm tra'}
            </button>
          </div>

          {showSimilarHint && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Gợi ý: </span>
              <MathView content={reinforcement.similarProblem.hint} />
            </div>
          )}

          {showSimilarAnswer && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed font-bold">
              <span>Đáp số: </span>
              <MathView content={reinforcement.similarProblem.answer} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
