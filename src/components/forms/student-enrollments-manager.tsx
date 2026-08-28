"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { enrollStudentInClassAction, updateStudentEnrollmentStatusAction } from "@/actions/student-enrollments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-fields";
import { enrollmentStatusLabel } from "@/lib/student-enrollments";

type ClassOption = { id: string; name: string };

type EnrollmentItem = {
  classId: string;
  status: string;
  classGroup: { id: string; name: string; gradeLevel?: string | null };
};

export function StudentEnrollmentsManager({
  studentId,
  enrollments,
  classes,
  compact = false,
}: {
  studentId: string;
  enrollments: EnrollmentItem[];
  classes: ClassOption[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const enrolledClassIds = new Set(enrollments.map((item) => item.classId));
  const availableClasses = classes.filter((item) => !enrolledClassIds.has(item.id));

  function enroll(classId: string) {
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);
    startTransition(async () => {
      await enrollStudentInClassAction(formData);
      router.refresh();
    });
  }

  function updateStatus(classId: string, status: string) {
    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("classId", classId);
    formData.set("status", status);
    startTransition(async () => {
      await updateStudentEnrollmentStatusAction(formData);
      router.refresh();
    });
  }

  const activeEnrollments = enrollments.filter((item) => item.status === "active" || item.status === "locked");

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {activeEnrollments.length === 0 ? (
            <span className="text-sm text-slate-400">Sem turma</span>
          ) : (
            activeEnrollments.map((item) => (
              <Badge key={item.classId} variant="secondary" className="text-xs">
                {item.classGroup.name}
              </Badge>
            ))
          )}
        </div>
        {availableClasses.length > 0 && (
          <Select
            value=""
            disabled={pending}
            aria-label="Adicionar turma ou curso"
            onChange={(event) => {
              const classId = event.target.value;
              if (classId) enroll(classId);
            }}
            className="min-w-[10rem] text-sm"
          >
            <option value="">+ Adicionar turma</option>
            {availableClasses.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {enrollments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma turma ou curso vinculado a este aluno.</p>
        ) : (
          enrollments.map((item) => (
            <div
              key={item.classId}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.classGroup.name}</p>
                <p className="text-xs text-slate-500">
                  {item.classGroup.gradeLevel ? `${item.classGroup.gradeLevel} · ` : ""}
                  {enrollmentStatusLabel(item.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status !== "active" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => updateStatus(item.classId, "active")}
                  >
                    Reativar
                  </Button>
                )}
                {item.status === "active" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => updateStatus(item.classId, "locked")}
                    >
                      Trancar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => updateStatus(item.classId, "ended")}
                    >
                      Encerrar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={pending}
                      onClick={() => updateStatus(item.classId, "cancelled")}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {availableClasses.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const classId = new FormData(form).get("classId");
            if (typeof classId === "string" && classId) enroll(classId);
          }}
        >
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor={`add-class-${studentId}`}>Matricular em nova turma / curso</Label>
            <Select id={`add-class-${studentId}`} name="classId" required disabled={pending}>
              <option value="">Selecione...</option>
              {availableClasses.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Matricular"}
          </Button>
        </form>
      )}
    </div>
  );
}
