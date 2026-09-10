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
        setIsOpen(false);
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

  function handleSelect(item: CommandItem) {
    setIsOpen(false);
    setSearch("");
    router.push(item.href);
  }

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

  return (
    <HudPortal>
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center bg-slate-900/60 p-3 pt-[calc(var(--app-header-offset)+0.5rem)] pb-[calc(var(--mobile-nav-offset)+0.5rem)] backdrop-blur-sm md:p-4 md:pt-24 md:pb-8"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            autoFocus
            placeholder="Digite para buscar páginas, alunos, turmas ou ações..."
            className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          <kbd className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 sm:inline-block dark:bg-slate-800 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[min(20rem,calc(100dvh-var(--app-header-offset)-var(--mobile-nav-offset)-9rem))] overflow-y-auto p-2 md:max-h-80">
          {filteredCommands.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado para &ldquo;{search}&rdquo;</p>
          ) : (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-indigo-600 text-white dark:bg-indigo-600"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{cmd.title}</p>
                    <p className={cn("text-xs", isSelected ? "text-white/80" : "text-slate-400")}>
                      {cmd.category}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
          <span>Navegue com ↑ ↓ e pressione Enter</span>
          <span className="font-mono">Ecohub Spotlight</span>
        </div>
      </div>
    </div>
    </HudPortal>
  );
}
