"use client";

import { useTransition } from "react";
import {
  addSharedCalendarItemAction,
  removeSharedCalendarItemAction,
  updateSharedCalendarMetaAction,
} from "@/actions/shared-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchoolSettings } from "@/lib/school-settings";
import { formatDate } from "@/lib/utils";
import { CalendarPlus, Trash2 } from "lucide-react";

const WEEKDAYS = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

type Props = {
  settings: SchoolSettings;
  canManageItems: boolean;
  canManageMeta: boolean;
};

export function SharedCalendarManager({ settings, canManageItems, canManageMeta }: Props) {
  const [pending, startTransition] = useTransition();

  const allItems = [
    ...settings.calendar.holidays.map((h) => ({
      itemType: "holiday" as const,
      date: h.date.slice(0, 10),
      label: h.label,
      kind: "holiday" as const,
    })),
    ...settings.calendar.events.map((e) => ({
      itemType: "event" as const,
      date: e.date.slice(0, 10),
      label: e.label,
      kind: e.kind ?? ("event" as const),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  function handleAdd(formData: FormData) {
    startTransition(() => addSharedCalendarItemAction(formData));
  }

  function handleRemove(itemType: string, date: string, label: string) {
    const fd = new FormData();
    fd.set("itemType", itemType);
    fd.set("date", date);
    fd.set("label", label);
    startTransition(() => removeSharedCalendarItemAction(fd));
  }

  if (!canManageItems && !canManageMeta) return null;

  return (
    <div className="space-y-6">
      {canManageItems && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarPlus className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Adicionar à agenda compartilhada
            </CardTitle>
            <p className="text-sm text-slate-600">
              Feriados, provas, reuniões e eventos ficam visíveis para toda a comunidade escolar.
            </p>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="itemType">Tipo</Label>
                <Select id="itemType" name="itemType" defaultValue="holiday">
                  <option value="holiday">Feriado / recesso</option>
                  <option value="event">Evento escolar</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="kind">Categoria (eventos)</Label>
                <Select id="kind" name="kind" defaultValue="event">
                  <option value="event">Evento geral</option>
                  <option value="exam">Prova / avaliação</option>
                  <option value="meeting">Reunião de pais</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Data</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="label">Nome</Label>
                <Input id="label" name="label" required placeholder="Ex.: Tiradentes" />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvando…" : "Publicar para todos"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canManageMeta && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período letivo e horários</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => startTransition(() => updateSharedCalendarMetaAction(fd))}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <Label htmlFor="yearStart">Início do ano letivo</Label>
                <Input
                  id="yearStart"
                  name="yearStart"
                  type="date"
                  defaultValue={settings.calendar.yearStart.slice(0, 10)}
                />
              </div>
              <div>
                <Label htmlFor="yearEnd">Fim do ano letivo</Label>
                <Input
                  id="yearEnd"
                  name="yearEnd"
                  type="date"
                  defaultValue={settings.calendar.yearEnd.slice(0, 10)}
                />
              </div>
              <div>
                <Label htmlFor="classStartTime">Início das aulas</Label>
                <Input
                  id="classStartTime"
                  name="classStartTime"
                  type="time"
                  defaultValue={settings.calendar.classStartTime}
                />
              </div>
              <div>
                <Label htmlFor="classEndTime">Fim das aulas</Label>
                <Input
                  id="classEndTime"
                  name="classEndTime"
                  type="time"
                  defaultValue={settings.calendar.classEndTime}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">Dias com aula</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <label key={d.v} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        name="schoolDay"
                        value={d.v}
                        defaultChecked={settings.calendar.schoolDays.includes(d.v)}
                        onChange={(e) => {
                          const form = e.currentTarget.form;
                          if (!form) return;
                          const checked = [
                            ...form.querySelectorAll<HTMLInputElement>('input[name="schoolDay"]:checked'),
                          ];
                          const hidden = form.querySelector<HTMLInputElement>('input[name="schoolDays"]');
                          if (hidden) hidden.value = checked.map((c) => c.value).join(",");
                        }}
                      />
                      {d.l}
                    </label>
                  ))}
                </div>
                <input
                  type="hidden"
                  name="schoolDays"
                  defaultValue={settings.calendar.schoolDays.join(",")}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline" disabled={pending}>
                  Salvar período
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canManageItems && allItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gerenciar itens publicados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {allItems.map((item) => (
                <li
                  key={`${item.itemType}-${item.date}-${item.label}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant={item.kind === "holiday" ? "warning" : "default"}>
                      {item.kind === "holiday"
                        ? "Feriado"
                        : item.kind === "exam"
                          ? "Prova"
                          : item.kind === "meeting"
                            ? "Reunião"
                            : "Evento"}
                    </Badge>
                    <span className="text-slate-500">{formatDate(item.date)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={pending}
                    onClick={() => handleRemove(item.itemType, item.date, item.label)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Remover</span>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
