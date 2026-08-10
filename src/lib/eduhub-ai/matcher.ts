/** Normalização para busca sem acentos e case-insensitive. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, " ");
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function scorePatterns(text: string, patterns: RegExp[]): number {
  const n = normalizeText(text);
  let score = 0;
  for (const p of patterns) {
    if (p.test(text) || p.test(n)) score += 3;
  }
  return score;
}

export function scoreKeywords(text: string, keywords: string[]): number {
  const n = normalizeText(text);
  const tokens = new Set(tokenize(text));
  let score = 0;
  for (const kw of keywords) {
    const k = normalizeText(kw);
    if (n.includes(k)) score += k.length > 5 ? 4 : 2;
    for (const t of k.split(/\s+/)) {
      if (tokens.has(t)) score += 1;
    }
  }
  return score;
}

export type Scored<T> = { item: T; score: number };

export function topMatches<T>(
  text: string,
  items: T[],
  scoreFn: (text: string, item: T) => number,
  limit = 3,
  minScore = 2
): Scored<T>[] {
  return items
    .map((item) => ({ item, score: scoreFn(text, item) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
