import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

export function UserIdentity({
  name,
  avatarUrl,
  href,
  subtitle,
  size = "sm",
  className,
  vertical = false,
}: {
  name: string;
  avatarUrl?: string | null;
  href?: string;
  subtitle?: string;
  size?: Size;
  className?: string;
  vertical?: boolean;
}) {
  const nameEl = href ? (
    <Link href={href} className="block truncate font-medium text-indigo-600 hover:underline dark:text-indigo-400">
      {name}
    </Link>
  ) : (
    <span className="block truncate font-medium text-[var(--foreground)]">{name}</span>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        vertical && "flex-col text-center",
        className
      )}
    >
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={size}
        className={cn("shrink-0", size === "xs" && "ring-1", size !== "xs" && "ring-2")}
      />
      <div className={cn("min-w-0 overflow-hidden", vertical ? "w-full" : "flex-1")}>
        {nameEl}
        {subtitle && (
          <p className={cn("truncate text-xs text-slate-500", !vertical && "mt-0.5")}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
