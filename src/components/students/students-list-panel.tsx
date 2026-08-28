"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { UserIdentity } from "@/components/profile/user-identity";
import { StudentEnrollmentsManager } from "@/components/forms/student-enrollments-manager";
import { DeleteStudentButton } from "@/components/forms/delete-student-button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export type StudentListRow = {
  id: string;
  enrollmentCode: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  coins: number;
  average: number | null;
  enrollments: Array<{
    classId: string;
    status: string;
    classGroup: { id: string; name: string; gradeLevel?: string | null };
  }>;
};

type ClassOption = { id: string; name: string };

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function matchesStudent(row: StudentListRow, query: string) {
  if (!query) return true;
  const normalized = normalizeSearch(query);
  return (
    normalizeSearch(row.fullName).includes(normalized) ||
    normalizeSearch(row.enrollmentCode).includes(normalized) ||
    normalizeSearch(row.email ?? "").includes(normalized)
  );
}

export function StudentsListPanel({
  students,
  classes,
  canManage,
  canDeleteStudents,
}: {
  students: StudentListRow[];
  classes: ClassOption[];
  canManage: boolean;
  canDeleteStudents: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filteredStudents = useMemo(
    () => students.filter((student) => matchesStudent(student, query)),
    [students, query]
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages - 1);
  const pageStudents = filteredStudents.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const rangeStart = filteredStudents.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filteredStudents.length, (currentPage + 1) * PAGE_SIZE);

  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum aluno cadastrado"
        description="Cadastre o primeiro aluno e depois associe-o a uma turma ou curso."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="student-list-search" className="sr-only">
            Buscar aluno por nome, matrícula ou e-mail
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <Input
            id="student-list-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, matrícula ou e-mail..."
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <p className="shrink-0 text-sm text-slate-500">
          {query.trim() ? (
            <>
              {filteredStudents.length} de {students.length} aluno
              {students.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              Mostrando {rangeStart}–{rangeEnd} de {students.length}
            </>
          )}
        </p>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum aluno encontrado"
          description={`Não há resultados para "${query.trim()}". Tente outro nome, matrícula ou e-mail.`}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <ResponsiveTable minWidth="36rem" className="[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-white">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 shadow-sm">
                  <th className="pb-3 pl-4 pr-4 pt-3">Matrícula</th>
                  <th className="pb-3 pr-4 pt-3">Nome</th>
                  <th className="hidden pb-3 pr-4 pt-3 md:table-cell">E-mail</th>
                  <th className="pb-3 pr-4 pt-3">Turmas / cursos</th>
                  <th className="pb-3 pr-4 pt-3">Média</th>
                  <th className="pb-3 pr-4 pt-3">Nível</th>
                  <th className="hidden pb-3 pr-4 pt-3 lg:table-cell">XP</th>
                  <th className="pb-3 pr-4 pt-3">Moedas</th>
                  {canDeleteStudents && <th className="pb-3 pr-4 pt-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pl-4 pr-4 font-mono text-xs">{student.enrollmentCode}</td>
                    <td className="max-w-[14rem] py-3 pr-4 sm:max-w-none">
                      <UserIdentity
                        name={student.fullName}
                        avatarUrl={student.avatarUrl}
                        href={`/dashboard/alunos/${student.id}`}
                        size="xs"
                      />
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">
                      {student.email ?? "-"}
                    </td>
                    <td className="max-w-[20rem] py-3 pr-4">
                      {canManage ? (
                        <StudentEnrollmentsManager
                          studentId={student.id}
                          enrollments={student.enrollments}
                          classes={classes}
                          compact
                        />
                      ) : (
                        <span className="text-sm text-slate-600">
                          {student.enrollments.map((item) => item.classGroup.name).join(", ") || "Sem turma"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {student.average !== null && !Number.isNaN(student.average)
                        ? student.average.toFixed(1)
                        : "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge>Nv. {student.level}</Badge>
                    </td>
                    <td className="hidden py-3 pr-4 text-indigo-600 lg:table-cell">
                      {student.xpTotal.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 pr-4 text-amber-600">{student.coins}</td>
                    {canDeleteStudents && (
                      <td className="py-3 pr-4">
                        <DeleteStudentButton studentId={student.id} studentName={student.fullName} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </ResponsiveTable>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página {currentPage + 1} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Ir para página ${index + 1}`}
                      aria-current={index === currentPage ? "page" : undefined}
                      onClick={() => setPage(index)}
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
                        index === currentPage
                          ? "bg-[color:var(--school-primary)] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
