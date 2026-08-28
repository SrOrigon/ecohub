"use client";

import { useActionState, useState } from "react";
import { updateSchoolSettingsAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SchoolSettings } from "@/lib/school-settings";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function SchoolRulesForm({ initial }: { initial: SchoolSettings }) {
  const [settings, setSettings] = useState<SchoolSettings>(initial);
  const [tab, setTab] = useState<
    "xp" | "academic" | "notify" | "exercises" | "shop" | "calendar" | "branding" | "permissions"
  >("xp");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("settingsJson", JSON.stringify(settings));
      return await updateSchoolSettingsAction(formData);
    },
    null
  );

  const tabs = [
    { id: "xp" as const, label: "XP e missões" },
    { id: "academic" as const, label: "Acadêmico" },
    { id: "calendar" as const, label: "Calendário" },
    { id: "branding" as const, label: "Visual" },
    { id: "permissions" as const, label: "Permissões" },
    { id: "notify" as const, label: "Notificações" },
    { id: "exercises" as const, label: "Exercícios" },
    { id: "shop" as const, label: "Loja" },
  ];

  const weekdayOptions = [
    { v: 0, l: "Dom" },
    { v: 1, l: "Seg" },
    { v: 2, l: "Ter" },
    { v: 3, l: "Qua" },
    { v: 4, l: "Qui" },
    { v: 5, l: "Sex" },
    { v: 6, l: "Sáb" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras da escola</CardTitle>
        <p className="text-sm text-slate-500">
          Tudo aqui alimenta notas, frequência, exercícios, missões, loja e alertas  -  uma engrenagem só.
        </p>
      </CardHeader>
      <CardContent>
        <div className="touch-scroll-x mb-4 flex gap-2 pb-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium min-h-11 ${
                tab === t.id
                  ? "bg-[color:var(--school-primary)] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form action={formAction} className="space-y-4">
          {tab === "xp" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="perGradePoint">XP por ponto de nota</Label>
                <Input
                  id="perGradePoint"
                  type="number"
                  value={settings.xp.perGradePoint}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, perGradePoint: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="gradeBonusThreshold">Nota para bônus</Label>
                <Input
                  id="gradeBonusThreshold"
                  type="number"
                  step="0.1"
                  value={settings.xp.gradeBonusThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, gradeBonusThreshold: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="gradeBonus">XP bônus de nota alta</Label>
                <Input
                  id="gradeBonus"
                  type="number"
                  value={settings.xp.gradeBonus}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, gradeBonus: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="attendancePresent">XP presença</Label>
                <Input
                  id="attendancePresent"
                  type="number"
                  value={settings.xp.attendancePresent}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, attendancePresent: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="attendanceLate">XP atraso</Label>
                <Input
                  id="attendanceLate"
                  type="number"
                  value={settings.xp.attendanceLate}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, attendanceLate: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="xpPerLevel">XP por nível</Label>
                <Input
                  id="xpPerLevel"
                  type="number"
                  value={settings.xp.xpPerLevel}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, xpPerLevel: Number(e.target.value) || 300 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="badgeUnlock">XP ao ganhar badge</Label>
                <Input
                  id="badgeUnlock"
                  type="number"
                  value={settings.xp.badgeUnlock}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      xp: { ...s.xp, badgeUnlock: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="missionXp">XP padrão de missão</Label>
                <Input
                  id="missionXp"
                  type="number"
                  value={settings.missions.defaultXp}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      missions: { ...s.missions, defaultXp: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="missionCoins">Moedas padrão de missão</Label>
                <Input
                  id="missionCoins"
                  type="number"
                  value={settings.missions.defaultCoins}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      missions: { ...s.missions, defaultCoins: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </div>
            </div>
          )}

          {tab === "academic" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="maxGrade">Nota máxima</Label>
                  <Input
                    id="maxGrade"
                    type="number"
                    step="0.5"
                    value={settings.academic.maxGrade}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        academic: { ...s.academic, maxGrade: Number(e.target.value) || 10 },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="passGrade">Nota de aprovação (UI)</Label>
                  <Input
                    id="passGrade"
                    type="number"
                    step="0.5"
                    value={settings.academic.passGrade}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        academic: { ...s.academic, passGrade: Number(e.target.value) || 7 },
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="subjects">Disciplinas da instituição</Label>
                <p className="mb-2 text-sm text-slate-600">
                  Gerencie a lista completa em{" "}
                  <a href="/dashboard/disciplinas" className="font-medium text-[color:var(--school-primary)] hover:underline">
                    Disciplinas
                  </a>
                  . Notas, horários, diário e exercícios usam somente essa lista.
                </p>
                {settings.academic.subjects.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Nenhuma disciplina cadastrada ainda.
                  </p>
                ) : (
                  <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    {settings.academic.subjects.map((subject) => (
                      <li key={subject}>{subject}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label htmlFor="periods">Períodos (um por linha)</Label>
                <Textarea
                  id="periods"
                  rows={4}
                  value={settings.academic.periods.join("\n")}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      academic: {
                        ...s.academic,
                        periods: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </div>
            </div>
          )}

          {tab === "notify" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={settings.notifications.parentsOnGrade}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnGrade: v },
                  }))
                }
                label="Avisar pais sobre notas"
              />
              <Toggle
                checked={settings.notifications.parentsOnAbsence}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnAbsence: v },
                  }))
                }
                label="Avisar pais sobre faltas/atrasos"
              />
              <Toggle
                checked={settings.notifications.studentOnAbsence}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, studentOnAbsence: v },
                  }))
                }
                label="Avisar aluno sobre falta"
              />
              <Toggle
                checked={settings.notifications.parentsOnMission}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnMission: v },
                  }))
                }
                label="Avisar pais sobre missões"
              />
              <Toggle
                checked={settings.notifications.parentsOnExercise}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnExercise: v },
                  }))
                }
                label="Avisar pais sobre novos exercícios"
              />
              <Toggle
                checked={settings.notifications.parentsOnExerciseGraded}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnExerciseGraded: v },
                  }))
                }
                label="Avisar pais quando exercício for corrigido"
              />
              <Toggle
                checked={settings.notifications.parentsOnShop}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, parentsOnShop: v },
                  }))
                }
                label="Avisar pais sobre resgates na loja"
              />
              <Toggle
                checked={settings.notifications.teacherOnSubmission}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, teacherOnSubmission: v },
                  }))
                }
                label="Avisar professor em novas entregas"
              />
            </div>
          )}

          {tab === "exercises" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  checked={settings.exercises.autoGradeEnabled}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      exercises: { ...s.exercises, autoGradeEnabled: v },
                    }))
                  }
                  label="Auto-corrigir quiz de múltipla escolha"
                  description="XP e moedas na hora quando todas as questões forem objetivas"
                />
                <Toggle
                  checked={settings.exercises.postGradeToBulletin}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      exercises: { ...s.exercises, postGradeToBulletin: v },
                    }))
                  }
                  label="Lançar nota do exercício no boletim"
                  description="Cria registro de nota ao corrigir"
                />
              </div>
              <p className="text-sm text-slate-600">Presets do wizard (rótulo · XP · moedas · pontos):</p>
              {settings.exercises.presets.map((p, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    value={p.label}
                    onChange={(e) =>
                      setSettings((s) => {
                        const presets = [...s.exercises.presets];
                        presets[i] = { ...presets[i], label: e.target.value };
                        return { ...s, exercises: { ...s.exercises, presets } };
                      })
                    }
                    aria-label="Rótulo do preset"
                  />
                  <Input
                    type="number"
                    value={p.xp}
                    onChange={(e) =>
                      setSettings((s) => {
                        const presets = [...s.exercises.presets];
                        presets[i] = { ...presets[i], xp: Number(e.target.value) || 0 };
                        return { ...s, exercises: { ...s.exercises, presets } };
                      })
                    }
                    aria-label="XP"
                  />
                  <Input
                    type="number"
                    value={p.coins}
                    onChange={(e) =>
                      setSettings((s) => {
                        const presets = [...s.exercises.presets];
                        presets[i] = { ...presets[i], coins: Number(e.target.value) || 0 };
                        return { ...s, exercises: { ...s.exercises, presets } };
                      })
                    }
                    aria-label="Moedas"
                  />
                  <Input
                    type="number"
                    value={p.points}
                    onChange={(e) =>
                      setSettings((s) => {
                        const presets = [...s.exercises.presets];
                        presets[i] = { ...presets[i], points: Number(e.target.value) || 0 };
                        return { ...s, exercises: { ...s.exercises, presets } };
                      })
                    }
                    aria-label="Pontos"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === "calendar" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="yearStart">Início do ano letivo</Label>
                  <Input
                    id="yearStart"
                    type="date"
                    value={settings.calendar.yearStart.slice(0, 10)}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        calendar: { ...s.calendar, yearStart: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="yearEnd">Fim do ano letivo</Label>
                  <Input
                    id="yearEnd"
                    type="date"
                    value={settings.calendar.yearEnd.slice(0, 10)}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        calendar: { ...s.calendar, yearEnd: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="classStart">Início das aulas</Label>
                  <Input
                    id="classStart"
                    type="time"
                    value={settings.calendar.classStartTime}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        calendar: { ...s.calendar, classStartTime: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="classEnd">Fim das aulas</Label>
                  <Input
                    id="classEnd"
                    type="time"
                    value={settings.calendar.classEndTime}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        calendar: { ...s.calendar, classEndTime: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Dias com aula</p>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((d) => (
                    <label key={d.v} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={settings.calendar.schoolDays.includes(d.v)}
                        onChange={(e) =>
                          setSettings((s) => {
                            const days = e.target.checked
                              ? [...s.calendar.schoolDays, d.v]
                              : s.calendar.schoolDays.filter((x) => x !== d.v);
                            return { ...s, calendar: { ...s.calendar, schoolDays: days } };
                          })
                        }
                      />
                      {d.l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="holidays">Feriados (data|nome, um por linha)</Label>
                <Textarea
                  id="holidays"
                  rows={4}
                  value={settings.calendar.holidays
                    .map((h) => `${h.date.slice(0, 10)}|${h.label}`)
                    .join("\n")}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      calendar: {
                        ...s.calendar,
                        holidays: e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [date, ...rest] = line.split("|");
                            return { date: date.trim(), label: rest.join("|").trim() || "Feriado" };
                          }),
                      },
                    }))
                  }
                  placeholder="2026-04-21|Tiradentes"
                />
              </div>
              <div>
                <Label htmlFor="events">Eventos (data|nome|tipo opcional)</Label>
                <Textarea
                  id="events"
                  rows={4}
                  value={settings.calendar.events
                    .map((ev) =>
                      ev.kind ? `${ev.date.slice(0, 10)}|${ev.label}|${ev.kind}` : `${ev.date.slice(0, 10)}|${ev.label}`
                    )
                    .join("\n")}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      calendar: {
                        ...s.calendar,
                        events: e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [date, label, kind] = line.split("|");
                            return {
                              date: date.trim(),
                              label: (label ?? "").trim(),
                              kind: (kind?.trim() as "exam" | "event" | "meeting") || "event",
                            };
                          }),
                      },
                    }))
                  }
                  placeholder="2026-06-10|Prova final|exam"
                />
              </div>
            </div>
          )}

          {tab === "branding" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="primaryColor">Cor principal</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="h-11 w-16 shrink-0"
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        branding: { ...s.branding, primaryColor: e.target.value },
                      }))
                    }
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        branding: { ...s.branding, primaryColor: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accentColor">Cor de destaque</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    className="h-11 w-16 shrink-0"
                    value={settings.branding.accentColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        branding: { ...s.branding, accentColor: e.target.value },
                      }))
                    }
                  />
                  <Input
                    value={settings.branding.accentColor}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        branding: { ...s.branding, accentColor: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tagline">Frase da escola</Label>
                <Input
                  id="tagline"
                  value={settings.branding.tagline}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      branding: { ...s.branding, tagline: e.target.value },
                    }))
                  }
                  placeholder="Ex.: Aprender, evoluir, conquistar"
                />
              </div>
              <div
                className="sm:col-span-2 rounded-xl p-4 text-white"
                style={{ backgroundColor: settings.branding.primaryColor }}
              >
                <p className="font-bold">Prévia do tema</p>
                <p className="text-sm opacity-90">{settings.branding.tagline}</p>
              </div>
            </div>
          )}

          {tab === "permissions" && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 font-semibold text-slate-800">Professores</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["createGrades", "Lançar notas"],
                      ["recordAttendance", "Registrar frequência"],
                      ["createExercises", "Criar exercícios"],
                      ["gradeExercises", "Corrigir exercícios"],
                      ["createMissions", "Criar missões"],
                      ["completeMissions", "Concluir missões"],
                      ["viewReports", "Ver relatórios"],
                      ["accessShop", "Ver loja"],
                      ["fulfillShop", "Entregar prêmios"],
                      ["adjustPoints", "Ajustar pontos em aula"],
                    ] as const
                  ).map(([key, label]) => (
                    <Toggle
                      key={key}
                      checked={settings.permissions.teacher[key]}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          permissions: {
                            ...s.permissions,
                            teacher: { ...s.permissions.teacher, [key]: v },
                          },
                        }))
                      }
                      label={label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-800">Diretoria</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["editSettings", "Editar configurações"],
                      ["manageTeachers", "Gerenciar professores"],
                      ["manageRewards", "Gerenciar loja/prêmios"],
                      ["adjustPoints", "Ajustar pontos manualmente"],
                    ] as const
                  ).map(([key, label]) => (
                    <Toggle
                      key={key}
                      checked={settings.permissions.director[key]}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          permissions: {
                            ...s.permissions,
                            director: { ...s.permissions.director, [key]: v },
                          },
                        }))
                      }
                      label={label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-800">Alunos e responsáveis</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Toggle
                    checked={settings.permissions.student.redeemShop}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        permissions: {
                          ...s.permissions,
                          student: { ...s.permissions.student, redeemShop: v },
                        },
                      }))
                    }
                    label="Aluno pode resgatar na loja"
                  />
                  <Toggle
                    checked={settings.permissions.student.requestMission}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        permissions: {
                          ...s.permissions,
                          student: { ...s.permissions.student, requestMission: v },
                        },
                      }))
                    }
                    label="Aluno pode pedir confirmação de missão"
                  />
                  <Toggle
                    checked={settings.permissions.parent.viewChildData}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        permissions: {
                          ...s.permissions,
                          parent: { ...s.permissions.parent, viewChildData: v },
                        },
                      }))
                    }
                    label="Responsável vê dados dos filhos"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "shop" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                A loja usa apenas <strong>moedas</strong>. Gerencie categorias e itens em{" "}
                <a href="/dashboard/loja" className="font-semibold text-indigo-600 hover:underline">
                  Loja de Moedas
                </a>{" "}
                ou Gamificação. O XP fica reservado para nível e ranking.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={settings.shop.teachersCanFulfill}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shop: { ...s.shop, teachersCanFulfill: v },
                  }))
                }
                label="Professores podem marcar prêmio como entregue"
              />
              <Toggle
                checked={settings.shop.requireStock}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shop: { ...s.shop, requireStock: v },
                  }))
                }
                label="Exigir estoque numérico para resgatar"
                description="Itens sem estoque definido ficam bloqueados"
              />
              </div>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-emerald-600" role="status">
              Regras salvas  -  já valem em todo o sistema.
            </p>
          )}

          <Button type="submit" disabled={pending} size="lg">
            {pending ? "Salvando..." : "Salvar regras da escola"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
