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
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md safe-area-top transition-colors shadow-2xs">
      <div className="flex h-14 items-center gap-1.5 px-2 sm:gap-2 sm:px-3 md:h-16 md:gap-3 md:px-4 lg:px-6">
        <button
          type="button"
          className="icon-btn shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          {showSearch ? (
            <>
              <div className="hidden md:flex max-w-lg flex-1 items-center">
                <SearchBar className="w-full" />
              </div>
              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
                  Olá, {firstName}
                </p>
                <p className="truncate text-[11px] leading-tight text-[var(--muted-foreground)]" title={schoolName}>
                  {schoolName}
                </p>
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

        <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1.5">
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
          <ThemeToggle compact className="theme-toggle-btn shrink-0" />
          <LiveConnectionBadge />
          {role === "parent" && <AttentionAlertBadge />}
          <NotificationBell />
          <Badge variant="secondary" className="hidden md:inline-flex">
            {ROLE_LABELS[role]}
          </Badge>
          <Link
            href="/dashboard/perfil"
            className="header-avatar-link flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition hover:opacity-90"
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
