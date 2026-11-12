"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
  caption?: string;
  showScrollButtons?: boolean;
  showDragHint?: boolean;
}

export function ResponsiveTable({
  children,
  className,
  minWidth = "36rem",
  caption,
  showScrollButtons = true,
  showDragHint = true,
}: ResponsiveTableProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const overflow = maxScroll > 4;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && el.scrollLeft > 4);
    setCanScrollRight(overflow && el.scrollLeft < maxScroll - 4);

    if (overflow) {
      el.setAttribute("data-can-drag", "true");
    } else {
      el.removeAttribute("data-can-drag");
    }
  }, []);

  useEffect(() => {
    updateScrollState();

    const el = wrapRef.current;
    if (!el) return;

    // Monitora mudanças no tamanho da tabela ou da janela
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateScrollState();
      });
      ro.observe(el);
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild);
      }
    }

    window.addEventListener("resize", updateScrollState);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const handleScrollBy = (distance: number) => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  return (
    <div className="responsive-table-container relative group/table w-full max-w-full">
      {/* Botão de rolagem manual à esquerda */}
      {showScrollButtons && hasOverflow && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollBy(-280)}
          onMouseDown={(e) => e.stopPropagation()}
          data-no-drag-scroll="true"
          aria-label="Rolar tabela para a esquerda"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Botão de rolagem manual à direita */}
      {showScrollButtons && hasOverflow && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollBy(280)}
          onMouseDown={(e) => e.stopPropagation()}
          data-no-drag-scroll="true"
          aria-label="Rolar tabela para a direita"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Sombra de gradiente indicadora à esquerda */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent dark:from-black/30 rounded-l-[0.875rem] z-10 transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Sombra de gradiente indicadora à direita */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent dark:from-black/30 rounded-r-[0.875rem] z-10 transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Dica visual discreta ao passar o mouse quando há overflow */}
      {showDragHint && hasOverflow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-3 z-10 hidden sm:flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-xs backdrop-blur-xs opacity-0 transition-opacity duration-200 group-hover/table:opacity-100 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400"
        >
          <MoveHorizontal className="h-3 w-3 text-indigo-500" />
          <span>Arraste para os lados</span>
        </div>
      )}

      {/* Container com rolagem horizontal e suporte a arrasto com mouse */}
      <div
        ref={wrapRef}
        onScroll={updateScrollState}
        data-drag-scroll="true"
        className="responsive-table-wrap min-w-0"
      >
        <table
          className={cn("responsive-table text-sm", className)}
          style={{ minWidth }}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          {children}
        </table>
      </div>
    </div>
  );
}
