"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

interface Piece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  spin: number;
  color: string;
  round: boolean;
}

const COLORS = ["#F2C14E", "#E4572E", "#4C9F70", "#3E7CB1", "#C05299", "#8DB82B"];

type AudioCtor = typeof AudioContext;

/** A short happy sound made in the browser (no audio files needed). */
async function playSound(level: number): Promise<boolean> {
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    await ctx.resume().catch(() => undefined);
    if (ctx.state !== "running") {
      ctx.close().catch(() => undefined);
      return false;
    }
    const tone = (freq: number, start: number, dur: number, vol: number, type: OscillatorType) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    };
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5;
    if (level >= 3) {
      // Fanfare: quick rising notes, then a bright chord and sparkles.
      [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.12, 0.28, 0.22, "triangle"));
      [C5, E5, G5, C6].forEach((f) => tone(f, 0.52, 1.0, 0.16, "sine"));
      [C6, E6, C6, E6].forEach((f, i) => tone(f, 0.7 + i * 0.1, 0.25, 0.08, "sine"));
    } else if (level === 2) {
      [C5, E5, G5].forEach((f, i) => tone(f, i * 0.13, 0.3, 0.2, "triangle"));
      tone(C6, 0.42, 0.7, 0.14, "sine");
    } else if (level === 1) {
      [E5, G5].forEach((f, i) => tone(f, i * 0.15, 0.35, 0.18, "triangle"));
    } else {
      // Keep trying: one soft, friendly ding.
      tone(G5, 0, 0.5, 0.1, "sine");
    }
    setTimeout(() => ctx.close().catch(() => undefined), 3000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Celebration shown on the quiz result page: confetti and a happy sound.
 * level 0 = soft ding only, 1 = small, 2 = medium, 3 = big (Amazing!).
 * Some browsers block sound until the student touches the page; in that case
 * the sound plays on the first tap, and the Replay button always works.
 */
export default function Celebration({ level }: { level: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [needsTap, setNeedsTap] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = useCallback(() => {
    if (!level) return;
    const count = level >= 3 ? 110 : level === 2 ? 60 : 28;
    const made: Piece[] = Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      duration: 2.4 + Math.random() * 2,
      size: 7 + Math.random() * 9,
      drift: (Math.random() - 0.5) * 220,
      spin: 360 + Math.random() * 720,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() > 0.6,
    }));
    setPieces(made);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPieces([]), 5200);
  }, [level]);

  const celebrate = useCallback(
    async (fromTap: boolean) => {
      burst();
      const ok = await playSound(level);
      if (!ok && !fromTap) setNeedsTap(true);
    },
    [burst, level],
  );

  useEffect(() => {
    celebrate(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [celebrate]);

  // If the browser blocked the sound, play it on the first touch or key press.
  useEffect(() => {
    if (!needsTap) return;
    const handler = () => {
      setNeedsTap(false);
      celebrate(true);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, handler, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [needsTap, celebrate]);

  return (
    <>
      <style>{`
        @keyframes cheerPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); }
        }
        .cheer-pop { animation: cheerPop 0.7s ease-out both; }
        @keyframes confettiFall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 108vh, 0) rotate(var(--spin)); opacity: 0; }
        }
      `}</style>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => celebrate(true)}
          className="rounded-full border-2 border-ink bg-tint-butter px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5"
        >
          Replay celebration
        </button>
      </div>
      {pieces.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          {pieces.map((p, i) => (
            <span
              key={i}
              style={
                {
                  position: "absolute",
                  top: 0,
                  left: p.left + "%",
                  width: p.size,
                  height: p.round ? p.size : p.size * 0.5,
                  borderRadius: p.round ? "9999px" : "2px",
                  backgroundColor: p.color,
                  animation: "confettiFall " + p.duration + "s ease-in " + p.delay + "s forwards",
                  "--drift": p.drift + "px",
                  "--spin": p.spin + "deg",
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
