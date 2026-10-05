"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuestionData, QuestionFormInput, QuestionType } from "@/lib/types";

function buildQuestionData(input: QuestionFormInput): QuestionData {
  switch (input.type) {
    case "multiple_choice":
      return {
        options: input.options.map((o) => o.trim()).filter((o) => o !== ""),
        correctIndex: input.correctIndex,
      };
    case "true_false":
      return { correctAnswer: input.correctBoolean };
    case "fill_blank":
    case "sentence_completion":
      return {
        acceptedAnswers: input.acceptedAnswers.map((a) => a.trim()).filter((a) => a !== ""),
      };
    case "matching":
      return {
        pairs: input.pairs
          .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
          .filter((p) => p.left !== "" && p.right !== ""),
      };
    default:
      return {};
  }
}

/** Server Actions must never `throw` a "normal" error: in a production
 *  build, Next.js redacts any thrown error's message before it reaches the
 *  client and replaces it with a generic "An error occurred in the Server
 *  Components render..." message — so the real reason (a validation message,
 *  a Postgres error) never shows up in the UI, only in Vercel's server logs.
 *  To keep the actual message visible to the admin, every action below
 *  returns a plain result object instead of throwing, and the calling form
 *  reads `result.error` directly rather than relying on try/catch. */
export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: QuestionFormInput): string | null {
  if (!input.prompt.trim()) {
    return "Prompt is required.";
  }
  if (!(input.points > 0)) {
    return "Points must be greater than 0.";
  }

  if (input.type === "multiple_choice") {
    const options = input.options.map((o) => o.trim()).filter((o) => o !== "");
    if (options.length < 2) {
      return "Add at least 2 options.";
    }
    if (input.correctIndex < 0 || input.correctIndex >= input.options.length) {
      return "Pick which option is correct.";
    }
    if (!input.options[input.correctIndex]?.trim()) {
      return "The option marked correct can't be empty.";
    }
  }

  if (input.type === "fill_blank" || input.type === "sentence_completion") {
    const answers = input.acceptedAnswers.map((a) => a.trim()).filter((a) => a !== "");
    if (answers.length === 0) {
      return "Add at least 1 accepted answer.";
    }
  }

  if (input.type === "matching") {
    const pairs = input.pairs.filter((p) => p.left.trim() !== "" && p.right.trim() !== "");
    if (pairs.length < 2) {
      return "Add at least 2 complete matching pairs.";
    }
  }

  return null;
}

export async function createQuestion(
  quizId: string,
  input: QuestionFormInput
): Promise<ActionResult> {
  const validationError = validate(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = createClient();

  const { error } = await supabase.from("questions").insert({
    quiz_id: quizId,
    order_index: input.orderIndex,
    type: input.type,
    prompt: input.prompt.trim(),
    explanation: input.explanation.trim() || null,
    points: input.points,
    data: buildQuestionData(input),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  redirect(`/admin/quizzes/${quizId}`);
}

export async function updateQuestion(
  questionId: string,
  quizId: string,
  input: QuestionFormInput
): Promise<ActionResult> {
  const validationError = validate(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("questions")
    .update({
      order_index: input.orderIndex,
      type: input.type,
      prompt: input.prompt.trim(),
      explanation: input.explanation.trim() || null,
      points: input.points,
      data: buildQuestionData(input),
    })
    .eq("id", questionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  redirect(`/admin/quizzes/${quizId}`);
}

export async function deleteQuestion(questionId: string, quizId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bulk import — paste a whole ready-made multiple-choice test in one go.
// ---------------------------------------------------------------------------

type ParsedBulkQuestion = { prompt: string; options: string[]; correctIndex: number };

/**
 * Parses text pasted into BulkImportForm. The documented shape is one blank
 * line between questions:
 *
 *   1. What is the capital of Vietnam?
 *   A. Ho Chi Minh City
 *   B. Hanoi
 *   C. Da Nang
 *   D. Hue
 *   Đáp án: B
 *
 * A blank line always starts a new question. As a fallback for text pasted
 * straight out of Word/Docs — which very often loses the blank line between
 * questions on paste, even though it looked fine in the original document —
 * a line starting with a number ("2.", "3)") also starts a new question, but
 * only once the question collected so far already has a complete answer key.
 * That guard means a coincidental number inside an option's own text (e.g.
 * "A. 1990s music") never gets mistaken for the next question.
 *
 * - The leading "1." numbering is optional and stripped from the stored
 *   question text (the site numbers questions itself).
 * - The line naming the correct option by letter — "Đáp án: B" (also
 *   accepts "Dap an", "Answer", "Correct", with or without ":", case- and
 *   accent-insensitive) — doesn't need to be the last line, just present
 *   somewhere after the question line.
 *
 * Throws a specific, human-readable error naming the offending question
 * number the moment something doesn't match, so the admin can go fix that
 * one block and re-paste rather than guessing.
 */
function parseBulkMultipleChoice(raw: string): ParsedBulkQuestion[] {
  const answerLinePattern = /^(?:đáp\s*án|dap\s*an|answer|correct)\s*[:\-]?\s*([A-Da-d])\b/i;
  const numberedStartPattern = /^\d+[.)]\s*\S/;

  const blocks: string[][] = [];
  let current: string[] = [];
  let currentHasAnswer = false;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
        currentHasAnswer = false;
      }
      continue;
    }

    if (currentHasAnswer && current.length > 0 && numberedStartPattern.test(line)) {
      blocks.push(current);
      current = [];
      currentHasAnswer = false;
    }

    current.push(line);
    if (answerLinePattern.test(line)) {
      currentHasAnswer = true;
    }
  }
  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks.map((lines, blockIndex) => {
    const questionNumber = blockIndex + 1;

    if (lines.length < 3) {
      throw new Error(
        `Câu ${questionNumber}: thiếu câu hỏi hoặc đáp án (cần 1 dòng câu hỏi và ít nhất 2 dòng đáp án).`
      );
    }

    const questionLine = lines[0];
    const promptMatch = questionLine.match(/^\d+[.)]\s*(.+)$/);
    const prompt = (promptMatch ? promptMatch[1] : questionLine).trim();

    if (!prompt) {
      throw new Error(`Câu ${questionNumber}: thiếu nội dung câu hỏi.`);
    }

    const optionEntries: { letter: string; text: string }[] = [];
    let correctLetter: string | null = null;

    for (const rawLine of lines.slice(1)) {
      const optionMatch = rawLine.match(/^([A-Da-d])[.)]\s*(.+)$/);
      if (optionMatch) {
        optionEntries.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
        continue;
      }

      const answerMatch = rawLine.match(answerLinePattern);
      if (answerMatch) {
        correctLetter = answerMatch[1].toUpperCase();
        continue;
      }

      throw new Error(
        `Câu ${questionNumber}: dòng "${rawLine}" không đúng định dạng — phải là 1 đáp án (A. B. C. D.) hoặc dòng "Đáp án: X".`
      );
    }

    if (optionEntries.length < 2) {
      throw new Error(`Câu ${questionNumber}: cần ít nhất 2 đáp án.`);
    }
    if (!correctLetter) {
      throw new Error(`Câu ${questionNumber}: thiếu dòng "Đáp án: X" để biết đáp án nào đúng.`);
    }

    const correctIndex = optionEntries.findIndex((o) => o.letter === correctLetter);
    if (correctIndex === -1) {
      throw new Error(
        `Câu ${questionNumber}: "Đáp án: ${correctLetter}" không khớp với đáp án nào đã liệt kê ` +
          `(chỉ có ${optionEntries.map((o) => o.letter).join(", ")}).`
      );
    }

    return { prompt, options: optionEntries.map((o) => o.text), correctIndex };
  });
}

