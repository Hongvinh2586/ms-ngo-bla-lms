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

/** One entry in a quiz's optional "Từ vựng" (vocabulary) tab. */
export interface VocabularyItem {
  term: string;
  meaning: string;
  example?: string | null;
}

export interface QuizRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  category: string | null;
  time_limit_minutes: number | null;
  /** Optional vocabulary list — shown as a "Từ vựng" tab when present.
   *  Only selected on pages that need it (the quiz detail page, the admin
   *  edit form); most QuizRow selects omit these two columns. */
  vocabulary?: VocabularyItem[] | null;
  /** Optional list of grammar/structure paragraphs — shown as a "Cấu trúc"
   *  tab when present. */
  grammar_notes?: string[] | null;
  /** true when this row is a "Lesson" (shown at /lessons), not a regular
   *  quiz (shown at /quizzes). Lessons and quizzes share the same table so
   *  the question-bank UI can be reused, but every page that lists quizzes
   *  filters is_lesson=false, and every page that lists lessons filters
   *  is_lesson=true, so the two never mix. */
  is_lesson?: boolean;
  /** Optional manual sort order for lessons (smaller shows first). */
  order_index?: number | null;
}

/** A featured course shown on the homepage — a category of quizzes, not a
 *  database table of its own (yet). */
export interface CourseInfo {
  slug: string;
  category: string;
  title: string;
  description: string;
}

/** Top-level courses shown on the homepage and in the header nav. "Writing
 *  Courses" is a parent here — it has no quizzes of its own; clicking it
 *  goes to /writing, which lists WRITING_SUB_COURSES below. */
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
    description: "Choose your level — A2, B1, or B2 — for paragraph and essay writing practice.",
  },
];

/** The three writing sub-courses shown on /writing, one level below the
 *  "Writing Courses" card above. Each has its own quizzes (category
 *  "writing-a2" | "writing-b1" | "writing-b2"). */
export const WRITING_SUB_COURSES: CourseInfo[] = [
  {
    slug: "writing-a2",
    category: "writing-a2",
    title: "A2 Writing Course",
    description: "Simple sentences, basic connectors, and short paragraphs for beginner-level writers.",
  },
  {
    slug: "writing-b1",
    category: "writing-b1",
    title: "B1 Writing Course",
    description: "Paragraph structure, linking words, and everyday topics for intermediate writers.",
  },
  {
    slug: "writing-b2",
    category: "writing-b2",
    title: "B2 Writing Course",
    description: "Essay structure, argument development, and more complex grammar for upper-intermediate writers.",
  },
];

/** Books inside the Vocabulary Builder course. Each book is its own folder:
 *  its lessons use the category below (always starting with "vocabulary-"),
 *  and /quizzes?category=vocabulary lists the books as cards. To add a new
 *  book, add an entry here and an <option> in admin/lessons/LessonForm.tsx. */
export const VOCAB_FOLDERS: CourseInfo[] = [
  {
    slug: "timed-reading-3",
    category: "vocabulary-timed-reading-3",
    title: "Timed Reading for Fluency 3",
    description: "Eight vocabulary lessons (A2–B1+) built from the reading topics, with flashcards in Vietnamese, structures and mixed practice.",
  },
  {
    slug: "timed-reading-4",
    category: "vocabulary-timed-reading-4",
    title: "Timed Reading for Fluency 4",
    description: "Eight vocabulary lessons (B1–B2) built from the reading topics, with flashcards, structures and mixed practice.",
  },
];

/** Every real, filterable quiz category (i.e. every category a quiz row can
 *  actually have) — used to look up a course by its `category` value, e.g.
 *  for the /quizzes page heading and filter pills. Unlike FEATURED_COURSES,
 *  this does NOT include the "writing" parent, since no quiz uses that
 *  category directly. */
export const ALL_COURSES: CourseInfo[] = [
  ...FEATURED_COURSES.filter((c) => c.category !== "writing"),
  ...WRITING_SUB_COURSES,
  ...VOCAB_FOLDERS,
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

/** One row of the teacher-maintained allowlist that gates /signup — see
 *  supabase/migration_005_allowed_students.sql and AllowedStudentsForm. */
export interface AllowedStudentRow {
  email: string;
  full_name: string | null;
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
  /** Raw textarea contents — one vocabulary entry per line, formatted
   *  "term | meaning | example" (example optional). Parsed into
   *  VocabularyItem[] server-side. Blank = no vocabulary tab. */
  vocabularyText: string;
  /** Raw textarea contents — one grammar/structure paragraph per blank-line
   *  separated block. Parsed into string[] server-side. Blank = no
   *  structure tab. */
  grammarNotesText: string;
}

/** What the "create/edit lesson" admin form collects — a lighter version of
 *  QuizFormInput without the fields lessons don't use (description,
 *  category, time limit). See src/app/admin/lessons/actions.ts. */
export interface LessonFormInput {
  slug: string;
  /** "" or missing = Writing lessons; "vocabulary" = Vocabulary Builder. */
  category?: string;
  title: string;
  level: string;
  orderIndex: number | null;
  isPublished: boolean;
  vocabularyText: string;
  grammarNotesText: string;
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
