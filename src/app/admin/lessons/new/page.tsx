import Link from "next/link";
import LessonForm from "../LessonForm";

export default function NewLessonPage() {
  return (
    <div>
      <Link href="/admin/lessons" className="text-xs font-semibold text-accent">
        ← Tất cả bài học
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">Bài học mới</h2>
      <LessonForm mode="create" />
    </div>
  );
}
