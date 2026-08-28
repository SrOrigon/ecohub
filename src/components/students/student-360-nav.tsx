import Link from "next/link";
import { cn } from "@/lib/utils";

export const STUDENT_360_TABS = [
  { id: "cadastro", label: "Cadastro", short: "Cadastro" },
  { id: "gamificacao", label: "Gamificação", short: "Game" },
  { id: "academico", label: "Acadêmico", short: "Notas" },
  { id: "financeiro", label: "Financeiro", short: "Financeiro" },
  { id: "frequencia", label: "Frequência", short: "Faltas" },
  { id: "evolucao", label: "Evolução", short: "Evolução" },
  { id: "historico", label: "Histórico", short: "Histórico" },
  { id: "documentos", label: "Documentos", short: "Docs" },
] as const;

export type Student360Tab = (typeof STUDENT_360_TABS)[number]["id"];

export function parseStudent360Tab(value: string | undefined): Student360Tab {
  return STUDENT_360_TABS.some((tab) => tab.id === value) ? (value as Student360Tab) : "cadastro";
}

export function Student360Nav({
  studentId,
  active,
  hiddenTabs = [],
}: {
  studentId: string;
  active: Student360Tab;
  hiddenTabs?: Student360Tab[];
}) {
  const tabs = STUDENT_360_TABS.filter((tab) => !hiddenTabs.includes(tab.id));
  return (
    <nav
      className="sticky top-[var(--app-header-offset)] z-20 -mx-[var(--page-padding,1rem)] border-b border-slate-200 bg-white/95 px-[var(--page-padding,1rem)] backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0"
      aria-label="Perfil 360 do aluno"
    >
      <div className="touch-scroll-x flex gap-1 pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/alunos/${studentId}?aba=${tab.id}`}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors sm:px-4",
              active === tab.id
                ? "border-[color:var(--school-primary,#4f46e5)] text-[color:var(--school-primary,#4f46e5)]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
