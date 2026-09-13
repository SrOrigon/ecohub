import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold tracking-tight text-[var(--foreground)] sm:text-sm",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm leading-normal text-[var(--foreground)] shadow-2xs transition-all duration-150 focus-visible:outline-none focus-visible:border-[color:var(--focus-ring)] focus-visible:ring-3 focus-visible:ring-[color:var(--school-primary-ring)]/40",
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
        "flex min-h-[88px] w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--foreground)] shadow-2xs transition-all duration-150 placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:border-[color:var(--focus-ring)] focus-visible:ring-3 focus-visible:ring-[color:var(--school-primary-ring)]/40",
        className
      )}
      {...props}
    />
  );
}
