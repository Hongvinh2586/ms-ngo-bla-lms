"use client";

import { useState, type ReactNode } from "react";

/** Phone menu: one round button that opens the list of links. Hidden on wide screens. */
export default function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="press flex items-center gap-2 rounded-full border-[3px] border-ink bg-tint-butter px-4 py-2 text-base font-extrabold text-ink shadow-[0_4px_0_#2B3010]"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {open ? "\u2715" : "\u2630"}
        </span>
        Menu
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-3 flex w-64 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-2xl border-[3px] border-ink bg-surface p-3 shadow-[0_6px_0_#2B3010]"
          onClick={(e) => {
            // Close the menu as soon as a link inside it is tapped.
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
