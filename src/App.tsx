/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ProgressBar } from './components/ProgressBar';
import { ProblemInputSection } from './components/ProblemInputSection';
import { SummaryCard } from './components/SummaryCard';
import { StepInteractiveCard } from './components/StepInteractiveCard';
import { FullSolutionCard } from './components/FullSolutionCard';
import { ReinforcementCard } from './components/ReinforcementCard';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { ScratchpadModal } from './components/ScratchpadModal';
import { SampleProblemsModal } from './components/SampleProblemsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { MathAnalysisResult, SessionHistoryItem, SampleProblem } from './types/math';
import { SAMPLE_PROBLEMS, DEMO_ANALYSES } from './data/sampleProblems';
import confetti from 'canvas-confetti';

const STORAGE_KEY_HISTORY = 'toan_tung_buoc_sessions_v1';
const STORAGE_KEY_FONT_SCALE = 'toan_tung_buoc_font_scale_v1';

export default function App() {
  // Core state
  const [grade, setGrade] = useState<number>(9);
  const [problemText, setProblemText] = useState<string>('');
  const [analysis, setAnalysis] = useState<MathAnalysisResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [fontScale, setFontScale] = useState<'14pt' | '16pt' | '18pt' | '20pt'>('14pt');

  // Server & AI configuration status
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string }>({
    configured: true,
    model: 'gemini-3.8-flash',
  });

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Apply font size directly to document root (rem scale) whenever fontScale changes
  useEffect(() => {
    const scaleMap: Record<string, string> = {
      '14pt': '18.66px',
      '16pt': '21.33px',
      '18pt': '24px',
      '20pt': '26.66px',
    };
    const targetSize = scaleMap[fontScale] || '18.66px';
    document.documentElement.style.fontSize = targetSize;
  }, [fontScale]);

  // Load history, font size & check server status on mount
  useEffect(() => {
    // Check backend status
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAiStatus({
            configured: data.aiConfigured,
            model: data.model || 'gemini-3.8-flash',
          });
        }
      })
      .catch((err) => {
        console.warn('Backend status check failed:', err);
      });

    // Load saved font scale
    try {
      const savedScale = localStorage.getItem(STORAGE_KEY_FONT_SCALE) as any;
      if (savedScale === '14pt' || savedScale === '16pt' || savedScale === '18pt' || savedScale === '20pt') {
        setFontScale(savedScale);
      } else if (savedScale === 'standard') {
        setFontScale('14pt');
      } else if (savedScale === 'large') {
        setFontScale('16pt');
      } else if (savedScale === 'extra') {
        setFontScale('18pt');
      }
    } catch (e) {
      console.error(e);
    }

    // Load saved sessions from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load session history:', e);
    }
  }, []);

  const handleCycleFontScale = () => {
    const order: Array<'14pt' | '16pt' | '18pt' | '20pt'> = ['14pt', '16pt', '18pt', '20pt'];
    const currentIdx = order.indexOf(fontScale);
    const nextScale = order[(currentIdx + 1) % order.length];
    setFontScale(nextScale);
    try {
      localStorage.setItem(STORAGE_KEY_FONT_SCALE, nextScale);
    } catch (e) {
      console.error(e);
    }
  };

  // Save history helper
  const saveSession = (updatedAnalysis: MathAnalysisResult, stepIdx: number, unlocked: boolean) => {
    const existingIdx = history.findIndex((h) => h.id === updatedAnalysis.id);
    const historyItem: SessionHistoryItem = {
      id: updatedAnalysis.id,
      title: updatedAnalysis.topicLabel || `Bài toán Lớp ${updatedAnalysis.grade}`,
      grade: updatedAnalysis.grade,
      topic: updatedAnalysis.topic,
      topicLabel: updatedAnalysis.topicLabel,
      problemSnippet: updatedAnalysis.rawInput.slice(0, 100),
      currentStepIndex: stepIdx,
      totalSteps: updatedAnalysis.steps.length,
      isCompleted: unlocked,
      createdAt: updatedAnalysis.createdAt,
      updatedAt: Date.now(),
      analysisData: updatedAnalysis,
    };

    let newHistory: SessionHistoryItem[];
    if (existingIdx >= 0) {
      newHistory = [...history];
      newHistory[existingIdx] = historyItem;
    } else {
      newHistory = [historyItem, ...history];
    }

    setHistory(newHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  };

  // Start analysis
  const handleStartAnalysis = async (customProblem?: string, sampleId?: string) => {
    const textToAnalyze = (customProblem || problemText).trim();
    if (!textToAnalyze) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/math/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: textToAnalyze,
          grade,
          sampleId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Phân tích bài toán thất bại');
      }

      setAnalysis(data);
      setCurrentStepIndex(0);
      setIsUnlocked(false);

      if (data.isWellPosed) {
        saveSession(data, 0, false);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(error.message || 'Không thể phân tích đề bài. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle selecting a sample problem
  const handleSelectSample = (sample: SampleProblem) => {
    setGrade(sample.grade);
    setProblemText(sample.problemText);
    handleStartAnalysis(sample.problemText, sample.id);
  };

  // Handle OCR Recognized text
  const handleRecognized = (text: string, estimatedGrade?: number) => {
    setProblemText(text);
    if (estimatedGrade && estimatedGrade >= 1 && estimatedGrade <= 12) {
      setGrade(estimatedGrade);
    }
  };

  // Check current step answer
  const handleCheckStepAnswer = async (answer: string) => {
    if (!analysis) throw new Error('Không có bài toán nào');
    const currentStep = analysis.steps[currentStepIndex];

    const response = await fetch('/api/math/check-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemText: analysis.formattedProblem,
        grade: analysis.grade,
        step: currentStep,
        studentAnswer: answer,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Lỗi kiểm tra câu trả lời');
    }

    if (data.isCorrect) {
      const updatedSteps = [...analysis.steps];
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        status: 'completed',
        studentAnswer: answer,
        feedback: data.feedback,
        isCorrect: true,
      };

      const updatedAnalysis = { ...analysis, steps: updatedSteps };
      setAnalysis(updatedAnalysis);
      saveSession(updatedAnalysis, currentStepIndex, isUnlocked);
    }

    return {
      isCorrect: data.isCorrect,
      verdict: data.verdict,
      feedback: data.feedback,
    };
  };

  // Move to next step
  const handleNextStep = () => {
    if (!analysis) return;

    if (currentStepIndex + 1 < analysis.steps.length) {
      const nextIdx = currentStepIndex + 1;
      const updatedSteps = [...analysis.steps];
      updatedSteps[nextIdx].status = 'active';
      const updatedAnalysis = { ...analysis, steps: updatedSteps };
      setAnalysis(updatedAnalysis);
      setCurrentStepIndex(nextIdx);
      saveSession(updatedAnalysis, nextIdx, false);
    } else {
      // Completed all steps!
      setIsUnlocked(true);
      saveSession(analysis, currentStepIndex, true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });

      // Smooth scroll to the unlocked solution card
      setTimeout(() => {
        document.getElementById('full-solution-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300);
    }
  };

  // Force unlock solution
  const handleForceUnlock = () => {
    setIsUnlocked(true);
    if (analysis) {
      saveSession(analysis, currentStepIndex, true);
    }
    setTimeout(() => {
      document.getElementById('full-solution-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 200);
  };

  // Resume a session from history
  const handleSelectHistorySession = (session: SessionHistoryItem) => {
    if (session.analysisData) {
      setGrade(session.grade);
      setProblemText(session.analysisData.rawInput);
      setAnalysis(session.analysisData);
      setCurrentStepIndex(session.currentStepIndex);
      setIsUnlocked(session.isCompleted);
    } else {
      setGrade(session.grade);
      setProblemText(session.problemSnippet);
      handleStartAnalysis(session.problemSnippet);
    }
  };

  // Clear all history (called after UI confirmation)
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete a single session from history
  const handleDeleteHistorySession = (sessionId: string) => {
    const updated = history.filter((item) => item.id !== sessionId);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Reset to input fresh problem
  const handleNewProblem = () => {
    setAnalysis(null);
    setCurrentStepIndex(0);
    setIsUnlocked(false);
  };

  // Determine current stage for the progress bar
  const currentStage =
    !analysis
      ? 'read'
      : isUnlocked
      ? 'solution'
      : 'steps';

  const completedStepsCount = analysis
    ? analysis.steps.filter((s) => s.status === 'completed').length
    : 0;
  const totalStepsCount = analysis ? analysis.steps.length : 0;

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900 font-scale-${fontScale}`}>
      {/* Navigation Header */}
      <Navbar
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
        onOpenSamples={() => setIsSamplesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        aiStatus={aiStatus}
        onNewProblem={handleNewProblem}
        isStudying={!!analysis}
        fontScale={fontScale}
        onCycleFontScale={handleCycleFontScale}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Progress Bar (Visible during study session) */}
        {analysis && (
          <ProgressBar
            currentStage={currentStage}
            currentStepIndex={currentStepIndex}
            totalSteps={totalStepsCount}
            isUnlocked={isUnlocked}
          />
        )}

        {/* View Mode 1: Initial Problem Input & Selection */}
        {!analysis ? (
          <ProblemInputSection
            grade={grade}
            onGradeChange={setGrade}
            problemText={problemText}
            onProblemTextChange={setProblemText}
            onStartAnalysis={() => handleStartAnalysis()}
            isLoading={isAnalyzing}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenSamples={() => setIsSamplesOpen(true)}
            onSelectSample={handleSelectSample}
          />
        ) : !analysis.isWellPosed ? (
          /* View Mode 2: Problem has validation / missing info issues */
          <div className="space-y-6">
            <ProblemInputSection
              grade={grade}
              onGradeChange={setGrade}
              problemText={problemText}
              onProblemTextChange={setProblemText}
              onStartAnalysis={() => handleStartAnalysis()}
              isLoading={isAnalyzing}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenSamples={() => setIsSamplesOpen(true)}
              onSelectSample={handleSelectSample}
              validationIssue={analysis.validationIssue}
              clarificationSuggestions={analysis.clarificationSuggestions}
            />
          </div>
        ) : (
          /* View Mode 3: Active Socratic Learning Session */
          <div className="space-y-6">
            {/* Summary & Original Problem */}
            <SummaryCard
              formattedProblem={analysis.formattedProblem}
              summary={analysis.summary}
              topicLabel={analysis.topicLabel}
              grade={analysis.grade}
            />

            {/* Active Pedagogical Step (One question at a time) */}
            {analysis.steps[currentStepIndex] && (
              <StepInteractiveCard
                key={currentStepIndex}
                step={analysis.steps[currentStepIndex]}
                stepIndex={currentStepIndex}
                totalSteps={totalStepsCount}
                onCheckAnswer={handleCheckStepAnswer}
                onNextStep={handleNextStep}
                onEditProblem={handleNewProblem}
                onOpenScratchpad={() => setIsScratchpadOpen(true)}
                grade={analysis.grade}
                problemText={analysis.formattedProblem}
              />
            )}

            {/* Full Solution (Locked or Unlocked) */}
            <FullSolutionCard
              fullSolution={analysis.fullSolution}
              isUnlocked={isUnlocked}
              onForceUnlock={handleForceUnlock}
              completedStepsCount={completedStepsCount}
              totalStepsCount={totalStepsCount}
            />

            {/* Reinforcement Card (Always accessible to deepen understanding) */}
            {analysis.reinforcement && (
              <ReinforcementCard
                reinforcement={analysis.reinforcement}
                onPracticeSimilar={(simProblem) => {
                  setProblemText(simProblem);
                  handleStartAnalysis(simProblem);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-1">
          <p className="font-bold text-slate-700">
            GỢI MỞ TỪNG BƯỚC – GIÁO VIÊN AI SƯ PHẠM K-12
          </p>
          <p className="text-[11px] text-slate-400">
            Ứng dụng hỗ trợ học sinh tự tư duy và làm chủ kiến thức theo chương trình GDPT Việt Nam.
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onRecognized={handleRecognized}
        currentGrade={grade}
      />

      <ScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />

      <SampleProblemsModal
        isOpen={isSamplesOpen}
        onClose={() => setIsSamplesOpen(false)}
        onSelectProblem={handleSelectSample}
        currentGrade={grade}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={history}
        onSelectSession={handleSelectHistorySession}
        onClearHistory={handleClearHistory}
        onDeleteSession={handleDeleteHistorySession}
      />
    </div>
  );
}
