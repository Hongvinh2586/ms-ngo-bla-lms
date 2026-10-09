// A friendly mascot for each quiz, picked from the words in its title so the
// same topic always gets the same animal (Camouflage = chameleon, etc.).

const TOPIC_MASCOTS: { words: string[]; emoji: string }[] = [
  { words: ["camouflage", "chameleon", "disguise"], emoji: "\u{1F98E}" },
  { words: ["ocean", "sea ", "marine", "plastic"], emoji: "\u{1F422}" },
  { words: ["forest", "deforestation", "jungle", "tree"], emoji: "\u{1F989}" },
  { words: ["sleep", "tired", "rest"], emoji: "\u{1F43B}" },
  { words: ["bully", "bullying"], emoji: "\u{1F981}" },
  { words: ["natural disaster", "earthquake", "volcano", "storm", "flood"], emoji: "\u{1F994}" },
  { words: ["sick", "ill", "health", "doctor"], emoji: "\u{1F431}" },
  { words: ["school", "subject", "homework", "class"], emoji: "\u{1F43C}" },
  { words: ["sport", "football", "swim"], emoji: "\u{1F42F}" },
  { words: ["food", "cook", "eat"], emoji: "\u{1F437}" },
  { words: ["music", "song", "sing"], emoji: "\u{1F438}" },
  { words: ["technology", "robot", "computer"], emoji: "\u{1F916}" },
  { words: ["imaginative", "imagination", "story", "fantasy"], emoji: "\u{1F984}" },
  { words: ["cause and effect", "cause", "effect"], emoji: "\u{1F98A}" },
  { words: ["vocabulary"], emoji: "\u{1F41D}" },
  { words: ["language"], emoji: "\u{1F99C}" },
  { words: ["essay"], emoji: "\u{1F418}" },
];

const FALLBACK = [
  "\u{1F98A}",
  "\u{1F43C}",
  "\u{1F42F}",
  "\u{1F438}",
  "\u{1F428}",
  "\u{1F984}",
  "\u{1F419}",
  "\u{1F427}",
];

export function mascotFor(title: string): string {
  const t = " " + title.toLowerCase() + " ";
  for (const m of TOPIC_MASCOTS) {
    if (m.words.some((w) => t.includes(w))) return m.emoji;
  }
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 9973;
  return FALLBACK[h % FALLBACK.length];
}

/** The number in "Week 36: ..." or null when the title has no week. */
export function weekNumber(title: string): number | null {
  const m = /Week\s*(\d+)/i.exec(title);
  return m ? parseInt(m[1], 10) : null;
}
