import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronRight, Sun } from "lucide-react";

export type TodayItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  done: boolean;
  cta: string;
  badge?: string;
};

export function TodayChecklist({
  items,
  firstName,
}: {
  items: TodayItem[];
  firstName: string;
}) {
  const pending = items.filter((i) => !i.done).length;
  const done = items.filter((i) => i.done).length;

  return (
    <Card className="kid-card border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sun className="h-6 w-6 text-amber-500" aria-hidden="true" />
          Seu dia, {firstName}
        </CardTitle>
        <p className="text-base text-slate-600">
          {pending === 0
            ? "Tudo em dia  -  você arrasou!"
            : `${pending} pendência(s) · ${done} concluída(s)`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-lg text-slate-600">Nada para hoje. Explore a loja ou revise suas conquistas!</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-4 ${
                item.done
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-white bg-white shadow-sm"
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 h-6 w-6 shrink-0 text-indigo-400" aria-hidden="true" />
                )}
                <div>
                  <p className="text-lg font-bold text-slate-900">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-sm text-slate-600">{item.subtitle}</p>
                  )}
                  {item.badge && (
                    <Badge variant="warning" className="mt-1">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </div>
              {!item.done && (
                <Link href={item.href}>
                  <Button size="lg" className="gap-1">
                    {item.cta}
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
