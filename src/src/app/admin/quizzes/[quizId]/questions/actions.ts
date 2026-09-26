"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuestionData, QuestionFormInput } from "@/lib/types";

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

function validate(input: QuestionFormInput) {
  if (!input.prompt.trim()) {
    throw new Error("Prompt is required.");
  }
  if (!(input.points > 0)) {
    throw new Error("Points must be greater than 0.");
  }

  if (input.type === "multiple_choice") {
    const options = input.options.map((o) => o.trim()).filter((o) => o !== "");
    if (options.length < 2) {
      throw new Error("Add at least 2 options.");
    }
    if (input.correctIndex < 0 || input.correctIndex >= input.options.length) {
      throw new Error("Pick which option is correct.");
    }
    if (!input.options[input.correctIndex]?.trim()) {
      throw new Error("The option marked correct can't be empty.");
    }
  }

  if (input.type === "fill_blank" || input.type === "sentence_completion") {
    const answers = input.acceptedAnswers.map((a) => a.trim()).filter((a) => a !== "");
    if (answers.length === 0) {
      throw new Error("Add at least 1 accepted answer.");
    }
  }

  if (input.type === "matching") {
    const pairs = input.pairs.filter((p) => p.left.trim() !== "" && p.right.trim() !== "");
    if (pairs.length < 2) {
      throw new Error("Add at least 2 complete matching pairs.");
    }
  }
}

export async function createQuestion(quizId: string, input: QuestionFormInput) {
  validate(input);
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
    throw new Error(error.message);
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  redirect(`/admin/quizzes/${quizId}`);
}

export async function updateQuestion(
  questionId: string,
  quizId: string,
  input: QuestionFormInput
) {
  validate(input);
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
    throw new Error(error.message);
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
  redirect(`/admin/quizzes/${quizId}`);
}

export async function deleteQuestion(questionId: string, quizId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/quizzes/${quizId}`);
}

// ---------------------------------------------------------------------------
// Bulk import — paste a whole ready-made multiple-choice test in one go.
// ---------------------------------------------------------------------------

type ParsedBulkQuestion = { prompt: string; options: string[]; correctIndex: number };

/**
 * Parses text pasted into BulkImportForm. Expected shape, one blank line
 * between questions:
 *
 *   1. What is the capital of Vietnam?
 *   A. Ho Chi Minh City
 *   **B. Hanoi**
 *   C. Da Nang
 *   D. Hue
 *
 * - The leading "1." numbering is optional and stripped from the stored
 *   question text (the site numbers questions itself).
 * - Exactly one option per question must be wrapped in ** ** — that's the
 *   correct answer. A plain <textarea> can't show real bold text, so **
 *   stands in for it; if the source document has the correct answer bolded,
 *   that has to be typed back in as ** ** by hand after pasting.
 *
 * Throws a specific, human-readable error naming the offending question
 * number the moment something doesn't match, so the admin can go fix that
 * one block and re-paste rather than guessing.
 */
function parseBulkMultipleChoice(raw: string): ParsedBulkQuestion[] {
  const blocks = raw
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b !== "");

  return blocks.map((block, blockIndex) => {
    const questionNumber = blockIndex + 1;
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== "");

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

    const options: string[] = [];
    let correctIndex = -1;

    for (const rawLine of lines.slice(1)) {
      let text = rawLine;
      let isCorrect = false;

      if (text.startsWith("**") && text.endsWith("**") && text.length > 4) {
        isCorrect = true;
        text = text.slice(2, -2).trim();
      }

      const optionMatch = text.match(/^[A-Da-d][.)]\s*(.+)$/);
      if (!optionMatch) {
        throw new Error(
          `Câu ${questionNumber}: dòng "${rawLine}" không đúng định dạng — mỗi đáp án phải bắt đầu bằng A. B. C. hoặc D.`
        );
      }

      options.push(optionMatch[1].trim());
      if (isCorrect) {
        if (correctIndex !== -1) {
          throw new Error(
            `Câu ${questionNumber}: có hơn 1 đáp án được in đậm (**) — chỉ được đánh dấu đúng 1 đáp án.`
          );
        }
        correctIndex = options.length - 1;
      }
    }

    if (options.length < 2) {
      throw new Error(`Câu ${questionNumber}: cần ít nhất 2 đáp án.`);
    }
    if (correctIndex === -1) {
      throw new Error(
        `Câu ${questionNumber}: chưa có đáp án nào được in đậm (bọc trong **...**) để đánh dấu là đáp án đúng.`
      );
    }

    return { prompt, options, correctIndex };
  });
}

/** Bulk-inserts every question parsed out of `rawText` as new multiple_choice
 *  questions on `quizId`, ordered right after whatever's already there. */
export async function bulkCreateQuestions(
  quizId: string,
  rawText: string,
  startOrderIndex: number
) {
  const parsed = parseBulkMultipleChoice(rawText);

  if (parsed.length === 0) {
    throw new Error("Không tìm thấy câu hỏi nào trong nội dung bạn đã dán.");
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
    throw new Error(error.message);
  }

  revalidatePath(`/admin/quizzes/${quizId}`);

  return { count: rows.length };
}
