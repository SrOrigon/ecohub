"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Gamepad2,
  ClipboardList,
  Layers,
  ListChecks,
  Sparkles,
  Route,
  Wand2,
} from "lucide-react";
import { greetingForHour, type CreatorJourneySnapshot } from "@/lib/creator-journey";
import { CreateExerciseForm } from "@/components/forms/create-exercise-form";
import { CreateMissionForm } from "@/components/forms/create-mission-form";
import { CreateTrailForm } from "@/components/forms/create-trail-form";
import { ActivityTypeCard } from "@/components/creator/activity-type-card";
import { CreatorJourneyProgress } from "@/components/creator/creator-journey-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClassOption = { id: string; name: string };

type TrailOptions = {
  missions: { id: string; title: string }[];
  exercises: { id: string; title: string }[];
  rewards: { id: string; name: string }[];
  classes: ClassOption[];
};

export function CreatorHub({
  userName,
  journey,
  classes,
  subjects,
  exercisePresets,
  missionDefaults,
  trailOptions,
  trailsEnabled,
  canCreateTrail,
}: {
  userName: string;
  journey: CreatorJourneySnapshot;
  classes: ClassOption[];
  subjects: string[];
  exercisePresets?: { label: string; xp: number; coins: number; points: number }[];
  missionDefaults?: { xp: number; coins: number };
  trailOptions?: TrailOptions;
  trailsEnabled: boolean;
  canCreateTrail: boolean;
}) {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const firstName = userName.split(" ")[0] ?? userName;
  const greeting = greetingForHour();

  function goToAiCreate() {
    const q = aiPrompt.trim();
    router.push(q ? `/dashboard/assistente?q=${encodeURIComponent(q)}` : "/dashboard/assistente");
  }

  return (
    <section className="creator-hub space-y-6">
      <div className="creator-hub-hero rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-1 text-slate-600">O que vamos criar hoje?</p>
          </div>
          <Link
            href="/dashboard/assistente"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Ecohub IA
          </Link>
        </div>

        <div className="creator-ai-bar mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Descreva o que você quer criar — a IA faz o resto"
            className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-base shadow-inner"
            onKeyDown={(e) => e.key === "Enter" && goToAiCreate()}
          />
          <Button type="button" size="lg" className="h-12 rounded-2xl px-6 shrink-0" onClick={goToAiCreate}>
            <Wand2 className="h-4 w-4 mr-2" aria-hidden="true" />
            Criar
          </Button>
        </div>
      </div>

      <CreatorJourneyProgress journey={journey} />

      {trailsEnabled && (
        <div className="creator-trail-banner relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg md:p-8">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-200">Trilha estilo Duolingo</p>
            <h2 className="mt-2 text-xl font-bold md:text-2xl">
              Fases, conquistas e progresso: a turma aprende avançando como num joguinho
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {canCreateTrail && trailOptions ? (
                <CreateTrailForm
                  options={trailOptions}
                  trigger={
                    <Button className="bg-white text-violet-700 hover:bg-violet-50">
                      <Route className="h-4 w-4 mr-2" aria-hidden="true" />
                      Criar trilha
                    </Button>
                  }
                />
              ) : (
                <Link href="/dashboard/trilhas">
                  <Button className="bg-white text-violet-700 hover:bg-violet-50">Ver trilhas</Button>
                </Link>
              )}
              <Link href="/dashboard/assistente">
                <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  Criar com IA
                </Button>
              </Link>
            </div>
          </div>
          <div className="creator-trail-dots pointer-events-none absolute right-4 top-1/2 hidden h-32 w-40 -translate-y-1/2 md:block" aria-hidden="true" />
        </div>
      )}

      {classes.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Criar uma atividade</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CreateExerciseForm
              classes={classes}
              presets={exercisePresets}
              subjects={subjects}
              defaultQuestionType="choice"
              defaultTitle="Quiz: "
              modalTitle="Criar quiz"
              hideDefaultTrigger
              trigger={
                <ActivityTypeCard
                  title="Quiz"
                  description="Perguntas e alternativas"
                  icon={Gamepad2}
                  iconClassName="bg-violet-100 text-violet-600"
                />
              }
            />
            <CreateMissionForm
              classes={classes}
              defaultXp={missionDefaults?.xp}
              defaultCoins={missionDefaults?.coins}
              trigger={
                <ActivityTypeCard
                  title="Missão"
                  description="Desafios com foto ou vídeo"
                  icon={ClipboardList}
                  iconClassName="bg-amber-100 text-amber-600"
                />
              }
              hideDefaultTrigger
            />
            <CreateExerciseForm
              classes={classes}
              presets={exercisePresets}
              subjects={subjects}
              defaultQuestionType="flashcard"
              defaultTitle="Flashcards: "
              modalTitle="Criar flashcards"
              hideDefaultTrigger
              trigger={
                <ActivityTypeCard
                  title="Flashcards"
                  description="Cartões de memorização"
                  icon={Layers}
                  iconClassName="bg-violet-100 text-violet-600"
                />
              }
            />
            <CreateExerciseForm
              classes={classes}
              presets={exercisePresets}
              subjects={subjects}
              defaultQuestionType="true_false"
              defaultTitle="V ou F: "
              modalTitle="Criar verdadeiro ou falso"
              hideDefaultTrigger
              trigger={
                <ActivityTypeCard
                  title="V ou F"
                  description="Verdadeiro ou falso rápido"
                  icon={ListChecks}
                  iconClassName="bg-emerald-100 text-emerald-600"
                />
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
