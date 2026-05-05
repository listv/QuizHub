// ── Auth ──
export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ── User ──
export interface User {
  id: string;
  login: string;
  fullName: string;
  role: UserRole;
  department: string;
  isActive: boolean;
}

export type UserRole = 'Admin' | 'Manager' | 'Employee';

export interface CreateUserRequest {
  login: string;
  password: string;
  fullName: string;
  role: string;
  department: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  password?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

// ── Question ──
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  category: string;
  explanation?: string;
  imageUrl?: string;
  options: QuestionOption[];
  createdAt: string;
}

export type QuestionType = 'Single' | 'Multi' | 'Open';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface CreateQuestionRequest {
  text: string;
  type: string;
  category: string;
  explanation?: string;
  options: { text: string; isCorrect: boolean }[];
}

// ── Test ──
export interface Test {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  passingScore: number;
  randomizeQuestions: boolean;
  maxAttempts: number;
  deadline?: string;
  isActive: boolean;
  questionIds: string[];
  attemptCount: number;
  passedCount: number;
  assignments: TestAssignment[];
  createdAt: string;
}

export interface TestAssignment {
  id: string;
  userId?: string;
  userName?: string;
  department?: string;
}

export interface AssignTestRequest {
  testId: string;
  userIds?: string[];
  departments?: string[];
}

export interface CreateTestRequest {
  title: string;
  description?: string;
  timeLimitMinutes: number;
  passingScore: number;
  randomizeQuestions: boolean;
  questionIds: string[];
  maxAttempts?: number;
  deadline?: string;
}

// ── Test Taking ──
export interface TestQuestionsResponse {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  passingScore: number;
  questions: TestQuestionItem[];
}

export interface TestQuestionItem {
  id: string;
  text: string;
  type: string;
  imageUrl?: string;
  options?: { id: string; text: string }[];
}

export interface SubmitTestRequest {
  testId: string;
  answers: { questionId: string; answerData?: string }[];
}

// ── Results ──
export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passingScore: number;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  answers?: AnswerDetail[];
}

export interface AnswerDetail {
  questionId: string;
  questionText: string;
  questionType: string;
  answerData?: string;
  isCorrect: boolean;
  explanation?: string;
  imageUrl?: string;
  options?: QuestionOption[];
}

export interface PaginatedResults {
  total: number;
  page: number;
  pageSize: number;
  results: TestResult[];
}

// ── Analytics ──
export interface OverviewAnalytics {
  totalAttempts: number;
  passed: number;
  failed: number;
  averageScore: number;
}

export interface EmployeeAnalytics {
  userId: string;
  fullName: string;
  department: string;
  attempts: number;
  averageScore?: number;
  passed: number;
  failed: number;
}

export interface DifficultQuestion {
  questionId: string;
  text: string;
  category: string;
  totalAttempts: number;
  wrongAnswers: number;
  errorRate: number;
}

export interface OverdueTest {
  testId: string;
  testTitle: string;
  deadline: string;
  employees: OverdueEmployee[];
}

export interface OverdueEmployee {
  userId: string;
  fullName: string;
  department: string;
  hasAttempt: boolean;
  score?: number;
  passed?: boolean;
}
