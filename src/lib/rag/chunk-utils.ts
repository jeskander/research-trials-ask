function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, " ").toLowerCase();
}

/** Chunks that look like a table of contents or header/footer boilerplate. */
export function isNavigationChunk(text: string): boolean {
  if (/TABLE OF CONTENTS/i.test(text)) return true;

  const dotLeaders = (text.match(/\.{4,}/g) ?? []).length;
  if (dotLeaders >= 4) return true;

  const tocEntries = (text.match(/\d+(?:\.\d+)*\.?\s+[A-Z][^.]{8,}\.{2,}/g) ?? []).length;
  if (tocEntries >= 3) return true;

  const headerOnly =
    text.length < 350 &&
    /Clinical Research Protocol Template/i.test(text) &&
    /CONFIDENTIAL/i.test(text);
  if (headerOnly) return true;

  return false;
}

function matchesCriteria(text: string, kind: "inclusion" | "exclusion"): boolean {
  const normalized = normalizeForMatch(text);
  if (kind === "exclusion") {
    return (
      /\bexclusion criteria\b/.test(normalized) ||
      /\be xclusion c riteria\b/.test(normalized) ||
      /\b9\.1\.3\b/.test(normalized) && normalized.includes("xclusion")
    );
  }
  return (
    /\binclusion criteria\b/.test(normalized) ||
    /\bi nclusion c riteria\b/.test(normalized) ||
    /\b9\.1\.2\b/.test(normalized) && normalized.includes("nclusion")
  );
}

export function inferSectionLabel(text: string, fallback: string): string {
  if (fallback !== "Protocol section") return fallback;

  if (matchesCriteria(text, "exclusion")) return "Exclusion criteria";
  if (matchesCriteria(text, "inclusion")) return "Inclusion criteria";

  const patterns: Array<[RegExp, string]> = [
    [/\bprimary\s+(?:objective|endpoint)\b/i, "Primary endpoint"],
    [/\bsecondary\s+(?:objective|endpoint)\b/i, "Secondary endpoint"],
    [/\bprohibited\s+medication/i, "Prohibited medications"],
    [/\badverse\s+event/i, "Adverse events"],
    [/\brandomis/i, "Randomisation"],
    [/\bconsent\b/i, "Consent"],
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) return label;
  }

  return fallback;
}

export function keywordBoost(query: string, text: string): number {
  const q = query.toLowerCase();
  let boost = 0;

  if (q.includes("exclusion") && matchesCriteria(text, "exclusion") && !isNavigationChunk(text)) {
    boost += 0.2;
  }
  if (q.includes("inclusion") && matchesCriteria(text, "inclusion") && !isNavigationChunk(text)) {
    boost += 0.2;
  }

  const pairs: Array<[string, RegExp]> = [
    ["endpoint", /\b(?:primary|secondary)\s+endpoint\b/],
    ["prohibited", /\bprohibited\s+medication/],
    ["randomis", /\brandomis/],
    ["consent", /\bconsent\b/],
    ["adverse", /\badverse\s+event/],
  ];

  const normalized = normalizeForMatch(text);
  for (const [term, pattern] of pairs) {
    if (q.includes(term) && pattern.test(normalized) && !isNavigationChunk(text)) {
      boost += 0.12;
    }
  }

  return boost;
}
