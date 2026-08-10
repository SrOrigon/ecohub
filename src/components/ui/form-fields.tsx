import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-base font-semibold text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--school-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--school-primary)]",
        className
      )}
      {...props}
    />
  );
}
