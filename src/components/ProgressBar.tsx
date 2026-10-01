import React from 'react';
import { BookOpen, Lightbulb, Puzzle, Award, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  currentStage: 'read' | 'understand' | 'steps' | 'solution';
  currentStepIndex: number;
  totalSteps: number;
  isUnlocked: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStage,
  currentStepIndex,
  totalSteps,
  isUnlocked,
}) => {
  const stages = [
    {
      id: 'read',
      label: 'Đọc đề',
      icon: BookOpen,
      isCompleted: currentStage !== 'read',
      isActive: currentStage === 'read',
    },
    {
      id: 'understand',
      label: 'Hiểu đề',
      icon: Lightbulb,
      isCompleted: currentStage === 'steps' || currentStage === 'solution',
      isActive: currentStage === 'understand',
    },
    {
      id: 'steps',
      label: `Từng bước (${Math.min(currentStepIndex + 1, totalSteps)}/${totalSteps})`,
      icon: Puzzle,
      isCompleted: currentStage === 'solution' || isUnlocked,
      isActive: currentStage === 'steps',
    },
    {
      id: 'solution',
      label: 'Lời giải',
      icon: Award,
      isCompleted: isUnlocked,
      isActive: currentStage === 'solution',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6">
      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-0" />

        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = stage.isCompleted;
          const isCurrent = stage.isActive;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-4 ring-emerald-50'
                    : isCurrent
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-100 scale-105'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span
                className={`text-[11px] sm:text-xs font-bold mt-1.5 whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
