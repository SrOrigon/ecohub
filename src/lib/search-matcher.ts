/**
 * Utilitário de correspondência inteligente e pontuação de busca para o Eduhub.
 * Evita correspondências falsas por substring (ex: "ana" dentro de "luciana", "allana" ou "luana")
 * e prioriza correspondência de início de palavra, nome exato e limites de palavra em e-mails.
 */

export function normalizeSearchText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export type MatchResult = {
  matches: boolean;
  score: number;
  reason?: string;
};

/**
 * Avalia a correspondência do nome de uma pessoa contra a consulta.
 * Regras:
 * 1. Nome exato -> Score 1000
 * 2. Início do nome completo -> Score 700
 * 3. Token de palavra exata -> Score 500 (ex: "Ana" em "Ana Beatriz" ou "Maria Ana")
 * 4. Início de token de palavra -> Score 400 (ex: "Ana" em "Analu")
 * 5. Se consulta tem múltiplas palavras (ex: "ana beatriz"), cada termo deve corresponder a uma palavra.
 * NUNCA considera substring interna (ex: "ana" dentro de "luciana") como match para buscas curtas (< 4 letras).
 */
export function matchPersonName(fullName?: string | null, query?: string | null): MatchResult {
  const normName = normalizeSearchText(fullName);
  const normQuery = normalizeSearchText(query);

  if (!normName || !normQuery) {
    return { matches: false, score: 0 };
  }

  // 1. Nome exatamente igual
  if (normName === normQuery) {
    return { matches: true, score: 1000, reason: "Nome exato" };
  }

  // 2. Início do nome completo
  if (normName.startsWith(normQuery)) {
    return { matches: true, score: 700, reason: "Início do nome" };
  }

  const nameWords = normName.split(/[\s,./_\-+@0-9]+/).filter(Boolean);
  const queryWords = normQuery.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0) {
    return { matches: false, score: 0 };
  }

  // Se a consulta possui múltiplas palavras
  if (queryWords.length > 1) {
    const allMatch = queryWords.every((qWord) =>
      nameWords.some((nWord) => nWord.startsWith(qWord))
    );
    if (allMatch) {
      return { matches: true, score: 650, reason: "Nome completo" };
    }
    return { matches: false, score: 0 };
  }

  const q = queryWords[0];

  // 3. Qualquer palavra do nome coincide exatamente (ex: "Ana" em "Ana Maria" ou "Beatriz Ana")
  const exactWordMatch = nameWords.some((w) => w === q);
  if (exactWordMatch) {
    return { matches: true, score: 550, reason: "Nome" };
  }

  // 4. Qualquer palavra do nome começa com o termo de busca (ex: "Ana" em "Anastacia")
  const prefixWordMatch = nameWords.some((w) => w.startsWith(q));
  if (prefixWordMatch) {
    return { matches: true, score: 450, reason: "Nome" };
  }

  // 5. Substring interna: SOMENTE permitida se a busca tiver 4 caracteres ou mais
  // Isso impede que buscas como "ana", "lu", "ca" casem com "Luciana", "Allana", "Luana"
  if (q.length >= 4 && normName.includes(q)) {
    return { matches: true, score: 120, reason: "Nome parcial" };
  }

  return { matches: false, score: 0 };
}

/**
 * Avalia correspondência em e-mails.
 * E-mails como "ribeiroluciana137@gmail.com" NÃO devem casar com "ana",
 * pois "luciana" é outro nome.
 * Apenas casa se o nome de usuário do e-mail começar com "ana" (ex: anacarla@...)
 * ou algum segmento separado por ponto/underline/número começar com "ana" (ex: tec.enf.ana.carla@...).
 */
export function matchEmail(email?: string | null, query?: string | null): MatchResult {
  const normEmail = normalizeSearchText(email);
  const normQuery = normalizeSearchText(query);

  if (!normEmail || !normQuery) {
    return { matches: false, score: 0 };
  }

  const localPart = normEmail.split("@")[0] || normEmail;

  // E-mail exato
  if (localPart === normQuery || normEmail === normQuery) {
    return { matches: true, score: 500, reason: "E-mail" };
  }

  // Começa com a query (ex: "anabeatriz@...")
  if (localPart.startsWith(normQuery)) {
    return { matches: true, score: 380, reason: "E-mail" };
  }

  // Segmentos do e-mail separados por delimitadores
  const tokens = localPart.split(/[._\-+0-9]+/).filter(Boolean);

  if (tokens.some((t) => t === normQuery)) {
    return { matches: true, score: 350, reason: "E-mail" };
  }

  if (tokens.some((t) => t.startsWith(normQuery))) {
    return { matches: true, score: 300, reason: "E-mail" };
  }

  // Substring somente se termo longo (>= 5 letras)
  if (normQuery.length >= 5 && localPart.includes(normQuery)) {
    return { matches: true, score: 100, reason: "E-mail" };
  }

  return { matches: false, score: 0 };
}

/**
 * Avalia matrícula ou código de identificação.
 */
export function matchEnrollmentCode(code?: string | null, query?: string | null): MatchResult {
  const normCode = normalizeSearchText(code);
  const normQuery = normalizeSearchText(query);

  if (!normCode || !normQuery) {
    return { matches: false, score: 0 };
  }

  if (normCode === normQuery) {
    return { matches: true, score: 600, reason: "Matrícula exata" };
  }

  if (normCode.includes(normQuery)) {
    return { matches: true, score: 400, reason: "Matrícula" };
  }

  return { matches: false, score: 0 };
}

/**
 * Avalia nome de usuário (@username).
 */
export function matchUsername(username?: string | null, query?: string | null): MatchResult {
  const normUser = normalizeSearchText(username?.replace(/^@/, ""));
  const normQuery = normalizeSearchText(query?.replace(/^@/, ""));

  if (!normUser || !normQuery) {
    return { matches: false, score: 0 };
  }

  if (normUser === normQuery) {
    return { matches: true, score: 550, reason: "Usuário exato" };
  }

  if (normUser.startsWith(normQuery)) {
    return { matches: true, score: 400, reason: "Usuário" };
  }

  const tokens = normUser.split(/[._\-0-9]+/).filter(Boolean);
  if (tokens.some((t) => t.startsWith(normQuery))) {
    return { matches: true, score: 320, reason: "Usuário" };
  }

  return { matches: false, score: 0 };
}

/**
 * Avalia turmas, missões ou textos gerais.
 */
export function matchGeneralText(text?: string | null, query?: string | null, label = "Turma"): MatchResult {
  const normText = normalizeSearchText(text);
  const normQuery = normalizeSearchText(query);

  if (!normText || !normQuery) {
    return { matches: false, score: 0 };
  }

  if (normText === normQuery) {
    return { matches: true, score: 500, reason: label };
  }

  const words = normText.split(/[\s,./_\-+@0-9]+/).filter(Boolean);
  if (words.some((w) => w === normQuery)) {
    return { matches: true, score: 380, reason: label };
  }

  if (words.some((w) => w.startsWith(normQuery))) {
    return { matches: true, score: 320, reason: label };
  }

  if (normQuery.length >= 4 && normText.includes(normQuery)) {
    return { matches: true, score: 150, reason: label };
  }

  return { matches: false, score: 0 };
}
