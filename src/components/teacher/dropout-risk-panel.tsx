"use client";

import { useState } from "react";
import { AlertTriangle, Bell, BookOpen, ChevronDown, ChevronUp, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  notifyParentDropoutRiskAction,
  createReinforcementPlanAction,
} from "@/actions/learning-diagnostics";
import Link from "next/link";

export interface RiskStudentItem {
  studentId: string;
  studentName: string;
  enrollmentCode: string;
  avatarUrl?: string | null;
  className: string;
  score: number;
  level: string;
  factors: string[];
  recommendedActions?: string[];
  lastRiskAssessment?: Date | null;
}

export function DropoutRiskPanel({
  students,
}: {
  students: RiskStudentItem[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notifyModalStudent, setNotifyModalStudent] = useState<RiskStudentItem | null>(null);
  const [planModalStudent, setPlanModalStudent] = useState<RiskStudentItem | null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; msg: string } | null>(null);

  function getBadgeVariant(level: string): "danger" | "warning" | "secondary" | "success" {
    switch (level) {
      case "CRITICAL":
        return "danger";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "secondary";
      default:
        return "success";
    }
  }

  function getLevelText(level: string) {
    switch (level) {
      case "CRITICAL":
        return "Risco Crítico";
      case "HIGH":
        return "Risco Alto";
      case "MEDIUM":
        return "Risco Médio";
      default:
        return "Risco Baixo";
    }
  }

  async function handleSendNotification() {
    if (!notifyModalStudent) return;
    setIsSubmitting(true);
    try {
      const res = await notifyParentDropoutRiskAction(notifyModalStudent.studentId, customMsg);
      if (res.success) {
        setActionFeedback({ id: notifyModalStudent.studentId, msg: "Responsáveis notificados!" });
        setNotifyModalStudent(null);
        setCustomMsg("");
      } else {
        alert(res.error ?? "Erro ao enviar notificação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreatePlan() {
    if (!planModalStudent) return;
    setIsSubmitting(true);
    try {
      const res = await createReinforcementPlanAction(planModalStudent.studentId, planNotes);
      if (res.success) {
        setActionFeedback({ id: planModalStudent.studentId, msg: "Plano de reforço criado!" });
        setPlanModalStudent(null);
        setPlanNotes("");
      } else {
        alert(res.error ?? "Erro ao criar plano de reforço.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-950 dark:text-amber-100">
          <ShieldAlert className="h-5 w-5 text-red-600" aria-hidden="true" />
          Early Warning System  -  Motor Preditivo Anti-Evasão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {students.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Nenhum aluno em estado de alto ou crítico risco de evasão identificado.
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const isExpanded = expandedId === student.studentId;
              const feedback = actionFeedback?.id === student.studentId ? actionFeedback.msg : null;

              return (
                <div
                  key={student.studentId}
                  className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs dark:border-amber-900/50 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/alunos/${student.studentId}`}
                          className="font-bold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {student.studentName}
                        </Link>
                        <Badge variant={getBadgeVariant(student.level)}>
                          {getLevelText(student.level)} ({student.score} pts)
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {student.className} · Matrícula #{student.enrollmentCode}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotifyModalStudent(student)}
                        className="text-xs text-amber-800 border-amber-300 hover:bg-amber-50"
                      >
                        <Bell className="mr-1 h-3.5 w-3.5 text-amber-600" />
                        Notificar Responsável
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlanModalStudent(student)}
                        className="text-xs text-indigo-800 border-indigo-300 hover:bg-indigo-50"
                      >
                        <BookOpen className="mr-1 h-3.5 w-3.5 text-indigo-600" />
                        Plano de Reforço
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : student.studentId)}
                        className="text-xs text-slate-500"
                      >
                        {isExpanded ? (
                          <>
                            Ocultar fatores <ChevronUp className="ml-1 h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Ver fatores <ChevronDown className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {feedback && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {feedback}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Fatores que impactam o risco de evasão:
                        </p>
                        <ul className="space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400 list-disc">
                          {student.factors.length > 0 ? (
                            student.factors.map((factor, idx) => <li key={idx}>{factor}</li>)
                          ) : (
                            <li>Indicadores em acompanhamento.</li>
                          )}
                        </ul>
                      </div>

                      {student.recommendedActions && student.recommendedActions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                            Ações Recomendadas (Early Warning):
                          </p>
                          <ul className="space-y-1 pl-4 text-xs text-indigo-800 dark:text-indigo-400 list-disc">
                            {student.recommendedActions.map((action, idx) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal Notificar Responsável */}
      <Modal
        open={Boolean(notifyModalStudent)}
        onClose={() => setNotifyModalStudent(null)}
        title={`Notificar Responsável  -  ${notifyModalStudent?.studentName}`}
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Envie uma notificação prioritária aos responsáveis vinculados a {notifyModalStudent?.studentName} solicitando acompanhamento.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensagem personalizada (opcional):
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={3}
              placeholder="Sua mensagem para a família..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNotifyModalStudent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Plano de Reforço */}
      <Modal
        open={Boolean(planModalStudent)}
        onClose={() => setPlanModalStudent(null)}
        title={`Criar Plano de Reforço  -  ${planModalStudent?.studentName}`}
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Defina as orientações e metas pedagógicas de reforço para {planModalStudent?.studentName}.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações e ações recomendadas:
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              placeholder="Ex: Aulas de recuperação em matemática, monitoria presencial nas terças..."
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPlanModalStudent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={isSubmitting || !planNotes.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Salvando..." : "Registrar Plano"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
