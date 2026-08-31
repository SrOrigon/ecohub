"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  GraduationCap,
  Sparkles,
  Trophy,
  Gift,
  User,
  Users,
  BookOpen,
  PenLine,
  Calendar,
  Shield,
  Settings,
  Bell,
  Swords,
} from "lucide-react";
import { type UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefix?: string;
};

export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  let items: NavItem[] = [];

  if (role === "student") {
    items = [
      { label: "Início", href: "/dashboard/aluno", icon: Home },
      { label: "Arena", href: "/dashboard/aluno", icon: Swords },
      { label: "Loja", href: "/dashboard/loja", icon: Gift },
      { label: "Rankings", href: "/dashboard/rankings", icon: Trophy },
      { label: "Perfil", href: "/dashboard/perfil", icon: User },
    ];
  } else if (role === "teacher") {
    items = [
      { label: "Início", href: "/dashboard/professor", icon: Home },
      { label: "Turmas", href: "/dashboard/turmas", icon: Users, matchPrefix: "/dashboard/turmas" },
      { label: "Exercícios", href: "/dashboard/exercicios", icon: PenLine, matchPrefix: "/dashboard/exercicios" },
      { label: "Agenda", href: "/dashboard/agenda", icon: Calendar, matchPrefix: "/dashboard/agenda" },
      { label: "Perfil", href: "/dashboard/perfil", icon: User },
    ];
  } else if (role === "parent") {
    items = [
      { label: "Início", href: "/dashboard/responsavel", icon: Home },
      { label: "Boletim", href: "/dashboard/boletim", icon: GraduationCap, matchPrefix: "/dashboard/boletim" },
      { label: "Alertas", href: "/dashboard/alertas", icon: Bell, matchPrefix: "/dashboard/alertas" },
      { label: "Perfil", href: "/dashboard/perfil", icon: User },
    ];
  } else {
    // director, admin, secretary
    items = [
      { label: "Painel", href: "/dashboard", icon: Home },
      { label: "Turmas", href: "/dashboard/turmas", icon: Users, matchPrefix: "/dashboard/turmas" },
      { label: "Auditoria", href: "/dashboard/auditoria", icon: Shield, matchPrefix: "/dashboard/auditoria" },
      { label: "Ajustes", href: "/dashboard/configuracoes", icon: Settings, matchPrefix: "/dashboard/configuracoes" },
      { label: "Perfil", href: "/dashboard/perfil", icon: User },
    ];
  }

  return (
    <nav
      aria-label="Navegação móvel principal"
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-lg md:hidden dark:border-slate-800/90 dark:bg-slate-950/95"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefix
            ? pathname.startsWith(item.matchPrefix)
            : pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 text-center transition-all touch-manipulation active:scale-95",
                isActive
                  ? "font-bold text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-indigo-50 shadow-sm dark:bg-indigo-950/70"
                    : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"
                  )}
                  aria-hidden="true"
                />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
