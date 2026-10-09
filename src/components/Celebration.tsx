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

/** How much confetti, and for how many seconds, at each level. */
const CONFETTI: Record<number, { pieces: number; seconds: number }> = {
  3: { pieces: 280, seconds: 20 },
  2: { pieces: 110, seconds: 10 },
  1: { pieces: 45, seconds: 10 },
};

type AudioCtor = typeof AudioContext;

let activeCtx: AudioContext | null = null;

function stopSound() {
  if (activeCtx) {
    activeCtx.close().catch(() => undefined);
    activeCtx = null;
  }
}

/**
 * Happy sounds made in the browser (no audio files needed):
 * level 3 = fanfare + loud cheering applause, 2 = medium applause,
 * 1 = about 10 seconds of upbeat motivating music, 0 = one soft ding.
 */
async function playSound(level: number): Promise<boolean> {
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return false;
    stopSound();
    const ctx = new Ctor();
    await ctx.resume().catch(() => undefined);
    if (ctx.state !== "running") {
      ctx.close().catch(() => undefined);
      return false;
    }
    activeCtx = ctx;

    // Output chain: master -> compressor -> speakers, plus a hall-like reverb.
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    const rate = ctx.sampleRate;
    const impulse = ctx.createBuffer(2, Math.floor(rate * 1.8), rate);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet);
    wet.connect(master);
    const noise = ctx.createBuffer(1, rate * 2, rate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

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
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    };
    const clap = (start: number, vol: number, toReverb: boolean) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900 + Math.random() * 2600;
      bp.Q.value = 0.7 + Math.random() * 0.8;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05 + Math.random() * 0.05);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      if (toReverb) g.connect(reverb);
      src.start(t0, Math.random() * 1.5);
      src.stop(t0 + 0.14);
    };
    const hat = (start: number, vol: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
      src.connect(hp);
      hp.connect(g);
      g.connect(master);
      src.start(t0, Math.random());
      src.stop(t0 + 0.1);
    };
    const kick = (start: number, vol: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime + start;
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    };
    const crash = (start: number, vol: number, dur: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 5000;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(hp);
      hp.connect(g);
      g.connect(master);
      g.connect(reverb);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    };
    /** A crowd clapping: quick build-up, long fade-out. */
    const applause = (start: number, dur: number, peak: number) => {
      for (let s = 0; s < dur; s += 0.01) {
        const x = s / dur;
        const env = Math.min(1, x / 0.1) * Math.min(1, (1 - x) / 0.4);
        if (Math.random() < env * 0.55) clap(start + s, peak * (0.4 + Math.random() * 0.6), Math.random() < 0.5);
      }
      // A steady "crowd" rumble under the claps makes it sound fuller.
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1600;
      bp.Q.value = 0.4;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak * 0.18, t0 + dur * 0.15);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      g.connect(reverb);
      src.start(t0);
      src.stop(t0 + dur + 0.1);
    };

    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5;
    let length = 1;
    if (level >= 3) {
      // Fanfare, then loud cheering applause.
      [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.12, 0.28, 0.22, "triangle"));
      [C5, E5, G5, C6].forEach((f) => tone(f, 0.52, 1.0, 0.16, "sine"));
      [C6, E6, C6, E6].forEach((f, i) => tone(f, 0.7 + i * 0.1, 0.25, 0.08, "sine"));
      applause(0.3, 12, 0.7);
      length = 13;
    } else if (level === 2) {
      // Chime, then medium applause.
      [C5, E5, G5].forEach((f, i) => tone(f, i * 0.13, 0.3, 0.2, "triangle"));
      applause(0.3, 6.5, 0.35);
      length = 7;
    } else if (level === 1) {
      // About 10 seconds of upbeat, motivating music (120 BPM, C - G - Am - F - C).
      const beat = 0.5;
      const chords = [
        [261.63, 329.63, 392.0],
        [246.94, 293.66, 392.0],
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
        [261.63, 329.63, 392.0],
      ];
      const roots = [130.81, 98.0, 110.0, 87.31, 130.81];
      chords.forEach((chord, bar) => {
        const t0 = bar * 4 * beat;
        const last = bar === chords.length - 1;
        chord.forEach((f) => tone(f, t0, last ? 1.4 : 2.1, 0.05, "triangle"));
        for (let b = 0; b < (last ? 1 : 4); b++) {
          tone(roots[bar], t0 + b * beat, 0.42, 0.24, "sine");
          kick(t0 + b * beat, 0.5);
          hat(t0 + b * beat + beat / 2, 0.1);
          if (b === 1 || b === 3) clap(t0 + b * beat, 0.3, false);
        }
        for (let k = 0; k < (last ? 2 : 8); k++) {
          tone(chord[[0, 1, 2, 1, 0, 1, 2, 1][k]] * 2, t0 + k * (beat / 2), 0.22, 0.1, "triangle");
        }
      });
      crash(8, 0.12, 1.6);
      master.gain.setValueAtTime(0.9, ctx.currentTime + 9);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 10.6);
      length = 11;
    } else {
      // Keep trying: one soft, friendly ding.
      tone(G5, 0, 0.5, 0.1, "sine");
    }
    setTimeout(() => {
      ctx.close().catch(() => undefined);
      if (activeCtx === ctx) activeCtx = null;
    }, (length + 2.5) * 1000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Celebration shown on the quiz result page: confetti and happy sounds.
 *  90%+  : 20 s of confetti, fanfare and loud applause
 *  70%+  : 10 s of confetti, medium applause
 *  50%+  : small confetti and 10 s of motivating music
 *  below : one soft ding
 * Some browsers block sound until the student touches the page; in that case
 * the sound plays on the first tap, and the Replay button always works.
 */
export default function Celebration({ level }: { level: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [needsTap, setNeedsTap] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = useCallback(() => {
    const cfg = CONFETTI[level];
    if (!cfg) return;
    const fall = 3.5 + 1.8;
    const made: Piece[] = Array.from({ length: cfg.pieces }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * Math.max(0.5, cfg.seconds - fall),
      duration: 3.5 + Math.random() * 1.8,
      size: 7 + Math.random() * 9,
      drift: (Math.random() - 0.5) * 240,
      spin: 360 + Math.random() * 720,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() > 0.6,
    }));
    setPieces(made);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPieces([]), (cfg.seconds + 1) * 1000);
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
      stopSound();
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
