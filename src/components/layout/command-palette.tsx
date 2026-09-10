"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Coins,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  PenLine,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HudPortal } from "@/components/layout/hud-portal";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navegação" | "Ações Rápidas" | "Acadêmico" | "Gamificação";
  icon: typeof Home;
  href: string;
  roles?: string[];
  shortcut?: string;
};

const ALL_COMMANDS: CommandItem[] = [
  // Navegação
  { id: "nav-home", title: "Painel Principal", category: "Navegação", icon: Home, href: "/dashboard" },
  { id: "nav-student", title: "Meu Painel de Aluno", category: "Navegação", icon: GraduationCap, href: "/dashboard/aluno", roles: ["student"] },
  { id: "nav-teacher", title: "Painel do Professor", category: "Navegação", icon: BookOpen, href: "/dashboard/professor", roles: ["teacher", "director", "admin"] },
  { id: "nav-parent", title: "Área do Responsável", category: "Navegação", icon: Users, href: "/dashboard/responsavel", roles: ["parent", "director", "admin"] },
  { id: "nav-classes", title: "Gerenciar Turmas", category: "Navegação", icon: Users, href: "/dashboard/turmas", roles: ["teacher", "director", "admin", "secretary"] },
  { id: "nav-students", title: "Lista de Alunos", category: "Navegação", icon: GraduationCap, href: "/dashboard/alunos", roles: ["teacher", "director", "admin", "secretary"] },
  { id: "nav-teachers", title: "Corpo Docente", category: "Navegação", icon: Shield, href: "/dashboard/professores", roles: ["director", "admin"] },
  
  // Acadêmico
  { id: "acad-grades", title: "Lançamento de Notas", category: "Acadêmico", icon: CheckCircle2, href: "/dashboard/notas", roles: ["teacher", "director", "admin"] },
  { id: "acad-attendance", title: "Frequência & Chamada", category: "Acadêmico", icon: CheckCircle2, href: "/dashboard/frequencia", roles: ["teacher", "director", "admin"] },
  { id: "acad-exercises", title: "Exercícios & Provas", category: "Acadêmico", icon: PenLine, href: "/dashboard/exercicios" },
  { id: "acad-boletim", title: "Boletim Escolar", category: "Acadêmico", icon: FileText, href: "/dashboard/boletim" },
  { id: "acad-diary", title: "Diário de Classe", category: "Acadêmico", icon: BookOpen, href: "/dashboard/diario", roles: ["teacher", "director", "admin"] },
  { id: "acad-calendar", title: "Agenda & Calendário", category: "Acadêmico", icon: Calendar, href: "/dashboard/calendario" },
  { id: "acad-contracts", title: "Contratos & Matrículas", category: "Acadêmico", icon: FileText, href: "/dashboard/contratos", roles: ["director", "admin", "secretary"] },

  // Gamificação & Loja
  { id: "gam-talents", title: "Árvore de Talentos & Passivas", category: "Gamificação", icon: Sparkles, href: "/dashboard/aluno", roles: ["student"] },
  { id: "gam-flashcards", title: "Revisão com Flashcards", category: "Gamificação", icon: Sparkles, href: "/dashboard/aluno", roles: ["student"] },
  { id: "gam-planner", title: "Planner Semanal com IA", category: "Gamificação", icon: Calendar, href: "/dashboard/aluno", roles: ["student"] },
  { id: "gam-duels", title: "Arena de Duelos 1v1", category: "Gamificação", icon: Sparkles, href: "/dashboard/aluno", roles: ["student"] },
  { id: "gam-focus", title: "Modo Foco & Pomodoro", category: "Gamificação", icon: Sparkles, href: "/dashboard/aluno", roles: ["student"] },
  { id: "gam-shop", title: "Loja de Cosméticos & Prêmios", category: "Gamificação", icon: Coins, href: "/dashboard/loja" },
  { id: "gam-rankings", title: "Rankings & Placares", category: "Gamificação", icon: Trophy, href: "/dashboard/rankings" },
  { id: "gam-goals", title: "Metas Coletivas da Turma", category: "Gamificação", icon: Sparkles, href: "/dashboard/metas-coletivas" },
  { id: "gam-trails", title: "Trilhas de Aprendizagem", category: "Gamificação", icon: Sparkles, href: "/dashboard/trilhas" },

  // Ações Rápidas
  { id: "act-audit", title: "Auditoria & Governança Institucional", category: "Ações Rápidas", icon: Shield, href: "/dashboard/auditoria", roles: ["director", "admin"] },
  { id: "act-create-exercise", title: "Criar Nova Atividade com IA", category: "Ações Rápidas", icon: Sparkles, href: "/dashboard/exercicios", roles: ["teacher", "director", "admin"] },
  { id: "act-teacher-duels", title: "Arena de Duelos da Turma (Liberar em Aula)", category: "Ações Rápidas", icon: Sparkles, href: "/dashboard/professor", roles: ["teacher", "director", "admin"] },
  { id: "act-messages", title: "Mensagens & Comunicados", category: "Ações Rápidas", icon: MessageSquare, href: "/dashboard/comunicados" },
  { id: "act-settings", title: "Configurações da Escola & Perfil", category: "Ações Rápidas", icon: Settings, href: "/dashboard/configuracoes" },
];

