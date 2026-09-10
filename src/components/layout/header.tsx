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
import { SoundToggle } from "@/components/theme/sound-toggle";

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

  function openSpotlight() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  return (
    <header className="header-bar sticky top-0 z-40 border-b safe-area-top">
      <div className="flex h-14 items-center gap-1.5 px-2 sm:gap-2 sm:px-3 md:h-16 md:gap-3 md:px-4 lg:px-6">
        <button
          type="button"
          className="icon-btn shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-3">
          {showSearch ? (
            <>
              <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
                <SearchBar className="w-full" />
                <button
                  type="button"
                  onClick={openSpotlight}
                  className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  title="Busca global rápida"
                >
                  <span>Buscar</span>
                  <kbd className="rounded bg-white px-1 font-mono text-[10px] shadow-sm dark:bg-slate-800">
                    ⌘K
                  </kbd>
                </button>
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

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          {showSearch && (
            <button
              type="button"
              onClick={openSpotlight}
              className="icon-btn md:hidden"
              aria-label="Abrir busca rápida"
            >
              <Search className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
            </button>
          )}
          <SoundToggle className="hidden sm:flex" />
          <ThemeToggle compact className="shrink-0" />
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
