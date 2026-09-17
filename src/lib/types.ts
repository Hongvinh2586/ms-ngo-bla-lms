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
  time_limit_minutes: number | null;
}

/** What the browser sends back on submit, keyed by question id. */
export type StudentAnswer =
  | { type: "multiple_choice"; selectedIndex: number }
  | { type: "true_false"; value: boolean }
  | { type: "fill_blank"; text: string }
  | { type: "sentence_completion"; text: string }
  | { type: "matching"; matches: Record<string, string> }; // left -> chosen right

export type StudentAnswers = Record<string, StudentAnswer>;
