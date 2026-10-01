import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, CheckCircle, Target, Lightbulb, Compass } from 'lucide-react';
import { ProblemSummary } from '../types/math';
import { MathView } from './MathView';

interface SummaryCardProps {
  formattedProblem: string;
  summary: ProblemSummary;
  topicLabel: string;
  grade: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  formattedProblem,
  summary,
  topicLabel,
  grade,
}) => {
  const [isProblemExpanded, setIsProblemExpanded] = useState(true);

  return (
    <div className="space-y-4">
      {/* Original Problem Card (Collapsible) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setIsProblemExpanded(!isProblemExpanded)}
          className="w-full px-4 sm:px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">Đề bài gốc</span>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
              Lớp {grade} - {topicLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
            <span>{isProblemExpanded ? 'Thu gọn' : 'Xem lại đề'}</span>
            {isProblemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isProblemExpanded && (
          <div className="p-4 sm:p-5 bg-white text-sm leading-relaxed text-slate-900 overflow-x-auto">
            <MathView content={formattedProblem} />
          </div>
        )}
      </div>

      {/* Structured Summary Grid */}
      <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-blue-100 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-blue-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600" />
            Tóm tắt đề & Định hướng tư duy
          </h3>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
            Bước 2: Hiểu đề
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          {/* Given (Giả thiết) */}
          <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-blue-100/80 shadow-2xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs text-blue-800">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              1. Giả thiết (Cho biết):
            </div>
            <ul className="space-y-1.5 pl-1">
              {summary.given.map((item, idx) => (
                <li key={idx} className="text-slate-700 flex items-start gap-1.5 leading-relaxed text-xs">
                  <span className="text-blue-500 font-bold">•</span>
                  <div className="flex-1 overflow-x-auto">
                    <MathView content={item} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* To Find (Kết luận) */}
          <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-indigo-100/80 shadow-2xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs text-indigo-800">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              2. Kết luận (Yêu cầu cần tìm / chứng minh):
            </div>
            <ul className="space-y-1.5 pl-1">
              {summary.toFind.map((item, idx) => (
                <li key={idx} className="text-slate-700 flex items-start gap-1.5 leading-relaxed text-xs">
                  <span className="text-indigo-500 font-bold">•</span>
                  <div className="flex-1 overflow-x-auto">
                    <MathView content={item} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key Formulas & Strategy Overview */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs text-emerald-800">
            <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
            3. Kiến thức & Công thức trọng tâm:
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.keyFormulas.map((formula, idx) => (
              <div
                key={idx}
                className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                <MathView content={formula} />
              </div>
            ))}
          </div>

          {summary.strategyOverview && (
            <div className="pt-2 mt-2 border-t border-slate-100 text-slate-600 leading-relaxed text-xs">
              <span className="font-bold text-slate-700">Chiến lược tổng quát: </span>
              {summary.strategyOverview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
