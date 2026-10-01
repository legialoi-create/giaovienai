export type QuestionType = 'multiple_choice' | 'math_input' | 'concept_choice' | 'step_order';

export interface OptionItem {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PedagogicalStep {
  stepNumber: number;
  title: string;
  goal: string;
  question: string;
  questionType: QuestionType;
  options?: OptionItem[];
  expectedAnswerText?: string;
  acceptableVariations?: string[];
  inputPlaceholder?: string;
  hintTier1: string; // Gợi ý định hướng
  hintTier2: string; // Gợi ý công thức & liên hệ
  deepExplanation: string; // "Em chưa hiểu" - Giải thích tường tận
  status: 'pending' | 'active' | 'completed' | 'skipped';
  studentAnswer?: string;
  feedback?: string;
  isCorrect?: boolean;
  hintsUsed: number;
}

export interface ProblemSummary {
  given: string[]; // Giả thiết đã cho
  toFind: string[]; // Kết luận / Cần tìm
  keyFormulas: string[]; // Công thức / Định lý liên quan
  strategyOverview: string; // Hướng suy nghĩ tổng quát
}

export interface FullSolution {
  finalResult: string;
  detailedSteps: Array<{
    stepTitle: string;
    stepDetail: string;
  }>;
  verification: string; // Cách thử lại kết quả
}

export interface ReinforcementData {
  keyTakeaway: string; // Ghi nhớ vàng
  commonPitfalls: string[]; // Bẫy và sai lầm thường gặp
  similarProblem: {
    title: string;
    problem: string;
    hint: string;
    answer: string;
  };
}

export interface MathAnalysisResult {
  id: string;
  rawInput: string;
  formattedProblem: string;
  grade: number;
  topic: string;
  topicLabel: string;
  isWellPosed: boolean;
  validationIssue?: string; // Nếu đề thiếu dữ kiện hoặc mờ
  clarificationSuggestions?: string[];
  summary: ProblemSummary;
  steps: PedagogicalStep[];
  fullSolution: FullSolution;
  reinforcement: ReinforcementData;
  isDemo?: boolean;
  createdAt: number;
}

export interface SessionHistoryItem {
  id: string;
  title: string;
  grade: number;
  topic: string;
  topicLabel: string;
  problemSnippet: string;
  currentStepIndex: number;
  totalSteps: number;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
  analysisData?: MathAnalysisResult;
}

export interface SampleProblem {
  id: string;
  title: string;
  grade: number;
  topic: string;
  topicLabel: string;
  badge: string;
  problemText: string;
  description: string;
}
