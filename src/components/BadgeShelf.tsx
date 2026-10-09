import type { Badge } from "@/lib/badges";

/** "My badges" shelf: the day streak plus every badge, earned ones in colour. */
export default function BadgeShelf({ badges, streak }: { badges: Badge[]; streak: number }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className="mt-8 rounded-xl2 border-[3px] border-ink bg-tint-butter p-6 shadow-[0_6px_0_#2B3010]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-ink">My badges</h2>
        <span className="rounded-full border-2 border-ink bg-white px-3 py-1 text-sm font-extrabold text-ink">
          {"\u{1F525}"} {streak} {streak === 1 ? "day" : "days"} in a row
        </span>
      </div>
      <p className="mt-1 text-sm font-bold text-ink-soft">
        {earned} of {badges.length} collected
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={
              "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center " +
              (b.earned ? "border-ink bg-white" : "border-line bg-white/50")
            }
          >
            <span
              className={"text-4xl leading-none " + (b.earned ? "mascot-bob" : "opacity-30 grayscale")}
              aria-hidden="true"
            >
              {b.emoji}
            </span>
            <span className="text-sm font-extrabold text-ink">{b.title}</span>
            <span className="text-xs font-semibold text-ink-soft">{b.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
