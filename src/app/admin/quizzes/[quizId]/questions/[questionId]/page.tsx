import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuestionRow } from "@/lib/types";
import QuestionForm from "../QuestionForm";

export default async function EditQuestionPage({
  params,
}: {
  params: { quizId: string; questionId: string };
}) {
  const supabase = createClient();

  const { data: question } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("id", params.questionId)
    .single<QuestionRow>();

  if (!question) {
    notFound();
  }

  return (
    <div>
      <Link href={`/admin/quizzes/${params.quizId}`} className="text-xs font-semibold text-accent">
        ← Back to quiz
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">Edit question</h2>
      <QuestionForm quizId={params.quizId} question={question} />
    </div>
  );
}
