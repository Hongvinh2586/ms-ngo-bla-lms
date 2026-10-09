"use client";

import { useEffect, useState } from "react";

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

/**
 * Confetti burst shown when a student finishes a quiz well.
 * level 0 = nothing, 1 = small, 2 = medium, 3 = big (Amazing!).
 * It plays once, disappears by itself, and is skipped for students who
 * prefer reduced motion.
 */
export default function Celebration({ level }: { level: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!level) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    const timer = setTimeout(() => setPieces([]), 5200);
    return () => clearTimeout(timer);
  }, [level]);

  return (
    <>
      <style>{`
        @keyframes cheerPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); }
        }
        .cheer-pop { animation: cheerPop 0.7s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .cheer-pop { animation: none; } }
        @keyframes confettiFall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 108vh, 0) rotate(var(--spin)); opacity: 0; }
        }
      `}</style>
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
            } as React.CSSProperties
          }
        />
      ))}
    </div>
      )}
    </>
  );
}
