"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Trophy } from "lucide-react";

export type SkillAxis = {
  label: string;
  value: number; // 0 a 100
  color?: string;
};

const DEFAULT_AXES: SkillAxis[] = [
  { label: "Linguagens", value: 85 },
  { label: "Matemática", value: 78 },
  { label: "Natureza", value: 82 },
  { label: "Humanas", value: 90 },
  { label: "Frequência", value: 95 },
  { label: "Constância", value: 88 },
];

export function SkillsRadarChart({
  axes = DEFAULT_AXES,
  studentName,
}: {
  axes?: SkillAxis[];
  studentName?: string;
}) {
  const size = 300;
  const center = size / 2;
  const radius = center - 45;
  const count = axes.length;

  // Calcula coordenadas dos polígonos
  function getCoordinates(index: number, val: number) {
    const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  }

  // Pontos do polígono do aluno
  const dataPoints = axes.map((a, i) => getCoordinates(i, a.value));
  const polygonPointsString = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Níveis de grade (25%, 50%, 75%, 100%)
  const gridLevels = [25, 50, 75, 100];

  return (
    <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-sm font-bold">
                Teia de Competências 360°
              </CardTitle>
              <p className="text-xs text-slate-500">
                {studentName ? `Habilidades consolidadas de ${studentName.split(" ")[0]}` : "Pilares de desenvolvimento integral"}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Média: {Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length)}%
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-[300px]">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-auto drop-shadow-sm transition-all"
          >
            {/* Grade Circular de Referência */}
            {gridLevels.map((lvl) => {
              const pts = Array.from({ length: count }, (_, i) => getCoordinates(i, lvl))
                .map((p) => `${p.x},${p.y}`)
                .join(" ");
              return (
                <polygon
                  key={lvl}
                  points={pts}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray={lvl === 100 ? undefined : "2 2"}
                />
              );
            })}

            {/* Linhas de Eixo do Centro */}
            {axes.map((_, i) => {
              const outer = getCoordinates(i, 100);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
              );
            })}

            {/* Polígono do Aluno com Gradiente e Brilho */}
            <polygon
              points={polygonPointsString}
              className="fill-indigo-500/25 stroke-indigo-600 dark:fill-indigo-500/30 dark:stroke-indigo-400"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Pontos nas Vértices */}
            {dataPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                className="fill-indigo-600 stroke-white dark:fill-indigo-400 dark:stroke-slate-900"
                strokeWidth="1.5"
              />
            ))}

            {/* Rótulos de Texto dos Eixos */}
            {axes.map((a, i) => {
              const labelPos = getCoordinates(i, 118);
              return (
                <text
                  key={i}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                >
                  {a.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legenda de Pontuação */}
        <div className="mt-2 grid grid-cols-3 gap-2 w-full text-center">
          {axes.map((a) => (
            <div
              key={a.label}
              className="rounded-lg border border-slate-100 bg-slate-50/70 p-1.5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <p className="text-[10px] font-medium text-slate-500 truncate">{a.label}</p>
              <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {a.value}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
