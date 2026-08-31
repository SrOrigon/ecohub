import { cn } from "@/lib/utils";
import { layout } from "@/lib/layout-classes";

/**
 * Wrapper opcional para páginas do dashboard.
 * Garante espaçamento e min-width seguros em qualquer viewport.
 */
export function PageContainer({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Remove limite de largura útil (relatórios/tabelas densas) */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        layout.pageStack,
        "min-w-0",
        wide && "max-w-none",
        className
      )}
    >
      {children}
    </div>
  );
}
