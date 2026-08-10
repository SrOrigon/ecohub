import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { PageHeader } from "@/components/layout/page-header";
import { EduHubAiChat } from "@/components/ai/eduhub-ai-chat";
import { redirect } from "next/navigation";

const SUGGESTIONS: Record<string, string[]> = {
  teacher: ["Como explicar frações?", "Gerar questões sobre verbos", "Rascunho de comunicado sobre reunião"],
  director: ["Alertas de risco na escola", "Como fechar bimestre?", "Rascunho comunicado festa junina"],
  secretary: ["Modelo de autorização", "Como funciona matrícula online?", "Rascunho comunicado secretaria"],
  parent: ["Como acompanhar notas do filho?", "Justificar falta", "Tarefas de casa gamificadas"],
  student: ["Dicas de estudo para prova", "O que é BNCC?", "Como ganhar mais XP?"],
  default: ["O que é a EduHub IA?", "Como funciona a BNCC?", "Dicas de estudo"],
};

export default async function AssistentePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const settings = user.schoolId ? await getSchoolSettings(user.schoolId) : null;
  if (settings && !settings.ai.enabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="EduHub IA" description="Assistente pedagógica local" />
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          A EduHub IA está desativada nas configurações da escola.
        </p>
      </div>
    );
  }

  const assistantName = settings?.ai.assistantName ?? "EduHub IA";
  const suggestions = SUGGESTIONS[user.role] ?? SUGGESTIONS.default;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={assistantName}
        description="Assistente especialista em educação básica — 100% local, treinada para BNCC, sem custo de API."
      />
      <EduHubAiChat assistantName={assistantName} suggestions={suggestions} />
    </div>
  );
}
