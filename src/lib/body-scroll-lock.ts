/**
 * Bloqueio de scroll com contagem de referências.
 *
 * Modal e menu lateral podem estar abertos ao mesmo tempo. Sem contador, o
 * primeiro a fechar liberaria o scroll enquanto o outro continua aberto.
 *
 * O scroll real do dashboard vive em `.app-content`, não no body — por isso
 * também aplicamos a classe `scroll-locked` no `<html>`.
 */

let lockCount = 0;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;

  if (lockCount === 0) {
    document.documentElement.classList.add("scroll-locked");
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount === 0) {
    document.documentElement.classList.remove("scroll-locked");
  }
}