export function CommandPalette({ userRole = "student" }: { userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    const roleFiltered = ALL_COMMANDS.filter(
      (cmd) => !cmd.roles || cmd.roles.includes(userRole)
    );
    if (!search.trim()) return roleFiltered;

    const normalized = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return roleFiltered.filter((cmd) => {
      const text = `${cmd.title} ${cmd.category} ${cmd.subtitle ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      return text.includes(normalized);
    });
  }, [userRole, search]);

  function closePalette() {
    setIsOpen(false);
    setSearch("");
    setSelectedIndex(0);
  }

  function handleSelect(item: CommandItem) {
    closePalette();
    router.push(item.href);
  }

  const groupedCommands = useMemo(() => {
    const groups: Array<{ category: CommandItem["category"]; items: CommandItem[] }> = [];
    for (const cmd of filteredCommands) {
      const last = groups[groups.length - 1];
      if (last && last.category === cmd.category) {
        last.items.push(cmd);
      } else {
        groups.push({ category: cmd.category, items: [cmd] });
      }
    }
    return groups;
  }, [filteredCommands]);

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredCommands[selectedIndex]);
    }
  }

  if (!isOpen) return null;

  let commandOffset = 0;

  return (
    <HudPortal>
      <div
        className="fixed inset-0 z-[65] flex items-start justify-center bg-slate-950/50 p-3 pt-[calc(var(--app-header-offset)+0.75rem)] pb-[calc(var(--mobile-nav-offset)+0.5rem)] backdrop-blur-[6px] md:p-6 md:pt-[12vh] md:pb-12"
        onClick={closePalette}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Busca rápida"
          className="command-palette flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5 sm:px-4">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              autoFocus
              placeholder="Buscar páginas e ações..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none ring-0 focus:outline-none focus-visible:outline-none sm:text-[0.9375rem]"
            />
            <button
              type="button"
              onClick={closePalette}
              className="hidden shrink-0 rounded-md border border-[var(--border)] bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] sm:inline-flex"
              aria-label="Fechar busca"
            >
              ESC
            </button>
          </div>

          <div className="max-h-[min(22rem,calc(100dvh-var(--app-header-offset)-var(--mobile-nav-offset)-10rem))] overflow-y-auto px-1.5 py-2 md:max-h-[22rem]">
            {filteredCommands.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
                Nenhum resultado para &ldquo;{search}&rdquo;
              </p>
            ) : (
              groupedCommands.map((group) => {
                const start = commandOffset;
                commandOffset += group.items.length;
                return (
                  <div key={group.category} className="mb-1.5 last:mb-0">
                    <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      {group.category}
                    </p>
                    {group.items.map((cmd, i) => {
                      const index = start + i;
                      const Icon = cmd.icon;
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onClick={() => handleSelect(cmd)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                            isSelected
                              ? "bg-[color:var(--school-primary)] text-white"
                              : "text-[var(--foreground)] hover:bg-[var(--hover)]"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-[var(--school-primary-soft)] text-[color:var(--school-primary)]"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="min-w-0 flex-1 truncate font-medium">{cmd.title}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--hover)] px-4 py-2 text-[11px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono text-[10px]">↓</kbd>
              <span>navegar</span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono text-[10px]">Enter</kbd>
              <span>abrir</span>
            </span>
            <span className="shrink-0 font-medium tracking-wide">Spotlight</span>
          </div>
        </div>
      </div>
    </HudPortal>
  );
}
