import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-11 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)]",
        className
      )}
      {...props}
    />
  );
}
