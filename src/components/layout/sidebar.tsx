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
  Gamepad2,
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
  History,
} from "lucide-react";
import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
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
import type { CreatorJourneySnapshot } from "@/lib/creator-journey";
import { CreatorJourneyProgress } from "@/components/creator/creator-journey-progress";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { useNotificationsOptional } from "@/components/notifications/notifications-provider";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  permission?: NavPermission;
  customCheck?: (role: UserRole, perms: SchoolSettings["permissions"]) => boolean;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard/precisao-disciplinas", label: "Precisão por disciplina", icon: Target, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/historico", label: "Histórico", icon: History, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/leitura-geral", label: "Leitura geral", icon: BarChart3, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, roles: ["admin", "director"] },
  { href: "/dashboard/secretaria", label: "Painel Secretaria", icon: ClipboardPen, roles: ["secretary"] },
  { href: "/dashboard/professor", label: "Minhas Turmas", icon: LayoutDashboard, roles: ["teacher"] },
  { href: "/dashboard/aluno", label: "Meu Perfil", icon: User, roles: ["student"] },
  { href: "/dashboard/boletim", label: "Meu boletim", icon: FileText, roles: ["student"] },
  { href: "/dashboard/projetos", label: "Games e Projetos", icon: Gamepad2, roles: ["student", "teacher", "director", "admin"] },
  { href: "/dashboard/aluno/historico", label: "Meu histórico", icon: History, roles: ["student"] },
  { href: "/dashboard/responsavel", label: "Meus Filhos", icon: Heart, roles: ["parent"] },
  { href: "/dashboard/responsavel/alertas", label: "Alertas de atenção", icon: AlertTriangle, roles: ["parent"] },
  { href: "/dashboard/assistente", label: "Ecohub IA", icon: Bot, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/calendario", label: "Agenda compartilhada", icon: CalendarDays, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/agenda", label: "Minha agenda", icon: NotebookPen, roles: ["admin", "director", "secretary", "teacher", "student", "parent"] },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/turmas", label: "Turmas", icon: GraduationCap, roles: ["admin", "director", "secretary", "teacher"] },
  { href: "/dashboard/disciplinas", label: "Disciplinas", icon: BookMarked, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/professores", label: "Professores", icon: UserCog, roles: ["admin", "director"], permission: "director.manageTeachers" },
  { href: "/dashboard/notas", label: "Notas", icon: BookOpen, roles: ["admin", "director", "secretary", "teacher"], permission: "teacher.createGrades" },
  { href: "/dashboard/frequencia", label: "Frequência", icon: ClipboardList, roles: ["admin", "director", "secretary", "teacher"], permission: "teacher.recordAttendance" },
  { href: "/dashboard/diario", label: "Diário de classe", icon: BookMarked, roles: ["admin", "director", "teacher"], permission: "teacher.manageDiary" },
  { href: "/dashboard/matriculas", label: "Matrículas", icon: FileCheck, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/autorizacoes", label: "Autorizações", icon: ClipboardPen, roles: ["admin", "director", "secretary", "parent"] },
  { href: "/dashboard/contratos", label: "Contratos", icon: FileCheck, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/documentos", label: "Documentos", icon: FileText, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/mensagens", label: "Mensagens", icon: MessageSquare, roles: ["admin", "director", "secretary", "teacher", "parent"] },
  { href: "/dashboard/alertas", label: "Alertas de atenção", icon: AlertTriangle, roles: ["admin", "director", "secretary"] },
  { href: "/dashboard/horarios", label: "Horários", icon: Clock, roles: ["admin", "director", "secretary", "teacher"] },
  {
    href: "/dashboard/exercicios",
    label: "Exercícios",
    icon: PenLine,
    roles: ["admin", "director", "teacher", "student"],
    customCheck: (role, perms) => role !== "teacher" || canSeeExerciciosStaff(role, perms),
  },
  { href: "/dashboard/rankings", label: "Rankings", icon: Medal, roles: ["admin", "director", "secretary", "teacher", "student"] },
  {
    href: "/dashboard/gamificacao",
    label: "Gamificação",
    icon: Target,
    roles: ["admin", "director", "secretary", "teacher"],
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

const NAV_CATEGORIES = [
  {
    title: "Principal",
    hrefs: [
      "/dashboard",
      "/dashboard/professor",
      "/dashboard/aluno",
      "/dashboard/secretaria",
      "/dashboard/responsavel",
      "/dashboard/assistente",
      "/dashboard/agenda",
      "/dashboard/calendario",
    ],
  },
  {
    title: "Acadêmico & Turmas",
    hrefs: [
      "/dashboard/turmas",
      "/dashboard/alunos",
      "/dashboard/professores",
      "/dashboard/responsaveis",
      "/dashboard/disciplinas",
      "/dashboard/notas",
      "/dashboard/frequencia",
      "/dashboard/diario",
      "/dashboard/horarios",
    ],
  },
  {
    title: "Gamificação & Projetos",
    hrefs: [
      "/dashboard/gamificacao",
      "/dashboard/rankings",
      "/dashboard/projetos",
      "/dashboard/loja",
      "/dashboard/exercicios",
      "/dashboard/trilhas",
      "/dashboard/metas-coletivas",
      "/dashboard/engajamento",
      "/dashboard/boletim",
    ],
  },
  {
    title: "Administrativo & Secretaria",
    hrefs: [
      "/dashboard/matriculas",
      "/dashboard/contratos",
      "/dashboard/documentos",
      "/dashboard/autorizacoes",
      "/dashboard/alertas",
      "/dashboard/relatorios",
      "/dashboard/comunicados",
      "/dashboard/mensagens",
      "/dashboard/precisao-disciplinas",
      "/dashboard/leitura-geral",
      "/dashboard/historico",
    ],
  },
  {
    title: "Sistema & Gestão",
    hrefs: [
      "/dashboard/configuracoes",
      "/dashboard/plataforma",
      "/dashboard/notificacoes",
      "/dashboard/perfil",
    ],
  },
];

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
  let items = filterNav(role, permissions, features);
  if (showPlatformAdmin) {
    items = [
      ...items,
      {
        href: "/dashboard/plataforma",
        label: "Plataforma",
        icon: Shield,
        roles: [role],
      },
    ];
  }
  const notifications = useNotificationsOptional();
  const unreadCount = notifications?.unreadCount ?? 0;

  function renderLink(item: NavItem) {
    const { href, label, icon: Icon } = item;
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    const showUnread = href === "/dashboard/notificacoes" && unreadCount > 0;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "nav-link flex items-center gap-3 rounded-xl font-medium transition-all duration-150",
          kidFriendly ? "min-h-12 px-4 py-3 text-base" : "min-h-10 px-3 py-2 text-sm",
          active ? "nav-link-active" : "nav-link-inactive"
        )}
      >
        <Icon className={cn("shrink-0", kidFriendly ? "h-6 w-6" : "h-4.5 w-4.5")} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {showUnread && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  if (kidFriendly) {
    return (
      <nav aria-label="Menu principal" className="space-y-1 px-2 py-3 sm:px-3 sm:py-4">
        {items.map(renderLink)}
      </nav>
    );
  }

  const itemMap = new Map(items.map((i) => [i.href, i]));
  const assignedHrefs = new Set<string>();

  const sections = NAV_CATEGORIES.map((cat) => {
    const catItems = cat.hrefs
      .map((h) => itemMap.get(h))
      .filter((i): i is NavItem => Boolean(i));
    catItems.forEach((i) => assignedHrefs.add(i.href));
    return { title: cat.title, items: catItems };
  }).filter((s) => s.items.length > 0);

  const remainingItems = items.filter((i) => !assignedHrefs.has(i.href));
  if (remainingItems.length > 0) {
    sections.push({ title: "Outros", items: remainingItems });
  }

  return (
    <nav aria-label="Menu principal" className="space-y-4 px-2 py-3 sm:px-3 sm:py-4">
      {sections.map((section, idx) => (
        <div key={section.title} className={cn("space-y-1", idx > 0 && "pt-1")}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map(renderLink)}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarNavRegion({
  children,
}: {
  children: ReactNode;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    const region = regionRef.current;
    if (!el || !region) return;

    const atTop = el.scrollTop <= 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    region.dataset.scrollTop = atTop ? "true" : "false";
    region.dataset.scrollBottom = atBottom ? "true" : "false";
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollHints();

    el.addEventListener("scroll", updateScrollHints, { passive: true });
    const observer = new ResizeObserver(updateScrollHints);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      observer.disconnect();
    };
  }, [updateScrollHints]);

  return (
    <div ref={regionRef} className="sidebar-nav-region" data-scroll-top="true" data-scroll-bottom="true">
      <div ref={scrollRef} className="sidebar-nav-scroll">
        {children}
      </div>
    </div>
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
  creatorJourney,
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
  creatorJourney?: CreatorJourneySnapshot | null;
}) {
  const mobilePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onMobileOpenChange(false);
        return;
      }
      // Sem o trap, o Tab escaparia para o conteúdo atrás do overlay.
      if (e.key !== "Tab" || !mobilePanelRef.current) return;

      const focusable = mobilePanelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileOpenChange]);

  useEffect(() => {
    if (!mobileOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/50 touch-none"
            onClick={() => onMobileOpenChange(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-sidebar"
            ref={mobilePanelRef}
            className="sidebar-panel sidebar-drawer overflow-hidden shadow-[var(--shadow-md)] safe-area-bottom safe-area-top"
            aria-label="Menu lateral"
            role="dialog"
            aria-modal="true"
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
              creatorJourney={creatorJourney}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </aside>
        </div>
      )}

      <aside
        className="sidebar-panel sidebar-panel-desktop min-h-0 shrink-0 flex-col overflow-hidden border-r"
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
          creatorJourney={creatorJourney}
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
  creatorJourney,
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
  creatorJourney?: CreatorJourneySnapshot | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-gradient-to-r from-[color:var(--school-primary-soft)] via-[color:var(--school-primary-soft)]/40 to-transparent px-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm shadow-indigo-500/25">
          <Medal className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold tracking-tight text-[var(--foreground)]">Ecohub</p>
          <span className="inline-block truncate text-[11px] font-semibold text-[color:var(--school-primary)]">
            {ROLE_LABELS[role]}
          </span>
        </div>
      </div>
      {tagline && (
        <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
          {tagline}
        </p>
      )}
      {creatorJourney && creatorJourney.completed < creatorJourney.total && (
        <div className="border-b border-[var(--border-subtle)] px-3 py-3">
          <CreatorJourneyProgress journey={creatorJourney} compact />
        </div>
      )}
      <SidebarNavRegion>
        <NavLinks
          pathname={pathname}
          role={role}
          permissions={permissions}
          features={features}
          kidFriendly={kidFriendly}
          showPlatformAdmin={showPlatformAdmin}
          onNavigate={onNavigate}
        />
      </SidebarNavRegion>
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_-4px_12px_-8px_rgba(15,23,42,0.08)]">
        <Link
          href="/dashboard/perfil"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-2.5 rounded-xl p-2 transition-all hover:bg-[var(--hover)] active:scale-[0.98]"
        >
          <ProfileAvatar name={userName} avatarUrl={avatarUrl} size="sm" className="ring-2 ring-indigo-500/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--foreground)]">{userName}</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">{schoolName}</p>
          </div>
        </Link>
        <form action={logoutAction}>
          {schoolSlug && <input type="hidden" name="tenantSlug" value={schoolSlug} />}
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-8 h-8 rounded-lg"
          >
            Encerrar sessão
          </Button>
        </form>
      </div>
    </div>
  );
}
