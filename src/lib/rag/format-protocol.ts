export type SectionFocus =
  | "Exclusion criteria"
  | "Inclusion criteria"
  | "Primary endpoint"
  | "Secondary endpoint"
  | "Prohibited medications"
  | "Randomisation"
  | "Consent";

const SECTION_PATTERNS: Record<
  SectionFocus,
  { start: RegExp; end: RegExp }
> = {
  "Exclusion criteria": {
    start: /(?:\d+(?:\.\d+)+\s+)?(?:E\s*xclusion\s*c\s*riteria|Exclusion\s+criteria)/i,
    end: /\s\d+(?:\.\d+)+\s+(?:[A-Z][a-z]|\d)/,
  },
  "Inclusion criteria": {
    start: /(?:\d+(?:\.\d+)+\s+)?(?:I\s*nclusion\s*c\s*riteria|Inclusion\s+criteria)/i,
    end: /\s\d+(?:\.\d+)+\s+(?:E\s*xclusion|Exclusion|Consent|[A-Z])/i,
  },
  "Primary endpoint": {
    start: /Primary\s+(?:objective|endpoint)/i,
    end: /\s(?:Secondary|Primary)\s+(?:objective|endpoint)|\s\d+(?:\.\d+)+\s+/i,
  },
  "Secondary endpoint": {
    start: /Secondary\s+(?:objective|endpoint)/i,
    end: /\s\d+(?:\.\d+)+\s+[A-Z]/,
  },
  "Prohibited medications": {
    start: /Prohibited\s+medication/i,
    end: /\s\d+(?:\.\d+)+\s+[A-Z]/,
  },
  Randomisation: {
    start: /Randomis(?:ation|ed)/i,
    end: /\s\d+(?:\.\d+)+\s+[A-Z]/,
  },
  Consent: {
    start: /(?:\d+(?:\.\d+)+\s+)?Consent/i,
    end: /\s\d+(?:\.\d+)+\s+(?:Randomis|[A-Z])/i,
  },
};

/** Strip PDF boilerplate repeated on every page. */
function stripPageBoilerplate(text: string): string {
  return text
    .replace(
      /Date and version No\s*:.*?Page \d+ of \d+\s*/gi,
      "",
    )
    .replace(
      /Clinical Research Protocol Template.*?Trust \d{4}\s*/gi,
      "",
    )
    .replace(/CONFIDENTIAL\s*©[^.]+\.\s*/gi, "");
}

/** Fix common PDF extraction artefacts (spaced letters, odd hyphens, bullets). */
export function formatProtocolText(text: string): string {
  let t = stripPageBoilerplate(text);

  const wordFixes: Array<[RegExp, string]> = [
    [/E\s+xclusion\s+c\s+riteria/gi, "Exclusion criteria"],
    [/I\s+n\s*clusion\s+c\s+riteria/gi, "Inclusion criteria"],
    [/fractur\s+e/gi, "fracture"],
    [/p\s+articipants/gi, "participants"],
    [/limit\s+s\b/gi, "limits"],
    [/Conse\s+nt/gi, "Consent"],
    [/s\s+uperiority/gi, "superiority"],
    [/diagnos\s+is/gi, "diagnosis"],
    [/O\s+xford/gi, "Oxford"],
    [/H\s+ospitals/gi, "Hospitals"],
    [/W\s+HiTE/gi, "WHiTE"],
    [/r\s+andomised/gi, "randomised"],
    [/c\s+linical/gi, "clinical"],
  ];

  for (const [pattern, replacement] of wordFixes) {
    t = t.replace(pattern, replacement);
  }

  t = t.replace(/\s+-\s+/g, "-");
  t = t.replace(/[\uF0B7\uF0A7\u2022\u25CF\u25AA]/g, "•");
  t = t.replace(/\s*•\s*/g, "\n• ");
  t = t.replace(/\s+\./g, ".");
  t = t.replace(/\s+(\d+(?:\.\d+)+)\s+([A-Za-z])/g, "\n\n$1 $2");
  t = t.replace(/ {2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

export function sectionFromQuery(query: string): SectionFocus | null {
  const q = query.toLowerCase();
  if (q.includes("exclusion")) return "Exclusion criteria";
  if (q.includes("inclusion")) return "Inclusion criteria";
  if (q.includes("primary") && q.includes("endpoint")) return "Primary endpoint";
  if (q.includes("secondary") && q.includes("endpoint")) return "Secondary endpoint";
  if (q.includes("prohibited")) return "Prohibited medications";
  if (q.includes("randomis")) return "Randomisation";
  if (q.includes("consent")) return "Consent";
  return null;
}

export function extractProtocolSection(
  pageText: string,
  section: SectionFocus | string,
): string | null {
  const config = SECTION_PATTERNS[section as SectionFocus];
  if (!config) return null;

  const cleaned = stripPageBoilerplate(pageText);
  const startMatch = cleaned.match(config.start);
  if (!startMatch || startMatch.index === undefined) return null;

  const from = startMatch.index;
  const rest = cleaned.slice(from);
  const afterHeading = rest.slice(startMatch[0].length);
  const endMatch = afterHeading.match(config.end);

  const raw = endMatch
    ? rest.slice(0, startMatch[0].length + endMatch.index!)
    : rest;

  return formatProtocolText(raw);
}

export function resolveSourceExcerpt(
  pageText: string | undefined,
  chunkText: string,
  section: string,
  query: string,
): string {
  const querySection = sectionFromQuery(query);
  const focus = querySection ?? (section !== "Protocol section" ? section : null);

  if (pageText && focus) {
    const extracted = extractProtocolSection(pageText, focus);
    if (extracted) return extracted;
  }

  if (pageText && section !== "Protocol section") {
    const extracted = extractProtocolSection(pageText, section);
    if (extracted) return extracted;
  }

  return formatProtocolText(chunkText);
}
