export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "sentence_completion"
  | "matching";

export interface MultipleChoiceData {
  options: string[];
  correctIndex?: number; // present only server-side / after grading
}

export interface TrueFalseData {
  correctAnswer?: boolean; // present only server-side / after grading
}

export interface FillBlankData {
  acceptedAnswers?: string[]; // present only server-side / after grading
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingData {
  pairs: MatchingPair[]; // `right` values are shuffled for display client-side
}

export type QuestionData =
  | MultipleChoiceData
  | TrueFalseData
  | FillBlankData
  | MatchingData
  | Record<string, unknown>;

export interface QuestionRow {
  id: string;
  quiz_id: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  explanation: string | null;
  points: number;
  data: QuestionData;
}

/** What the browser actually receives for each question type once the
 *  answer-key fields have been stripped server-side (see
 *  src/lib/grading.ts#toSafeQuestionData). */
export type PublicQuestionData =
  | { options: string[] } // multiple_choice
  | { lefts: string[]; rights: string[] } // matching
  | Record<string, never>; // true_false, fill_blank, sentence_completion

/** Question shape sent to the browser while a student is taking the quiz —
 *  answer-key fields have been stripped server-side. */
export type SafeQuestion = Omit<QuestionRow, "data"> & {
  data: PublicQuestionData;
};

export interface QuizRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  category: string | null;
  time_limit_minutes: number | null;
}

/** A featured course shown on the homepage — a category of quizzes, not a
 *  database table of its own (yet). */
export interface CourseInfo {
  slug: string;
  category: string;
  title: string;
  description: string;
}

export const FEATURED_COURSES: CourseInfo[] = [
  {
    slug: "vocabulary",
    category: "vocabulary",
    title: "Vocabulary Builder",
    description: "Everyday words, collocations and usage — short checks after each unit.",
  },
  {
    slug: "ielts",
    category: "ielts",
    title: "IELTS Preparation",
    description: "Practice quizzes for Listening, Reading and Writing task types.",
  },
  {
    slug: "writing",
    category: "writing",
    title: "Writing Courses",
    description: "Sentence structure, grammar accuracy and paragraph-level writing checks.",
  },
];

/** What the browser sends back on submit, keyed by question id. */
export type StudentAnswer =
  | { type: "multiple_choice"; selectedIndex: number }
  | { type: "true_false"; value: boolean }
  | { type: "fill_blank"; text: string }
  | { type: "sentence_completion"; text: string }
  | { type: "matching"; matches: Record<string, string> }; // left -> chosen right

export type StudentAnswers = Record<string, StudentAnswer>;

// ---------------------------------------------------------------------------
// Admin area
// ---------------------------------------------------------------------------

export type UserRole = "student" | "teacher" | "admin";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

/** Same as QuizRow, plus the fields only the admin screens need. */
export interface AdminQuizRow extends QuizRow {
  is_published: boolean;
  created_at: string;
}

/** What the "create/edit quiz" admin form collects, before it's turned
 *  into a `quizzes` row by the server action. */
export interface QuizFormInput {
  slug: string;
  title: string;
  description: string;
  level: string;
  category: string; // "" | "vocabulary" | "ielts" | "writing" | ...
  timeLimitMinutes: number | null;
  isPublished: boolean;
}

/** What the "create/edit question" admin form collects. Only the fields
 *  relevant to `type` are actually used when the server action builds the
 *  `questions.data` JSON — see buildQuestionData() in
 *  src/app/admin/quizzes/[quizId]/questions/actions.ts. */
export interface QuestionFormInput {
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  orderIndex: number;
  options: string[]; // multiple_choice
  correctIndex: number; // multiple_choice
  correctBoolean: boolean; // true_false
  acceptedAnswers: string[]; // fill_blank, sentence_completion
  pairs: MatchingPair[]; // matching
}
