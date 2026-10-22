"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createAppointmentAction, getAvailableSlotsAction } from "@/actions/appointments";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PublicBookingFlow({ school, services, instructors, availabilities }: { school: any, services: any[], instructors: any[], availabilities: any[] }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("any");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [rawSlots, setRawSlots] = useState<any[]>([]);

  const today = new Date();
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  // Dynamically fetch available slots from server when date changes
  useEffect(() => {
    if (selectedDate && selectedService) {
        getAvailableSlotsAction(school.id, selectedService, selectedInstructor, selectedDate)
            .then(res => {
                if (res.slots) {
                    setTimeSlots(res.slots);
                    setRawSlots(res.rawSlots || []);
                } else {
                    setTimeSlots([]);
                }
            })
            .catch(() => setTimeSlots([]));
    }
  }, [selectedDate, selectedService, selectedInstructor, school.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("schoolId", school.id);
    formData.append("schedulingServiceId", selectedService);
    formData.append("date", selectedDate);
    formData.append("startTime", selectedTime);
    formData.append("instructorProfileId", selectedInstructor);
    formData.append("anyInstructorRawSlots", JSON.stringify(rawSlots));

    const res = await createAppointmentAction(formData);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else if (res.url) {
      alert("Agendamento pré-confirmado! Redirecionando para WhatsApp...");
      window.location.href = res.url;
    }
  }

  // Filter instructors that can teach the selected service
  const serviceInstructors = instructors.filter((i: any) =>
    i.services.some((s: any) => s.schedulingServiceId === selectedService)
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {step === 1 && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 text-center">1. Escolha a Atividade</h2>
            <div className="space-y-3">
              {services.map((s: any) => (
                <button
                  key={s.id}
                  className="w-full text-left p-4 rounded-xl border border-muted hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => { setSelectedService(s.id); setStep(2); }}
                >
                  <p className="font-semibold text-lg">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.durationMinutes} min • {s.isOnline ? "Online" : "Presencial"}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 text-center">2. Escolha o Profissional</h2>
            <div className="space-y-3">
              <button
                className="w-full text-left p-4 rounded-xl border border-muted hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => { setSelectedInstructor("any"); setStep(3); }}
              >
                <p className="font-semibold text-lg">Qualquer profissional disponível</p>
              </button>
              {serviceInstructors.map((i: any) => (
                <button
                  key={i.id}
                  className="w-full text-left p-4 rounded-xl border border-muted hover:border-primary hover:bg-primary/5 transition-all flex items-center space-x-4"
                  onClick={() => { setSelectedInstructor(i.id); setStep(3); }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: i.colorCode || "#4F46E5" }} />
                  <div>
                    <p className="font-semibold">{i.user.fullName}</p>
                    {i.bio && <p className="text-sm text-muted-foreground">{i.bio}</p>}
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setStep(1)}>Voltar</Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 text-center">3. Escolha Data e Horário</h2>
            <div>
              <Label>Data</Label>
              <Select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
              >
                <option value="">Selecione uma data...</option>
                {dates.map(d => (
                  <option key={d.toISOString()} value={d.toISOString()}>
                    {format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </option>
                ))}
              </Select>
            </div>
            {selectedDate && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Horários Disponíveis</p>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${selectedTime === time ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                  {timeSlots.length === 0 && (
                    <p className="col-span-3 text-center text-sm text-muted-foreground py-4">Nenhum horário disponível para esta data.</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>Voltar</Button>
              <Button className="flex-1" disabled={!selectedDate || !selectedTime} onClick={() => setStep(4)}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4 text-center">4. Seus Dados</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Seu Nome Completo</Label>
                <Input name="studentName" required />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input name="studentWhatsapp" required placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>E-mail (opcional)</Label>
                <Input name="studentEmail" type="email" />
              </div>

              <div className="bg-muted p-4 rounded-xl mt-4">
                <p className="text-sm font-semibold">Resumo do Agendamento:</p>
                <p className="text-sm">{services.find((s: any) => s.id === selectedService)?.name}</p>
                <p className="text-sm">
                  {format(new Date(selectedDate), "dd/MM/yyyy")} às {selectedTime}
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="ghost" type="button" className="flex-1" onClick={() => setStep(3)}>Voltar</Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Confirmando..." : "Confirmar e Agendar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