export type BulkImportResult = { ok: true; count: number } | { ok: false; error: string };

/** Bulk-inserts every question parsed out of `rawText` as new multiple_choice
 *  questions on `quizId`, ordered right after whatever's already there.
 *
 *  Note: parseBulkMultipleChoice() throws to name the offending question as
 *  soon as it hits one, but that throw is caught right here and turned into
 *  a returned `{ ok: false, error }` — it never crosses back out of this
 *  Server Action. See the ActionResult comment above for why: a thrown
 *  error's message gets silently redacted by Next.js in production. */
export async function bulkCreateQuestions(
  quizId: string,
  rawText: string,
  startOrderIndex: number
): Promise<BulkImportResult> {
  if (rawText.trim().startsWith("[")) {
    return bulkCreateQuestionsFromJson(quizId, rawText, startOrderIndex);
  }

  let parsed: ParsedBulkQuestion[];
  try {
    parsed = parseBulkMultipleChoice(rawText);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không đọc được nội dung đã dán.",
    };
  }

  if (parsed.length === 0) {
    return { ok: false, error: "Không tìm thấy câu hỏi nào trong nội dung bạn đã dán." };
  }

  const supabase = createClient();

  const rows = parsed.map((q, i) => ({
    quiz_id: quizId,
    order_index: startOrderIndex + i,
    type: "multiple_choice" as const,
    prompt: q.prompt,
    explanation: null,
    points: 1,
    data: { options: q.options, correctIndex: q.correctIndex },
  }));

  const { error } = await supabase.from("questions").insert(rows);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/quizzes/${quizId}`);

  return { ok: true, count: rows.length };
}

const QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "fill_blank",
  "sentence_completion",
  "matching",
];

/** JSON import: the pasted text is a JSON array of question objects, each
 *  shaped like QuestionFormInput (type and prompt are always needed; the
 *  rest depends on the type). It lets one paste add every question type,
 *  with explanations, in a single step. */
async function bulkCreateQuestionsFromJson(
  quizId: string,
  rawJson: string,
  startOrderIndex: number
): Promise<BulkImportResult> {
  let items: unknown;
  try {
    items = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "The pasted JSON could not be read." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Expected a non-empty JSON array of questions." };
  }

  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = (items[i] ?? {}) as Record<string, unknown>;
    const type = String(it.type ?? "") as QuestionType;
    if (!QUESTION_TYPES.includes(type)) {
      return { ok: false, error: `Question ${i + 1}: unknown type "${String(it.type)}".` };
    }
    const input: QuestionFormInput = {
      type,
      prompt: String(it.prompt ?? ""),
      explanation: String(it.explanation ?? ""),
      points: it.points === undefined ? 1 : Number(it.points),
      orderIndex: startOrderIndex + i,
      options: strings(it.options),
      correctIndex: it.correctIndex === undefined ? 0 : Number(it.correctIndex),
      correctBoolean: Boolean(it.correctBoolean),
      acceptedAnswers: strings(it.acceptedAnswers),
      pairs: Array.isArray(it.pairs)
        ? it.pairs.map((p) => {
            const pair = (p ?? {}) as Record<string, unknown>;
            return { left: String(pair.left ?? ""), right: String(pair.right ?? "") };
          })
        : [],
    };
    const problem = validate(input);
    if (problem) {
      return { ok: false, error: `Question ${i + 1}: ${problem}` };
    }
    rows.push({
      quiz_id: quizId,
      order_index: input.orderIndex,
      type: input.type,
      prompt: input.prompt.trim(),
      explanation: input.explanation.trim() || null,
      points: input.points,
      data: buildQuestionData(input),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  return { ok: true, count: rows.length };
}
