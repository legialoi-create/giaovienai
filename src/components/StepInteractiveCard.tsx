import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Edit3,
  RotateCcw,
  Check,
  Flame,
  PenTool,
  Volume2,
  VolumeX,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PedagogicalStep, QuestionType } from '../types/math';
import { MathView } from './MathView';
import { MathSymbolKeyboard } from './MathSymbolKeyboard';

interface StepInteractiveCardProps {
  step: PedagogicalStep;
  stepIndex: number;
  totalSteps: number;
  onCheckAnswer: (answer: string) => Promise<{ isCorrect: boolean; feedback: string; verdict: string }>;
  onNextStep: () => void;
  onEditProblem: () => void;
  onOpenScratchpad: () => void;
  grade: number;
  problemText: string;
}

export const StepInteractiveCard: React.FC<StepInteractiveCardProps> = ({
  step,
  stepIndex,
  totalSteps,
  onCheckAnswer,
  onNextStep,
  onEditProblem,
  onOpenScratchpad,
  grade,
  problemText,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    feedbackText: string;
    verdict: string;
  } | null>(null);

  // Hints state
  const [showHintTier1, setShowHintTier1] = useState(false);
  const [showHintTier2, setShowHintTier2] = useState(false);
  const [showDeepExplanation, setShowDeepExplanation] = useState(false);

  // Interactive Live Clarification Question State
  const [studentConfusionInput, setStudentConfusionInput] = useState('');
  const [customAiExplanation, setCustomAiExplanation] = useState<string | null>(null);
  const [isLoadingCustomExplanation, setIsLoadingCustomExplanation] = useState(false);

  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isAnsweredCorrectly = feedback?.isCorrect || step.status === 'completed';

  const handleInsertSymbol = (symbol: string) => {
    setCustomInput((prev) => prev + symbol);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ đọc âm thanh Web Speech.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip LaTeX markup for clean audio reading
    const cleanText = `${step.title}. ${step.question.replace(/\$+/g, '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 phần $2').replace(/\\sqrt\{([^}]+)\}/g, 'căn bậc hai của $1')}`;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleAskCustomQuestion = async () => {
    if (!studentConfusionInput.trim()) return;
    setIsLoadingCustomExplanation(true);
    try {
      const res = await fetch('/api/math/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText,
          grade,
          step,
          hintTier: 3,
          studentConfusion: studentConfusionInput,
        }),
      });
      const data = await res.json();
      setCustomAiExplanation(data.hint || 'Hãy kiểm tra lại bước suy luận nhé.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCustomExplanation(false);
    }
  };

  const handleCheck = async () => {
    const answerToSubmit = step.questionType === 'multiple_choice' ? selectedOptionId : customInput;
    if (!answerToSubmit.trim()) return;

    setIsChecking(true);
    try {
      const result = await onCheckAnswer(answerToSubmit);
      setFeedback({
        isCorrect: result.isCorrect,
        feedbackText: result.feedback,
        verdict: result.verdict,
      });

      if (result.isCorrect) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-blue-500/20 shadow-md space-y-6 relative overflow-hidden">
      {/* Top Banner with Step Counter & Goal */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
            {step.stepNumber}
          </span>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {step.title}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Mục tiêu: {step.goal}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio read button */}
          <button
            type="button"
            onClick={handleSpeak}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSpeaking
                ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isSpeaking ? 'Dừng đọc âm thanh' : 'Nghe giọng đọc câu hỏi'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
          </button>

          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Bước {stepIndex + 1} / {totalSteps}
          </span>
          <button
            type="button"
            onClick={onOpenScratchpad}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Mở bảng nháp tính toán"
          >
            <PenTool className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Main Socratic Question (KaTeX) */}
      <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-sm sm:text-base leading-relaxed text-slate-900">
        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Câu hỏi tư duy:
        </div>
        <MathView content={step.question} />
      </div>

      {/* Interactive Answer Area */}
      <div className="space-y-4">
        {(step.questionType === 'multiple_choice' || step.questionType === 'concept_choice' || (step.options && step.options.length > 0)) ? (
          /* Multiple Choice / Concept Choice 4 Options (A, B, C, D) */
          <div className="space-y-2.5">
            {step.options?.map((option, optIdx) => {
              const isSelected = selectedOptionId === option.id;
              const letter = ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);

              return (
                <div
                  key={option.id || optIdx}
                  onClick={() => !isAnsweredCorrectly && setSelectedOptionId(option.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/25 shadow-xs'
                      : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50'
                  } ${isAnsweredCorrectly ? 'cursor-default' : ''}`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-2xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {letter}
                  </div>
                  <div className="flex-1 text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
                    <MathView content={option.text} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Math Input / Fill-in Form */
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Nhập kết quả hoặc biểu thức suy luận của bạn (Điền khuyết):
            </label>
            <input
              type="text"
              disabled={isAnsweredCorrectly}
              placeholder={step.inputPlaceholder || 'Ví dụ: x > 3 hoặc (sqrt(x)-2)/(x+1)...'}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="w-full p-3.5 sm:p-4 rounded-2xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm sm:text-base font-mono text-slate-900 focus:outline-none bg-white shadow-2xs"
            />
            {!isAnsweredCorrectly && <MathSymbolKeyboard onInsert={handleInsertSymbol} />}
          </div>
        )}
      </div>

      {/* Adaptive Pedagogical Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed animate-in fade-in duration-200 ${
            feedback.isCorrect
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2.5 font-bold mb-1">
            {feedback.isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span>{feedback.isCorrect ? 'Chính xác! Làm rất tốt 👏' : 'Chưa chính xác lắm, hãy suy nghĩ thêm một chút:'}</span>
            </div>
          </div>
          <div className="pl-7">
            <MathView content={feedback.feedbackText} />
          </div>
        </div>
      )}

      {/* Action Buttons: Check, Hints, Em chưa hiểu, Sửa đề */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Helper Hint Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!showHintTier1 && (
            <button
              type="button"
              onClick={() => setShowHintTier1(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              Gợi ý Tầng 1
            </button>
          )}

          {showHintTier1 && !showHintTier2 && (
            <button
              type="button"
              onClick={() => setShowHintTier2(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
              Gợi ý Tầng 2 (Manh mối)
            </button>
          )}

          {!showDeepExplanation && (
            <button
              type="button"
              onClick={() => setShowDeepExplanation(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Em chưa hiểu
            </button>
          )}

          <button
            type="button"
            onClick={onEditProblem}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Sửa đề
          </button>
        </div>

        {/* Check Answer / Next Step Button */}
        <div>
          {!isAnsweredCorrectly ? (
            <button
              type="button"
              disabled={isChecking || (step.questionType === 'multiple_choice' ? !selectedOptionId : !customInput.trim())}
              onClick={handleCheck}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isChecking ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Kiểm tra câu trả lời
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextStep}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
            >
              <span>{stepIndex + 1 < totalSteps ? 'Tiếp tục sang Bước tiếp theo' : 'Hoàn thành & Mở khóa lời giải'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hint Tiers Collapsible Sections */}
      <div className="space-y-2 pt-2">
        {showHintTier1 && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              Gợi ý Tầng 1 (Định hướng):
            </div>
            <div className="text-amber-800 leading-relaxed pl-5">
              <MathView content={step.hintTier1} />
            </div>
          </div>
        )}

        {showHintTier2 && (
          <div className="p-3.5 bg-amber-100/90 border border-amber-300 rounded-xl text-xs space-y-1">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
              Gợi ý Tầng 2 (Manh mối công thức & quan hệ):
            </div>
            <div className="text-amber-900 leading-relaxed pl-5">
              <MathView content={step.hintTier2} />
            </div>
          </div>
        )}

        {showDeepExplanation && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-3">
            <div className="font-bold text-indigo-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Góc "Em chưa hiểu" – Thầy cô AI giải thích chi tiết:
              </span>
            </div>
            <div className="text-indigo-900 leading-relaxed pl-5 space-y-1">
              <MathView content={step.deepExplanation} />
            </div>

            {/* Ask specific live question box */}
            <div className="pt-2 border-t border-indigo-100 space-y-2">
              <label className="font-bold text-indigo-900 block text-[11px]">
                💬 Bạn vẫn còn thắc mắc ở điểm cụ thể nào? Hỏi thầy cô AI:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: Em chưa hiểu vì sao phải đặt điều kiện x > 4.8..."
                  value={studentConfusionInput}
                  onChange={(e) => setStudentConfusionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskCustomQuestion()}
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-indigo-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  disabled={isLoadingCustomExplanation || !studentConfusionInput.trim()}
                  onClick={handleAskCustomQuestion}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  {isLoadingCustomExplanation ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Hỏi</span>
                </button>
              </div>

              {customAiExplanation && (
                <div className="p-3 bg-white rounded-xl border border-indigo-200 text-indigo-950 text-xs mt-2">
                  <div className="font-bold text-indigo-700 mb-1">Trả lời cho bạn:</div>
                  <MathView content={customAiExplanation} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

