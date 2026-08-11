"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { SearchBar } from "@/components/layout/search-bar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LiveConnectionBadge } from "@/components/metrics/live-connection-badge";
import { AttentionAlertBadge } from "@/components/alerts/attention-alerts-panel";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header({
  userName,
  schoolName,
  role,
  avatarUrl,
  onMenuClick,
}: {
  userName: string;
  schoolName: string;
  role: UserRole;
  avatarUrl?: string | null;
  onMenuClick: () => void;
}) {
  const showSearch =
    role === "admin" || role === "director" || role === "teacher" || role === "parent" || role === "student";
  const firstName = userName.split(" ")[0];

  return (
    <header className="header-bar sticky top-0 z-30 border-b safe-area-top">
      <div className="flex min-h-14 items-center gap-2 px-3 py-2 md:gap-3 md:px-4 lg:min-h-16 lg:px-6">
        <button
          type="button"
          className="icon-btn shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          {showSearch ? (
            <>
              <div className="hidden md:block">
                <SearchBar className="max-w-full lg:max-w-md" />
              </div>
              <div className="md:hidden">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{schoolName}</p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">Olá, {firstName}!</p>
              </div>
            </>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)] sm:text-base md:text-lg">
                {schoolName}
              </p>
              <p className="truncate text-xs text-[var(--muted-foreground)] sm:text-sm">Olá, {firstName}!</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {showSearch && (
            <Link href="/dashboard/busca" className="icon-btn md:hidden" aria-label="Abrir busca">
              <Search className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
            </Link>
          )}
          <ThemeToggle compact />
          <LiveConnectionBadge />
          {role === "parent" && <AttentionAlertBadge />}
          <NotificationBell />
            <Badge variant="secondary" className="hidden md:inline-flex">
            {ROLE_LABELS[role]}
          </Badge>
          <Link
            href="/dashboard/perfil"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition hover:opacity-90"
            aria-label="Abrir minha conta"
            title="Minha conta"
          >
            <ProfileAvatar name={userName} avatarUrl={avatarUrl} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
