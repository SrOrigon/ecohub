"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScrollablePickerOption = {
  value: string;
  label: string;
};

type ScrollablePickerProps = {
  options: ScrollablePickerOption[];
  placeholder: string;
  value?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
  className?: string;
  listClassName?: string;
  /** Abre a lista acima do botão (útil em linhas de tabela no fim da página). */
  placement?: "bottom" | "top";
  "aria-label"?: string;
};

export function ScrollablePicker({
  options,
  placeholder,
  value = "",
  disabled,
  onSelect,
  className,
  listClassName,
  placement = "bottom",
  "aria-label": ariaLabel,
}: ScrollablePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedLabel = options.find((item) => item.value === value)?.label;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-left text-sm text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--school-primary)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn("min-w-0 truncate", !selectedLabel && "text-slate-500")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-50 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
            "dark:border-slate-700 dark:bg-slate-900",
            listClassName
          )}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Nenhuma opção disponível</li>
          ) : (
            options.map((option) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none",
                    value === option.value && "bg-indigo-50 font-medium text-indigo-900",
                    "dark:text-slate-100 dark:hover:bg-slate-800"
                  )}
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
