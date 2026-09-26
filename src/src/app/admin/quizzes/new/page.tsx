import Link from "next/link";
import QuizForm from "../QuizForm";

export default function NewQuizPage() {
  return (
    <div>
      <Link href="/admin/quizzes" className="text-xs font-semibold text-accent">
        ← All quizzes
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">New quiz</h2>
      <QuizForm mode="create" />
    </div>
  );
}
