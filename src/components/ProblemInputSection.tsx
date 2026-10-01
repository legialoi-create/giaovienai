import React, { useState, useRef } from 'react';
import { Sparkles, Upload, BookOpen, AlertCircle, ArrowRight, FileText, FileType, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { GradeSelector } from './GradeSelector';
import { MathSymbolKeyboard } from './MathSymbolKeyboard';
import { MathView } from './MathView';
import { SAMPLE_PROBLEMS } from '../data/sampleProblems';
import { SampleProblem } from '../types/math';

interface ProblemInputSectionProps {
  grade: number;
  onGradeChange: (grade: number) => void;
  problemText: string;
  onProblemTextChange: (text: string) => void;
  onStartAnalysis: () => void;
  isLoading: boolean;
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  onSelectSample: (problem: SampleProblem) => void;
  validationIssue?: string;
  clarificationSuggestions?: string[];
}

export const ProblemInputSection: React.FC<ProblemInputSectionProps> = ({
  grade,
  onGradeChange,
  problemText,
  onProblemTextChange,
  onStartAnalysis,
  isLoading,
  onOpenUpload,
  onOpenSamples,
  onSelectSample,
  validationIssue,
  clarificationSuggestions,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInsertSymbol = (symbol: string) => {
    if (!textareaRef.current) {
      onProblemTextChange(problemText + symbol);
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = problemText.substring(0, start) + symbol + problemText.substring(end);
    onProblemTextChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + symbol.length, start + symbol.length);
      }
    }, 10);
  };

  const sampleQuickList = SAMPLE_PROBLEMS.filter((p) => p.grade === grade || (grade >= 6 && grade <= 9 && p.grade === 9)).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Main Input Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        {/* Grade Selection */}
        <GradeSelector
          selectedGrade={grade}
          onChange={onGradeChange}
          disabled={isLoading}
        />

        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Nhập đề hoặc tải tệp đề bài:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showPreview ? 'Ẩn xem trước công thức' : 'Xem trước công thức LaTeX'}
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={5}
              disabled={isLoading}
              placeholder="Ví dụ: Rút gọn biểu thức P = (sqrt(x)/(sqrt(x)+3) + 2*sqrt(x)/(sqrt(x)-3) - (3x+9)/(x-9)) : ((sqrt(x)+1)/(sqrt(x)-3)) với x >= 0, x != 9..."
              value={problemText}
              onChange={(e) => onProblemTextChange(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-100 text-sm font-sans text-slate-800 placeholder-slate-400 focus:outline-none transition-all resize-y min-h-[130px]"
            />
          </div>

          {/* Quick Math Symbol Insertion Bar */}
          <MathSymbolKeyboard onInsert={handleInsertSymbol} />

          {/* Formula Preview Box */}
          {showPreview && problemText.trim() && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Công thức hiển thị:
              </div>
              <div className="text-sm text-slate-800">
                <MathView content={problemText} />
              </div>
            </div>
          )}
        </div>

        {/* Missing Data or Validation Issue Banner */}
        {validationIssue && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-start gap-2 text-amber-900 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Lưu ý về đề bài: {validationIssue}</span>
            </div>
            {clarificationSuggestions && clarificationSuggestions.length > 0 && (
              <ul className="list-disc pl-6 text-amber-800 space-y-1">
                {clarificationSuggestions.map((sug, idx) => (
                  <li key={idx}>{sug}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-amber-700">
              👉 Hãy chỉnh sửa lại đề bài ở trên rồi bấm "Bắt đầu học" lại nhé!
            </p>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* File Upload action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={onOpenUpload}
              className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
              title="Tải lên tệp PDF, Word (.docx) hoặc Ảnh"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Tải đề lên (PDF / Word / Ảnh)</span>
            </button>
          </div>

          {/* Start button */}
          <button
            type="button"
            disabled={isLoading || !problemText.trim()}
            onClick={onStartAnalysis}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Đang phân tích sư phạm...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Bắt đầu học từng bước
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Problems Pills */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Bài mẫu gợi ý (Lớp {grade}):
            </span>
            <button
              type="button"
              onClick={onOpenSamples}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Xem tất cả bài mẫu →
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {sampleQuickList.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectSample(sample)}
                className="text-left text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-2.5 rounded-xl transition-all group flex items-center gap-2 max-w-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="font-bold text-slate-700 group-hover:text-blue-700 truncate max-w-[200px] sm:max-w-xs">
                  {sample.title}
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                  Bài mẫu
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

