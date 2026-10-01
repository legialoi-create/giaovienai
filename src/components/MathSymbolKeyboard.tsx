import React from 'react';

interface MathSymbolKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

export const MathSymbolKeyboard: React.FC<MathSymbolKeyboardProps> = ({ onInsert, className = '' }) => {
  const symbols = [
    { label: '√x', value: '\\sqrt{x}', tip: 'Căn bậc hai' },
    { label: 'a/b', value: '\\frac{a}{b}', tip: 'Phân số' },
    { label: 'x²', value: 'x^2', tip: 'Lũy thừa 2' },
    { label: 'xⁿ', value: 'x^{n}', tip: 'Lũy thừa n' },
    { label: '≤', value: '\\le ', tip: 'Nhỏ hơn hoặc bằng' },
    { label: '≥', value: '\\ge ', tip: 'Lớn hơn hoặc bằng' },
    { label: '≠', value: '\\neq ', tip: 'Khác' },
    { label: '±', value: '\\pm ', tip: 'Cộng trừ' },
    { label: 'Δ', value: '\\Delta ', tip: 'Delta (biệt thức)' },
    { label: 'π', value: '\\pi ', tip: 'Số Pi' },
    { label: 'α', value: '\\alpha ', tip: 'Góc Alpha' },
    { label: '°', value: '^{\\circ}', tip: 'Độ' },
    { label: '∈', value: '\\in ', tip: 'Thuộc' },
    { label: '⊥', value: '\\perp ', tip: 'Vuông góc' },
    { label: '∥', value: '\\parallel ', tip: 'Song song' },
    { label: '∠', value: '\\angle ', tip: 'Góc' },
    { label: '△', value: '\\triangle ', tip: 'Tam giác' },
  ];

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-thin ${className}`}>
      <span className="text-xs font-semibold text-slate-400 whitespace-nowrap pl-1 pr-1">Ký hiệu nhanh:</span>
      {symbols.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onInsert(item.value)}
          title={item.tip}
          className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-md border border-slate-200 transition-colors shrink-0 shadow-2xs active:scale-95"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
