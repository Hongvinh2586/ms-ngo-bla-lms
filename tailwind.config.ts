import type { Config } from "tailwindcss";

// Warm cream background with a deep-green accent (forest green header/links,
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
        paper: "#F8F1E1",
        "paper-alt": "#EFE1BF",
        surface: "#FFFCF5",
        ink: "#2E2014",
        "ink-soft": "#6B5540",
        "ink-faint": "#9C8767",
        line: "#E0CEA0",
        accent: "#1F6D45",
        "accent-strong": "#154B2F",
        "accent-soft": "#DCEEE1",
        warm: "#7A3E1D",
        "warm-soft": "#EAD5AD",
        good: "#2F6B4F",
        "good-soft": "#DCEBDF",
        bad: "#9C3B2E",
        "bad-soft": "#F3DCD6",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl2: "18px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(46,32,20,.10), 0 16px 34px -16px rgba(46,32,20,.34)",
      },
    },
  },
  plugins: [],
};

export default config;
