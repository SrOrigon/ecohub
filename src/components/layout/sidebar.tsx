"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Medal,
  NotebookPen,
  Settings,
  Target,
  User,
  Users,
  UserCircle,
  X,
  UserCog,
  Gift,
  Heart,
  Bell,
  PenLine,
  BookMarked,
  Route,
  Megaphone,
  Activity,
  Flag,
  FileText,
  Bot,
  AlertTriangle,
  MessageSquare,
  FileCheck,
  ClipboardPen,
  Clock,
  Shield,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import {
  canAccessNav,
  canSeeExerciciosStaff,
  canSeeGamificacao,
  hasPermission,
  type NavPermission,
} from "@/lib/permissions";
import type { SchoolSettings } from "@/lib/school-settings";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  permission?: NavPermission;
  customCheck?: (role: UserRole, perms: SchoolSettings["permissions"]) => boolean;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, roles: ["admin", "director"] },
  { href: "/dashboard/secretaria", label: "Painel Secretaria", icon: ClipboardPen, roles: ["secretary"] },
  { href: "/dashboard/professor", label: "Minhas Turmas", icon: LayoutDashboard, roles: ["teacher"] },
  { href: "/dashboard/aluno", label: "Meu Perfil", icon: User, roles: ["student"] },
  { href: "/dashboard/boletim", label: "Meu boletim", icon: FileText, roles: ["student"] },
  { href: "/dashboard/responsavel", label: "Meus Filhos", icon: Heart, roles: ["parent"] },
  { href: "/dashboard/assistente", label: "EduHub IA", icon: Bot, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/calendario", label: "Agenda compartilhada", icon: CalendarDays, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/agenda", label: "Minha agenda", icon: NotebookPen, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/turmas", label: "Turmas", icon: GraduationCap, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/professores", label: "Professores", icon: UserCog, roles: ["admin", "director"], permission: "director.manageTeachers" },
  { href: "/dashboard/notas", label: "Notas", icon: BookOpen, roles: ["admin", "director", "secretary", "teacher"], permission: "teacher.createGrades" },
  { href: "/dashboard/frequencia", label: "Frequência", icon: ClipboardList, roles: ["admin", "director", "secretary", "teacher"], permission: "teacher.recordAttendance" },
  { href: "/dashboard/diario", label: "Diário de classe", icon: BookMarked, roles: ["admin", "director", "teacher"], permission: "teacher.manageDiary" },
  { href: "/dashboard/matriculas", label: "Matrículas", icon: FileCheck, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/autorizacoes", label: "Autorizações", icon: ClipboardPen, roles: ["admin", "director", "secretary", "parent"] },
  { href: "/dashboard/documentos", label: "Documentos", icon: FileText, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/mensagens", label: "Mensagens", icon: MessageSquare, roles: ["admin", "director", "secretary", "teacher", "parent"] },
  { href: "/dashboard/alertas", label: "Alertas de risco", icon: AlertTriangle, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/horarios", label: "Horários", icon: Clock, roles: ["admin", "director", "secretary", "teacher"] },
  {
    href: "/dashboard/exercicios",
    label: "Exercícios",
    icon: PenLine,
    roles: ["admin", "director", "teacher", "student"],
    customCheck: (role, perms) => role !== "teacher" || canSeeExerciciosStaff(role, perms),
  },
  {
    href: "/dashboard/gamificacao",
    label: "Gamificação",
    icon: Target,
    roles: ["admin", "director", "teacher"],
    customCheck: (role, perms) => role !== "teacher" || canSeeGamificacao(role, perms),
  },
  {
    href: "/dashboard/loja",
    label: "Loja de Moedas",
    icon: Gift,
    roles: ["admin", "director", "teacher", "student"],
    permission: "teacher.accessShop",
  },
  { href: "/dashboard/responsaveis", label: "Responsáveis", icon: Heart, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "director", "secretary", "teacher"], permission: "teacher.viewReports" },
  { href: "/dashboard/engajamento", label: "Engajamento", icon: Activity, roles: ["admin", "director", "teacher"], permission: "teacher.viewReports" },
  { href: "/dashboard/trilhas", label: "Trilhas", icon: Route, roles: ["admin", "director", "teacher", "student"], permission: "teacher.createTrails" },
  { href: "/dashboard/metas-coletivas", label: "Metas coletivas", icon: Flag, roles: ["admin", "director", "teacher"], permission: "teacher.createClassGoals" },
  { href: "/dashboard/comunicados", label: "Comunicados", icon: Megaphone, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/busca", label: "Busca", icon: BookOpen, roles: ["student", "parent"] },
  { href: "/dashboard/notificacoes", label: "Notificações", icon: Bell, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/perfil", label: "Minha conta", icon: UserCircle, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, roles: ["admin", "director"], permission: "director.editSettings" },
];

function filterNav(
  role: UserRole,
  permissions: SchoolSettings["permissions"],
  features?: { trailsEnabled: boolean }
) {
  return allNavItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.customCheck && !item.customCheck(role, permissions)) return false;
    if (role === "student" && item.href === "/dashboard/loja") {
      return hasPermission(role, permissions, "student.redeemShop");
    }
    if (item.href === "/dashboard/trilhas" && role === "student") {
      return features?.trailsEnabled !== false;
    }
    if (item.permission && role === "teacher") {
      return canAccessNav(role, permissions, item.permission);
    }
    if (item.permission && (role === "director" || role === "secretary")) {
      return canAccessNav(role, permissions, item.permission);
    }
    return true;
  });
}

