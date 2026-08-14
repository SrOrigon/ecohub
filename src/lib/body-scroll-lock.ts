/**
 * Bloqueio de scroll do body com contagem de referências.
 *
 * Modal e menu lateral podem estar abertos ao mesmo tempo. Sem contador, o
 * primeiro a fechar liberaria o scroll enquanto o outro continua aberto.
 */

let lockCount = 0;
let previousOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
}
