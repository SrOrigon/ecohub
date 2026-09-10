"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  GraduationCap,
  Trophy,
  Gift,
  Users,
  PenLine,
  Calendar,
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
      { label: "Arena", href: "/dashboard/aluno#arena-duelos", icon: Swords },
      { label: "Loja", href: "/dashboard/loja", icon: Gift },
      { label: "Rankings", href: "/dashboard/rankings", icon: Trophy },
    ];
  } else if (role === "teacher") {
    items = [
      { label: "Início", href: "/dashboard/professor", icon: Home },
      { label: "Turmas", href: "/dashboard/turmas", icon: Users, matchPrefix: "/dashboard/turmas" },
      { label: "Exercícios", href: "/dashboard/exercicios", icon: PenLine, matchPrefix: "/dashboard/exercicios" },
      { label: "Agenda", href: "/dashboard/agenda", icon: Calendar, matchPrefix: "/dashboard/agenda" },
    ];
  } else if (role === "parent") {
    items = [
      { label: "Início", href: "/dashboard/responsavel", icon: Home },
      { label: "Boletim", href: "/dashboard/boletim", icon: GraduationCap, matchPrefix: "/dashboard/boletim" },
      { label: "Alertas", href: "/dashboard/alertas", icon: Bell, matchPrefix: "/dashboard/alertas" },
    ];
  } else if (role === "secretary") {
    items = [
      { label: "Painel", href: "/dashboard/secretaria", icon: Home },
      { label: "Turmas", href: "/dashboard/turmas", icon: Users, matchPrefix: "/dashboard/turmas" },
      { label: "Alunos", href: "/dashboard/alunos", icon: GraduationCap, matchPrefix: "/dashboard/alunos" },
      { label: "Ajustes", href: "/dashboard/configuracoes", icon: Settings, matchPrefix: "/dashboard/configuracoes" },
    ];
  } else {
    items = [
      { label: "Painel", href: "/dashboard", icon: Home },
      { label: "Turmas", href: "/dashboard/turmas", icon: Users, matchPrefix: "/dashboard/turmas" },
      { label: "Alunos", href: "/dashboard/alunos", icon: GraduationCap, matchPrefix: "/dashboard/alunos" },
      { label: "Ajustes", href: "/dashboard/configuracoes", icon: Settings, matchPrefix: "/dashboard/configuracoes" },
    ];
  }

  return (
    <nav
      aria-label="Navegação móvel principal"
      className="mobile-bottom-nav md:hidden"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const [path, hash] = item.href.split("#");
          const isActive = item.matchPrefix
            ? pathname.startsWith(item.matchPrefix)
            : !hash && pathname === item.href;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={(event) => {
                if (!hash || pathname !== path) return;
                const target = document.getElementById(hash);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center py-0.5 text-center transition-all touch-manipulation active:scale-95",
                isActive
                  ? "font-bold text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-8 items-center justify-center rounded-xl transition-all",
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
