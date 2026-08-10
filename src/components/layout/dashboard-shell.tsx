"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SchoolThemeProvider } from "@/components/school/school-theme-provider";
import { isKidFriendlyRole, type UserRole } from "@/lib/constants";
import type { SchoolSettings } from "@/lib/school-settings";

export function DashboardShell({
  children,
  userName,
  schoolName,
  role,
  avatarUrl,
  branding,
  permissions,
  features,
}: {
  children: React.ReactNode;
  userName: string;
  schoolName: string;
  role: UserRole;
  avatarUrl?: string | null;
  branding: SchoolSettings["branding"];
  permissions: SchoolSettings["permissions"];
  features?: { trailsEnabled: boolean };
}) {
  const pathname = usePathname();
  const kidFriendly = isKidFriendlyRole(role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SchoolThemeProvider branding={branding}>
      <div
        className="app-shell"
        data-audience={kidFriendly ? "student" : "staff"}
      >
        <a href="#main-content" className="skip-link">
          Ir para o conteúdo principal
        </a>

        <Sidebar
          pathname={pathname}
          userName={userName}
          schoolName={schoolName}
          role={role}
          avatarUrl={avatarUrl}
          kidFriendly={kidFriendly}
          permissions={permissions}
          features={features}
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
            className="app-main focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </SchoolThemeProvider>
  );
}
