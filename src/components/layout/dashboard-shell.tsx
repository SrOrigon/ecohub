"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SchoolThemeProvider } from "@/components/school/school-theme-provider";
import { LiveMetricsProvider } from "@/components/metrics/live-metrics-provider";
import { AttentionAlertsProvider } from "@/components/alerts/attention-alerts-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { CreatorJourneyCelebration } from "@/components/creator/creator-journey-celebration";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { isKidFriendlyRole, type UserRole } from "@/lib/constants";
import type { SchoolSettings } from "@/lib/school-settings";

const LIVE_METRICS_ROLES: UserRole[] = ["admin", "director", "teacher", "student", "secretary"];
const ATTENTION_ALERTS_ROLES: UserRole[] = ["parent"];

export function DashboardShell({
  children,
  userName,
  schoolName,
  schoolSlug,
  role,
  avatarUrl,
  branding,
  permissions,
  features,
  showPlatformAdmin,
  creatorJourney,
  schoolId,
}: {
  children: React.ReactNode;
  userName: string;
  schoolName: string;
  schoolSlug?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  branding: SchoolSettings["branding"];
  permissions: SchoolSettings["permissions"];
  features?: { trailsEnabled: boolean };
  showPlatformAdmin?: boolean;
  creatorJourney?: import("@/lib/creator-journey").CreatorJourneySnapshot | null;
  schoolId?: string | null;
}) {
  const pathname = usePathname();
  const kidFriendly = isKidFriendlyRole(role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const needsLiveMetrics = LIVE_METRICS_ROLES.includes(role);
  const needsAttentionAlerts = ATTENTION_ALERTS_ROLES.includes(role);
  const showCreatorJourneyCelebration = ["admin", "director", "teacher"].includes(role);

  const shell = (
        <div
          className="app-shell"
          data-audience={kidFriendly ? "student" : "staff"}
        >
        <CommandPalette userRole={role} />
        {showCreatorJourneyCelebration && (
          <CreatorJourneyCelebration journey={creatorJourney} schoolId={schoolId} />
        )}
        <a href="#main-content" className="skip-link">
          Ir para o conteúdo principal
        </a>

        <Sidebar
          pathname={pathname}
          userName={userName}
          schoolName={schoolName}
          schoolSlug={schoolSlug}
          role={role}
          avatarUrl={avatarUrl}
          kidFriendly={kidFriendly}
          permissions={permissions}
          features={features}
          showPlatformAdmin={showPlatformAdmin}
          creatorJourney={creatorJourney}
          tagline={branding.tagline}
          mobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />

        <div className="app-content">
          <Header
            userName={userName}
            schoolName={schoolName}
            role={role}
            avatarUrl={avatarUrl}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          <main
            id="main-content"
            tabIndex={-1}
            aria-label="Conteúdo principal"
            className="app-main page-stack focus:outline-none pb-24 md:pb-8"
          >
            {children}
          </main>
          <MobileBottomNav role={role} />
        </div>
        </div>
  );

  return (
    <SchoolThemeProvider branding={branding}>
      <NotificationsProvider>
      {needsLiveMetrics ? (
        needsAttentionAlerts ? (
          <LiveMetricsProvider>
            <AttentionAlertsProvider>{shell}</AttentionAlertsProvider>
          </LiveMetricsProvider>
        ) : (
          <LiveMetricsProvider>{shell}</LiveMetricsProvider>
        )
      ) : needsAttentionAlerts ? (
        <AttentionAlertsProvider>{shell}</AttentionAlertsProvider>
      ) : (
        shell
      )}
      </NotificationsProvider>
    </SchoolThemeProvider>
  );
}
