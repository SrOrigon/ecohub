const PREFIX = "ecohub-sao:";
export const SAO_CELEBRATION_EVENT = "ecohub-sao-celebrate";

export function saoCelebrationKey(scope: "exercise" | "homeTask", id: string) {
  return `${scope}:${id}`;
}

/** Marca celebração pendente (sobrevive a remount do RSC após server action). */
export function markSaoCelebration(key: string) {
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, String(Date.now()));
    window.dispatchEvent(new CustomEvent(SAO_CELEBRATION_EVENT, { detail: key }));
  } catch {
    /* storage indisponível */
  }
}

export function hasSaoCelebration(key: string): boolean {
  try {
    return sessionStorage.getItem(`${PREFIX}${key}`) != null;
  } catch {
    return false;
  }
}

export function clearSaoCelebration(key: string) {
  try {
    sessionStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    /* storage indisponível */
  }
}
