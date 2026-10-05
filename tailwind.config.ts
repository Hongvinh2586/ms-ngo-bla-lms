import type { Config } from "tailwindcss";

// Playful light-olive theme for young learners (olive background and accent,
// same family as the "Cô Húng Láng" reference site the homepage design is
// based on) instead of the earlier gold-brown accent.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F1F3DF",
        "paper-alt": "#E3E7C2",
        surface: "#FBFCF2",
        ink: "#2B3010",
        "ink-soft": "#5F6440",
        "ink-faint": "#6B7048",
        line: "#CBD1A0",
        accent: "#5B6B1F",
        "accent-strong": "#3E4A12",
        "accent-soft": "#E1E8BC",
        warm: "#7A3E1D",
        "warm-soft": "#F8DDC2",
        good: "#4E7A2A",
        "good-soft": "#DDEBC4",
        "tint-teal": "#D3E8E4",
        "tint-teal-strong": "#7CC2B6",
        "tint-mauve": "#E9DCEB",
        "tint-mauve-strong": "#C39BCF",
        "tint-apricot": "#F8DDC2",
        "tint-apricot-strong": "#E8955A",
        "tint-butter": "#F3EBB8",
        "tint-butter-strong": "#E3C34A",
        bad: "#9C3B2E",
        "bad-soft": "#F3DCD6",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "-apple-system", "sans-serif"],
      },
      // Bumped up one notch from Tailwind's defaults so every heading on the
      // site (all of which use text-lg through text-4xl) reads larger and
      // more prominent — this affects every page at once, nothing else to edit.
      fontSize: {
        lg: ["1.25rem", { lineHeight: "1.85rem" }],
        xl: ["1.5rem", { lineHeight: "2.1rem" }],
        "2xl": ["1.875rem", { lineHeight: "2.35rem" }],
        "3xl": ["2.25rem", { lineHeight: "2.6rem" }],
        "4xl": ["2.75rem", { lineHeight: "3rem" }],
      },
      borderRadius: {
        xl2: "28px",
      },
      boxShadow: {
        card: "0 5px 0 rgba(43,48,16,.16), 0 16px 30px -16px rgba(43,48,16,.28)",
      },
    },
  },
  plugins: [],
};

export default config;
