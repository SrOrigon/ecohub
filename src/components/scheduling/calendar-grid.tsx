"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/form-fields";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CalendarGrid({ appointments, instructors, services }: { appointments: any[], instructors: any[], services: any[] }) {
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");

  const today = new Date();
  const startDate = view === "week" ? startOfWeek(today, { weekStartsOn: 1 }) : today;

  const filteredAppointments = appointments.filter((app: any) => {
    if (selectedInstructor !== "all" && app.instructorProfileId !== selectedInstructor) return false;
    if (selectedService !== "all" && app.schedulingServiceId !== selectedService) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Filtros da Grade</CardTitle>
          <div className="flex space-x-2">
            <Button variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>
              Semanal
            </Button>
            <Button variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>
              Diário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Instrutor</Label>
              <Select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
              >
                <option value="all">Todos</option>
                {instructors.map((i: any) => (
                  <option key={i.id} value={i.id}>{i.user.fullName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Serviço / Disciplina</Label>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <option value="all">Todos</option>
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Horário</th>
                {Array.from({ length: view === "week" ? 7 : 1 }).map((_, i) => {
                  const date = addDays(startDate, i);
                  return (
                    <th key={i} className="px-4 py-3 text-center">
                      {format(date, "EEEE, dd/MM", { locale: ptBR })}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }).map((_, hourIndex) => {
                const hour = hourIndex + 7; // 07:00 to 20:00
                const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                return (
                  <tr key={hour} className="border-b">
                    <td className="px-4 py-2 font-medium bg-muted/20 w-24">
                      {timeStr}
                    </td>
                    {Array.from({ length: view === "week" ? 7 : 1 }).map((_, dayIndex) => {
                      const date = addDays(startDate, dayIndex);
                      const dayApps = filteredAppointments.filter((app: any) => {
                        const appDate = new Date(app.date);
                        return appDate.getDate() === date.getDate() && appDate.getMonth() === date.getMonth() && app.startTime.startsWith(`${hour.toString().padStart(2, "0")}`);
                      });

                      return (
                        <td key={dayIndex} className="px-2 py-2 border-l relative min-w-[150px] align-top">
                          {dayApps.length > 0 ? (
                            <div className="space-y-1">
                              {dayApps.map((app: any) => (
                                <div key={app.id} className="p-2 rounded-md text-xs font-medium text-white shadow-sm" style={{ backgroundColor: app.instructor.colorCode || "#4F46E5" }}>
                                  <p className="truncate font-bold">{app.service.name}</p>
                                  <p className="truncate opacity-90">{app.studentName}</p>
                                  <p className="truncate opacity-80">{app.startTime} - {app.endTime}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-12 border-2 border-dashed border-transparent hover:border-muted-foreground/30 rounded-md transition-colors cursor-pointer flex items-center justify-center text-muted-foreground/50 text-xs">
                              Livre
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
