import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-indigo-200/70 bg-indigo-50/90 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-300",
        success:
          "border border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300",
        warning:
          "border border-amber-200/70 bg-amber-50/90 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300",
        danger:
          "border border-red-200/70 bg-red-50/90 text-red-700 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300",
        secondary:
          "border border-slate-200/80 bg-slate-100/90 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300",
        purple:
          "border border-purple-200/70 bg-purple-50/90 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/60 dark:text-purple-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
