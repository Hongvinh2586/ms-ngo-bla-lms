"use client";

import { useEffect, useRef, useState } from "react";

// Plays a camera-shutter "tach-tach" every time a student presses a button,
// a link button or an answer option. A small speaker button (bottom left)
// lets anyone switch the sound off; the choice is remembered in the browser.

const PRESSABLE = "button, a.press, .press, label.cursor-pointer, [role=button]";

function tick(ctx: AudioContext, t: number, pitch: number, vol: number) {
  // A very short burst of filtered noise = the click of the shutter blade.
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = pitch;
  band.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(band);
  band.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);

  // A tiny low "knock" underneath gives it body, like the camera's mirror.
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(pitch / 6, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.03);
  og.gain.setValueAtTime(vol * 0.22, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  osc.connect(og);
  og.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.04);
}

export default function ClickSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const onRef = useRef(true);
  const [on, setOn] = useState(true);

  function shutter() {
    try {
      if (!ctxRef.current) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime + 0.005;
      tick(ctx, t, 3200, 0.5);
      tick(ctx, t + 0.075, 2400, 0.42);
    } catch {
      // Sound is a bonus; never break the page because of it.
    }
  }

  useEffect(() => {
    try {
      if (window.localStorage.getItem("sfx-off") === "1") {
        onRef.current = false;
        setOn(false);
      }
    } catch {
      // Storage can be blocked; the sound just stays on.
    }

    function handler(e: PointerEvent) {
      if (!onRef.current) return;
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(PRESSABLE) as HTMLElement | null;
      if (!el) return;
      if ((el as HTMLButtonElement).disabled) return;
      if (el.closest("[data-no-sfx]")) return;
      shutter();
    }
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    try {
      window.localStorage.setItem("sfx-off", next ? "0" : "1");
    } catch {
      // ignore
    }
    if (next) shutter();
  }

  return (
    <button
      type="button"
      data-no-sfx
      onClick={toggle}
      aria-label={on ? "Turn button sounds off" : "Turn button sounds on"}
      title={on ? "Sound on" : "Sound off"}
      className="fixed bottom-24 left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-ink bg-surface text-xl shadow-[0_3px_0_#2B3010] active:translate-y-0.5"
    >
      {on ? "\u{1F50A}" : "\u{1F507}"}
    </button>
  );
}
