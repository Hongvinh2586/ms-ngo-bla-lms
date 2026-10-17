"use client";

import { useEffect, useState } from "react";

// Reading comfort for quiz pages: bigger / smaller text and a soft "calm" colour mode.
// The choice is remembered on this device. It is applied as data attributes on <html>
// (see the "Reading comfort" block in globals.css) and removed again when the student
// leaves the quiz, so the rest of the site looks the same as before.

const STORAGE_KEY = "reading-prefs";
const EVENT = "reading-prefs-change";
const SIZE_LABELS = ["Smaller text", "Normal text", "Bigger text", "Biggest text"];
const DEFAULT_SIZE = 1;

interface Prefs {
  size: number; // index into SIZE_LABELS (0..3)
  calm: boolean;
}

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      const size = typeof p.size === "number" && p.size >= 0 && p.size <= 3 ? Math.round(p.size) : DEFAULT_SIZE;
      return { size, calm: p.calm === true };
    }
  } catch {
    // Storage can be blocked (private window): fall back to the defaults.
  }
  return { size: DEFAULT_SIZE, calm: false };
}

function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.setAttribute("data-fs", String(p.size));
  if (p.calm) root.setAttribute("data-calm", "1");
  else root.removeAttribute("data-calm");
}

// Several quiz runners can be on one page (lessons): only clean up after the last one.
let mounted = 0;

export default function ReadingTools() {
  const [prefs, setPrefs] = useState<Prefs>({ size: DEFAULT_SIZE, calm: false });

  useEffect(() => {
    mounted += 1;
    const initial = readPrefs();
    setPrefs(initial);
    applyPrefs(initial);
    const onChange = () => {
      const p = readPrefs();
      setPrefs(p);
      applyPrefs(p);
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      mounted -= 1;
      if (mounted <= 0) {
        mounted = 0;
        document.documentElement.removeAttribute("data-fs");
        document.documentElement.removeAttribute("data-calm");
      }
    };
  }, []);

  function update(next: Prefs) {
    setPrefs(next);
    applyPrefs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not remembered, but still works for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  const btn =
    "press grid h-8 min-w-[2rem] place-items-center rounded-full border border-line bg-white px-2 text-sm font-extrabold text-ink transition-colors hover:border-accent disabled:opacity-40";

  return (
    <div className="reading-tools flex flex-wrap items-center justify-end gap-2" aria-label="Reading comfort">
      <span className="text-xs font-bold text-ink-soft">Reading</span>
      <button
        type="button"
        className={btn}
        onClick={() => update({ ...prefs, size: Math.max(0, prefs.size - 1) })}
        disabled={prefs.size <= 0}
        aria-label="Make text smaller"
        title="Smaller text"
      >
        A<span className="text-[0.7em]">−</span>
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => update({ ...prefs, size: Math.min(3, prefs.size + 1) })}
        disabled={prefs.size >= 3}
        aria-label="Make text bigger"
        title={SIZE_LABELS[Math.min(3, prefs.size + 1)]}
      >
        A<span className="text-[0.7em]">+</span>
      </button>
      <button
        type="button"
        className={btn + (prefs.calm ? " !border-accent !bg-accent-soft" : "")}
        onClick={() => update({ ...prefs, calm: !prefs.calm })}
        aria-pressed={prefs.calm}
        title="Soft, warm colours that are easier on the eyes"
      >
        {"\u{1F319}"} Calm
      </button>
    </div>
  );
}
