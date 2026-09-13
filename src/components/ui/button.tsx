import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ring-offset)] disabled:pointer-events-none disabled:opacity-50 disabled:transform-none cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[color:var(--school-primary)] to-[color:var(--school-primary-hover)] text-white shadow-sm shadow-indigo-500/20 hover:brightness-105 hover:shadow-md hover:shadow-indigo-500/25",
        secondary:
          "border border-[var(--border)] bg-[var(--hover)] text-[var(--foreground)] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs",
        outline:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--hover)] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs",
        soft:
          "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60",
        ghost: "text-[var(--foreground)] hover:bg-[var(--hover)]",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm shadow-red-500/20 hover:from-red-500 hover:to-rose-500",
      },
      size: {
        default: "min-h-11 px-4 py-2 text-base",
        sm: "min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg",
        lg: "min-h-12 px-6 text-lg",
        icon: "min-h-10 min-w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
