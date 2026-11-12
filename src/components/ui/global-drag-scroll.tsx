"use client";

import { useEffect } from "react";

/**
 * GlobalDragScroll
 * Permite arrastar com o mouse (click & drag horizontal) em qualquer tabela
 * ou container com rolagem horizontal em todo o sistema.
 * 
 * Recursos:
 * - Arrasto fluido com o mouse (botão esquerdo).
 * - Inércia suave (momentum) ao soltar.
 * - Detecção inteligente de clique vs arrasto (não dispara links/botões se o usuário arrastou).
 * - Não interfere em inputs, textareas, selects ou campos editáveis.
 * - Feedback visual de cursor (grab / grabbing).
 */
export function GlobalDragScroll() {
  useEffect(() => {
    let activeContainer: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let scrollStartLeft = 0;
    let isMouseDown = false;
    let isDragging = false;
    let lastX = 0;
    let lastTime = 0;
    let velocityX = 0;
    let momentumFrame: number | null = null;
    let startedOnButtonOrLink = false;

    // Elementos interativos onde o arrasto não deve iniciar
    const isTextInput = (target: HTMLElement | null) => {
      if (!target) return false;
      return Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], input[type="range"], [role="slider"]'
        )
      );
    };

    // Encontra o container com scroll horizontal mais próximo
    const findScrollableContainer = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof HTMLElement)) return null;

      let current: HTMLElement | null = target;
      while (current && current !== document.body && current !== document.documentElement) {
        // Ignora elementos com overflow explicitamente oculto
        const style = window.getComputedStyle(current);
        const overflowX = style.overflowX;

        const hasScrollClass =
          current.classList.contains("responsive-table-wrap") ||
          current.classList.contains("table-scroll-container") ||
          current.classList.contains("overflow-x-auto") ||
          current.getAttribute("data-drag-scroll") === "true";

        if (
          hasScrollClass ||
          overflowX === "auto" ||
          overflowX === "scroll"
        ) {
          if (current.scrollWidth > current.clientWidth + 2) {
            return current;
          }
        }

        current = current.parentElement;
      }
      return null;
    };

    // Marca no elemento se ele tem overflow no momento para aplicar o cursor grab
    const handlePointerOver = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      const container = findScrollableContainer(e.target);
      if (container) {
        if (container.scrollWidth > container.clientWidth + 2) {
          container.setAttribute("data-can-drag", "true");
        } else {
          container.removeAttribute("data-can-drag");
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Apenas botão principal (esquerdo) e sem modificadores alt/ctrl
      if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      if (!target || isTextInput(target)) return;

      // Não inicia arrasto se clicar diretamente em barras de rolagem ou botões específicos
      if (target.closest("[data-no-drag-scroll='true']")) return;

      const container = findScrollableContainer(target);
      if (!container) return;

      // Cancela inércia anterior se houver
      if (momentumFrame) {
        cancelAnimationFrame(momentumFrame);
        momentumFrame = null;
      }

      activeContainer = container;
      isMouseDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      scrollStartLeft = container.scrollLeft;
      lastX = e.clientX;
      lastTime = performance.now();
      velocityX = 0;
      startedOnButtonOrLink = Boolean(target.closest("button, a, [role='button']"));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || !activeContainer) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (!isDragging) {
        // Se o movimento for primariamente vertical e acentuado, não sequestra o scroll da página
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          isMouseDown = false;
          return;
        }

        // Limiar para diferenciar clique normal de arrasto
        const threshold = startedOnButtonOrLink ? 7 : 4;
        if (Math.abs(deltaX) >= threshold) {
          isDragging = true;
          document.body.classList.add("dragging-scroll");
          activeContainer.classList.add("is-dragging-scroll");
        }
      }

      if (isDragging) {
        e.preventDefault();
        activeContainer.scrollLeft = scrollStartLeft - deltaX;

        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          const instantV = (e.clientX - lastX) / dt;
          velocityX = 0.65 * velocityX + 0.35 * instantV;
          lastX = e.clientX;
          lastTime = now;
        }
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;

      if (isDragging && activeContainer) {
        const container = activeContainer;
        document.body.classList.remove("dragging-scroll");
        container.classList.remove("is-dragging-scroll");

        // Impede o clique fantasma que o navegador dispara ao soltar o mouse
        const cancelClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        };

        window.addEventListener("click", cancelClick, { capture: true, once: true });
        setTimeout(() => {
          window.removeEventListener("click", cancelClick, { capture: true });
        }, 120);

        // Inércia suave (física de desaceleração)
        if (Math.abs(velocityX) > 0.15) {
          let v = velocityX * 12;
          const friction = 0.93;
          const step = () => {
            if (Math.abs(v) > 0.4 && container) {
              container.scrollLeft -= v;
              v *= friction;
              momentumFrame = requestAnimationFrame(step);
            } else {
              momentumFrame = null;
            }
          };
          momentumFrame = requestAnimationFrame(step);
        }
      }

      isDragging = false;
      activeContainer = null;
    };

    // Suporte aprimorado para Shift + Scroll do mouse ou scroll horizontal natural
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        const target = e.target as HTMLElement | null;
        const container = findScrollableContainer(target);
        if (container) {
          e.preventDefault();
          container.scrollLeft += e.deltaY || e.deltaX;
        }
      }
    };

    window.addEventListener("mouseover", handlePointerOver, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { capture: false });
    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp, { capture: true });
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      if (momentumFrame) cancelAnimationFrame(momentumFrame);
      document.body.classList.remove("dragging-scroll");
      window.removeEventListener("mouseover", handlePointerOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp, { capture: true });
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