function NavLinks({
  pathname,
  role,
  permissions,
  features,
  kidFriendly,
  showPlatformAdmin,
  onNavigate,
}: {
  pathname: string;
  role: UserRole;
  permissions: SchoolSettings["permissions"];
  features?: { trailsEnabled: boolean };
  kidFriendly: boolean;
  showPlatformAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const items = filterNav(role, permissions, features);

  return (
    <nav aria-label="Menu principal" className="space-y-1 p-3 sm:p-4">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "nav-link flex items-center gap-3 rounded-xl font-medium transition-colors",
              kidFriendly ? "min-h-12 px-4 py-3 text-base" : "min-h-11 px-3 py-2.5 text-sm",
              active
                ? "bg-[color:var(--school-primary-soft)] text-[color:var(--school-primary)] ring-2 ring-[color:var(--school-primary-ring)]"
                : "nav-link-inactive"
            )}
          >
            <Icon className={cn("shrink-0", kidFriendly ? "h-6 w-6" : "h-5 w-5")} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
      {showPlatformAdmin && (
        <Link
          href="/dashboard/plataforma"
          onClick={onNavigate}
          className={cn(
            "nav-link flex items-center gap-3 rounded-xl font-medium transition-colors",
            kidFriendly ? "min-h-12 px-4 py-3 text-base" : "min-h-11 px-3 py-2.5 text-sm",
            pathname.startsWith("/dashboard/plataforma")
              ? "bg-[color:var(--school-primary-soft)] text-[color:var(--school-primary)] ring-2 ring-[color:var(--school-primary-ring)]"
              : "nav-link-inactive"
          )}
        >
          <Shield className={cn("shrink-0", kidFriendly ? "h-6 w-6" : "h-5 w-5")} aria-hidden="true" />
          <span className="truncate">Plataforma</span>
        </Link>
      )}
    </nav>
  );
}

export function Sidebar({
  pathname,
  userName,
  schoolName,
  schoolSlug,
  role,
  avatarUrl,
  kidFriendly,
  permissions,
  features,
  tagline,
  mobileOpen,
  onMobileOpenChange,
  showPlatformAdmin,
}: {
  pathname: string;
  userName: string;
  schoolName: string;
  schoolSlug?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  kidFriendly: boolean;
  permissions: SchoolSettings["permissions"];
  features?: { trailsEnabled: boolean };
  tagline?: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  showPlatformAdmin?: boolean;
}) {
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => onMobileOpenChange(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-sidebar"
            className="relative flex h-full w-[min(20rem,90vw)] flex-col sidebar-panel shadow-[var(--shadow-md)] safe-area-bottom safe-area-top"
            aria-label="Menu lateral"
          >
            <button
              type="button"
              className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg"
              onClick={() => onMobileOpenChange(false)}
              aria-label="Fechar menu"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
            <SidebarContent
              pathname={pathname}
              userName={userName}
              schoolName={schoolName}
              schoolSlug={schoolSlug}
              role={role}
              avatarUrl={avatarUrl}
              permissions={permissions}
              features={features}
              tagline={tagline}
              kidFriendly={kidFriendly}
              showPlatformAdmin={showPlatformAdmin}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </aside>
        </div>
      )}

      <aside
        className="sidebar-panel hidden h-dvh w-64 shrink-0 flex-col border-r md:flex xl:w-72"
        aria-label="Menu lateral"
      >
        <SidebarContent
          pathname={pathname}
          userName={userName}
          schoolName={schoolName}
          schoolSlug={schoolSlug}
          role={role}
          avatarUrl={avatarUrl}
          permissions={permissions}
          features={features}
          tagline={tagline}
          kidFriendly={kidFriendly}
          showPlatformAdmin={showPlatformAdmin}
        />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  userName,
  schoolName,
  schoolSlug,
  role,
  avatarUrl,
  permissions,
  features,
  tagline,
  kidFriendly,
  showPlatformAdmin,
  onNavigate,
}: {
  pathname: string;
  userName: string;
  schoolName: string;
  schoolSlug?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  permissions: SchoolSettings["permissions"];
  features?: { trailsEnabled: boolean };
  tagline?: string;
  kidFriendly: boolean;
  showPlatformAdmin?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-gradient-to-r from-[color:var(--school-primary-soft)] to-transparent px-4 sm:px-6">
        <Medal className="h-8 w-8 shrink-0 text-[color:var(--school-primary)]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-[var(--foreground)]">EduHub</p>
          <p className="truncate text-sm text-[var(--muted-foreground)]">{ROLE_LABELS[role]}</p>
        </div>
      </div>
      {tagline && (
        <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
          {tagline}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <NavLinks
          pathname={pathname}
          role={role}
          permissions={permissions}
          features={features}
          kidFriendly={kidFriendly}
          showPlatformAdmin={showPlatformAdmin}
          onNavigate={onNavigate}
        />
      </div>
      <div className="shrink-0 border-t border-[var(--border)] p-4">
        <Link
          href="/dashboard/perfil"
          onClick={onNavigate}
          className="mb-3 flex min-h-12 items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--hover)] active:opacity-90"
        >
          <ProfileAvatar name={userName} avatarUrl={avatarUrl} size="sm" className="ring-2" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{userName}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{schoolName}</p>
          </div>
        </Link>
        <form action={logoutAction} className="mt-1">
          {schoolSlug && <input type="hidden" name="tenantSlug" value={schoolSlug} />}
          <Button type="submit" variant="outline" size={kidFriendly ? "lg" : "default"} className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
