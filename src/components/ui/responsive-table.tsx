import { cn } from "@/lib/utils";

export function ResponsiveTable({
  children,
  className,
  minWidth = "36rem",
  caption,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
  caption?: string;
}) {
  return (
    <div className="responsive-table-wrap min-w-0">
      <table
        className={cn("responsive-table text-sm", className)}
        style={{ minWidth }}
      >
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        {children}
      </table>
    </div>
  );
}
