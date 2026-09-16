"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ContactProps {
  studentName: string;
  studentPhone?: string | null;
  parents: Array<{ name: string; phone?: string | null }>;
}

export function StudentContactModal({ studentName, studentPhone, parents }: ContactProps) {
  const [open, setOpen] = useState(false);

  function formatPhone(phone: string | null | undefined): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  }

  function getWaLink(phone: string, text: string) {
    const digits = formatPhone(phone);
    const countryDigits = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${countryDigits}?text=${encodeURIComponent(text)}`;
  }

  const message = `Olá! Falamos da coordenação sobre a frequência de ${studentName}. Gostaria de conversar sobre o acompanhamento das aulas.`;

  const cleanStudentPhone = formatPhone(studentPhone);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-1 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
      >
        💬 Contato
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Contato Rápido — ${studentName}`}>
        <div className="space-y-4 text-sm">
          {cleanStudentPhone ? (
            <div className="rounded-lg border p-3">
              <p className="font-semibold text-slate-800">Aluno(a): {studentName}</p>
              <p className="text-xs text-slate-500">Telefone: {studentPhone}</p>
              <div className="mt-2 flex gap-2">
                <a
                  href={getWaLink(cleanStudentPhone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  💬 WhatsApp Aluno
                </a>
                <a
                  href={`tel:${cleanStudentPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  📞 Ligar
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhum telefone direto do aluno cadastrado.</p>
          )}

          <div className="border-t pt-3">
            <h4 className="font-semibold text-slate-800">Responsáveis Cadastrados</h4>
            {parents.length > 0 ? (
              <div className="mt-2 space-y-2">
                {parents.map((p, idx) => {
                  const cleanParentPhone = formatPhone(p.phone);
                  return (
                    <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.phone || "Sem telefone"}</p>
                      {cleanParentPhone && (
                        <div className="mt-2 flex gap-2">
                          <a
                            href={getWaLink(cleanParentPhone, message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            💬 WhatsApp Responsável
                          </a>
                          <a
                            href={`tel:${cleanParentPhone}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            📞 Ligar
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Nenhum responsável vinculado no sistema.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
