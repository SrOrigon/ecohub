import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { eduhubAiSuggestionsForRole } from "@/lib/eduhub-ai";
import { PageHeader } from "@/components/layout/page-header";
import { EduHubAiChat } from "@/components/ai/eduhub-ai-chat";
import { redirect } from "next/navigation";
import type { EduHubAiRole } from "@/lib/eduhub-ai";

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
  const suggestions = eduhubAiSuggestionsForRole(user.role as EduHubAiRole);
  const role = user.role as EduHubAiRole;

  const isLearner = role === "student" || role === "parent";
  const pageDescription = isLearner
    ? "Tire dúvidas de matérias e receba dicas de estudo — sem geração de exercícios ou gabaritos."
    : "Especialista em educação básica (BNCC) — 100% local, sem API. Gera questões, planos de aula, comunicados e orientações por perfil.";

  const introMessage = isLearner
    ? `Olá! Sou a **${assistantName}**. Posso **explicar matérias** e dar **dicas de estudo**. Não gero exercícios nem gabaritos — isso fica com professores e avaliações da escola.`
    : undefined;

  const inputPlaceholder = isLearner
    ? "Tire dúvidas sobre matérias ou peça dicas de estudo…"
    : "Pergunte sobre BNCC, planos de aula, comunicados…";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={assistantName} description={pageDescription} />
      <EduHubAiChat
        assistantName={assistantName}
        suggestions={suggestions}
        introMessage={introMessage}
        inputPlaceholder={inputPlaceholder}
      />
    </div>
  );
}
