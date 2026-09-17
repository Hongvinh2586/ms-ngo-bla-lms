import Link from "next/link";
import QuestionForm from "../QuestionForm";

export default function NewQuestionPage({
  params,
  searchParams,
}: {
  params: { quizId: string };
  searchParams: { order?: string };
}) {
  const nextOrderIndex = searchParams.order ? Number(searchParams.order) : 1;

  return (
    <div>
      <Link href={`/admin/quizzes/${params.quizId}`} className="text-xs font-semibold text-accent">
        ← Back to quiz
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">New question</h2>
      <QuestionForm quizId={params.quizId} nextOrderIndex={nextOrderIndex} />
    </div>
  );
}
