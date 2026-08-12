import Link from "next/link";
import { Sparkles } from "lucide-react";
import { eduhubAiParentTips } from "@/lib/eduhub-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ChildSummary = {
  id: string;
  name: string;
  avgGrade: number;
  freqRate: number;
  pendingExercises: number;
};

export function ParentAiTipsPanel({
  childSummaries,
  passGrade,
  assistantName = "EduHub IA",
}: {
  childSummaries: ChildSummary[];
  passGrade: number;
  assistantName?: string;
}) {
  if (childSummaries.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Dicas da {assistantName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {childSummaries.map((child) => {
          const tips = eduhubAiParentTips({
            childName: child.name,
            avgGrade: child.avgGrade,
            passGrade,
            freqRate: child.freqRate,
            pendingExercises: child.pendingExercises,
          });
          return (
            <div key={child.id} className="rounded-xl border border-indigo-100 bg-white/80 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">{child.name}</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {tips.map((tip, i) => (
                  <li key={i} className="leading-relaxed">
                    {tip.replace(/\*\*/g, "")}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <Link href="/dashboard/assistente">
          <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-800">
            Conversar com a {assistantName}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
