import React, { useState } from 'react';
import { BookOpen, X, Sparkles, Filter, ChevronRight, Check } from 'lucide-react';
import { SAMPLE_PROBLEMS } from '../data/sampleProblems';
import { SampleProblem } from '../types/math';
import { MathView } from './MathView';

interface SampleProblemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblem: (problem: SampleProblem) => void;
  currentGrade: number;
}

export const SampleProblemsModal: React.FC<SampleProblemsModalProps> = ({
  isOpen,
  onClose,
  onSelectProblem,
  currentGrade,
}) => {
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredProblems = SAMPLE_PROBLEMS.filter((p) => {
    const matchGrade = selectedGradeFilter === 'all' || p.grade === selectedGradeFilter;
    const matchSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topicLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.problemText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGrade && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <BookOpen className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Thư viện bài toán mẫu chuẩn SGK & Đề thi</h3>
              <p className="text-xs text-blue-100">Các dạng toán trọng tâm từ cơ bản đến nâng cao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-slate-500 shrink-0">Lọc lớp:</span>
            <button
              type="button"
              onClick={() => setSelectedGradeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedGradeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
            {[6, 7, 8, 9, 10].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGradeFilter(g)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedGradeFilter === g
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Tìm theo chủ đề, từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-48 bg-white"
          />
        </div>

        {/* List of Problems */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {filteredProblems.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Không tìm thấy bài mẫu phù hợp</p>
            </div>
          ) : (
            filteredProblems.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProblem(p);
                  onClose();
                }}
                className="group p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs hover:shadow-md relative"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-md">
                      Lớp {p.grade}
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {p.topicLabel}
                    </span>
                    <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      {p.badge}
                    </span>
                  </div>
                  <button className="text-blue-600 font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Chọn bài <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-800 mb-1.5">{p.title}</h4>
                <p className="text-xs text-slate-500 mb-2">{p.description}</p>

                <div className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100 font-sans text-slate-700 line-clamp-3">
                  <MathView content={p.problemText} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
