import Link from "next/link";
import type { ReactNode } from "react";

// Friendly building blocks shared by the list pages and the result pages.
// Colours come from the tint-* palette in tailwind.config.ts.

const TINTS = [
  { card: "bg-tint-teal", icon: "bg-tint-teal-strong" },
  { card: "bg-tint-mauve", icon: "bg-tint-mauve-strong" },
  { card: "bg-tint-apricot", icon: "bg-tint-apricot-strong" },
  { card: "bg-tint-butter", icon: "bg-tint-butter-strong" },
];

function tintFor(index: number) {
  return TINTS[((index % TINTS.length) + TINTS.length) % TINTS.length];
}

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Glyph({ index }: { index: number }) {
  const i = ((index % 4) + 4) % 4;
  if (i === 1) {
    return (
      <Svg size={28}>
        <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19z" />
        <path d="M14.5 6.5l3 3" />
      </Svg>
    );
  }
  if (i === 2) {
    return (
      <Svg size={28}>
        <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
      </Svg>
    );
  }
  if (i === 3) {
    return (
      <Svg size={28}>
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </Svg>
    );
  }
  return (
    <Svg size={28}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

/** A colourful card with its own button (used for lessons and quizzes). */
export function FunCard({
  index,
  title,
  description,
  level,
  meta,
  href,
  cta,
}: {
  index: number;
  title: string;
  description?: string | null;
  level?: string | null;
  meta?: string | null;
  href: string;
  cta: string;
}) {
  const tint = tintFor(index);
  return (
    <article
      className={
        "flex flex-col gap-3 rounded-xl2 border-[3px] border-ink p-7 shadow-[0_8px_0_#2B3010] transition-transform hover:-translate-y-1 " +
        tint.card
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            "flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-ink text-ink " +
            tint.icon
          }
        >
          <Glyph index={index} />
        </span>
        {level && <span className="level-tag">{level}</span>}
      </div>
      <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">{title}</h2>
      {description && <p className="text-base font-semibold text-ink-soft">{description}</p>}
      {meta && <p className="text-sm font-bold text-ink-soft">{meta}</p>}
      <Link
        href={href}
        className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-accent"
      >
        {cta}
      </Link>
    </article>
  );
}

/** A colourful card that is one big link (used for course folders). */
export function FunLink({
  index,
  href,
  title,
  description,
  badge,
  highlight,
  cta,
}: {
  index: number;
  href: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  highlight?: boolean;
  cta: string;
}) {
  const tint = tintFor(index);
  return (
    <Link
      href={href}
      className={
        "flex flex-col gap-3 rounded-xl2 border-[3px] border-ink p-7 shadow-[0_8px_0_#2B3010] transition-transform hover:-translate-y-1 " +
        tint.card
      }
    >
      <span
        className={
          "flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-ink text-ink " +
          tint.icon
        }
      >
        <Glyph index={index} />
      </span>
      {badge && (
        <span
          className={
            "w-fit rounded-full px-3 py-1 text-xs font-extrabold " +
            (highlight ? "bg-surface text-ink" : "bg-surface/60 text-ink-soft")
          }
        >
          {badge}
        </span>
      )}
      <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">{title}</h2>
      {description && (
        <p className="flex-grow text-base font-semibold text-ink-soft">{description}</p>
      )}
      <span className="mt-1 w-fit rounded-full bg-ink px-5 py-2 text-base font-extrabold text-white">
        {cta}
      </span>
    </Link>
  );
}

/** Circular score meter. Put the numbers on top of it with absolute positioning. */
export function ScoreRing({ percentage, size = 160 }: { percentage: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percentage));
  const color = pct >= 80 ? "#8FA82A" : pct >= 50 ? "#E3C34A" : "#E8955A";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="#FFFFFF" stroke="#E0E4BE" strokeWidth="11" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={(c * pct) / 100 + " " + c}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

/** Three stars, "count" of them filled. */
export function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-end justify-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width={i === 1 ? 64 : 48}
          height={i === 1 ? 64 : 48}
          viewBox="0 0 24 24"
          fill={i < count ? "#FFC93C" : "#FFFFFF"}
          stroke="#2B3010"
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </div>
  );
}

/** Encouraging message for a score (always positive for young learners). */
export function praiseFor(percentage: number) {
  if (percentage >= 90) {
    return { stars: 3, title: "Amazing!", message: "You are a superstar. Keep it up!" };
  }
  if (percentage >= 70) {
    return { stars: 2, title: "Great job!", message: "You are getting better every day." };
  }
  if (percentage >= 40) {
    return {
      stars: 1,
      title: "Good try!",
      message: "Look at the answers below, then try again to get more stars.",
    };
  }
  return {
    stars: 1,
    title: "Keep going!",
    message: "Every mistake helps you learn. Read the answers below and try again.",
  };
}
