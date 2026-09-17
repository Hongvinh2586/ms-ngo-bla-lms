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
