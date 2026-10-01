import React from 'react';

interface GradeSelectorProps {
  selectedGrade: number;
  onChange: (grade: number) => void;
  disabled?: boolean;
}

export const GradeSelector: React.FC<GradeSelectorProps> = ({ selectedGrade, onChange, disabled = false }) => {
  const grades = Array.from({ length: 12 }, (_, i) => i + 1);

  const getStageLabel = (grade: number) => {
    if (grade >= 6 && grade <= 9) {
      return 'THCS (Chuẩn GDPT 2018)';
    }
    if (grade <= 5) {
      return 'Tiểu học (GDPT 2018)';
    }
    return 'THPT (GDPT 2018)';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          Khối lớp học theo GDPT 2018:
        </label>
        <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          {getStageLabel(selectedGrade)}
        </span>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {grades.map((g) => {
          const isSelected = selectedGrade === g;
          const isFocusGrade = g >= 6 && g <= 9;

          return (
            <button
              key={g}
              type="button"
              disabled={disabled}
              onClick={() => onChange(g)}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center relative ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1'
                  : isFocusGrade
                  ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <span>Lớp {g}</span>
              {g === 9 && !isSelected && (
                <span className="absolute -top-1.5 -right-1 text-[8px] bg-emerald-600 text-white font-bold px-1 rounded-full scale-90">
                  Thi 10
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
