"use server";

import { requireSession } from "@/lib/auth";
import { adjustStudentPoints } from "@/lib/gamification";
import { hasPermission } from "@/lib/permissions";
import { getSchoolSettings } from "@/lib/school-settings";
import { assertStudentInScope } from "@/lib/tenant-guards";
import { notifyStudent, notifyStudentParents } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/constants";

function canAdjustPoints(role: UserRole, settings: Awaited<ReturnType<typeof getSchoolSettings>>) {
  if (role === "admin") return true;
  if (role === "director" || role === "secretary") {
    return settings.permissions.director.adjustPoints ?? true;
  }
  if (role === "teacher") {
    return hasPermission(role, settings, "teacher.adjustPoints");
  }
  return false;
}

function parseSignedInt(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  const negative = text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  const value = parseInt(digits, 10);
  if (!Number.isFinite(value)) return 0;
  return negative ? -value : value;
}

export async function adjustStudentPointsAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const activity = String(formData.get("activity") ?? "").trim();
  const direction = String(formData.get("direction") ?? "gain");
  const xpRaw = Math.abs(parseSignedInt(formData.get("xpAmount")));
  const coinRaw = Math.abs(parseSignedInt(formData.get("coinAmount")));
  const sign = direction === "loss" ? -1 : 1;
  const xpDelta = xpRaw * sign;
  const coinDelta = coinRaw * sign;
  // #region agent log
  fetch('http://127.0.0.1:7835/ingest/5ebca1af-63db-48d1-b506-1de1b9e39b43',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'60f478'},body:JSON.stringify({sessionId:'60f478',runId:'limits-scan',hypothesisId:'A',location:'point-adjustments.ts:38',message:'ajuste de pontos recebido',data:{xpRaw,coinRaw,xpDelta,coinDelta,formXp:String(formData.get('xpAmount')),formCoins:String(formData.get('coinAmount'))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (!studentId) return { error: "Selecione um aluno." };
  if (!activity) return { error: "Descreva a atividade em sala." };
  if (xpRaw === 0 && coinRaw === 0) return { error: "Informe XP ou moedas." };

  const settings = await getSchoolSettings(user.schoolId);
  if (!canAdjustPoints(user.role, settings)) {
    return { error: "Sem permissão para ajustar pontos manualmente." };
  }

  const scope = await assertStudentInScope(user, studentId);
  if (!scope.ok) return { error: scope.error };

  try {
    await adjustStudentPoints(
      studentId,
      xpDelta,
      coinDelta,
      `Atividade em sala: ${activity}`,
      "manual",
      settings
    );

    const parts: string[] = [];
    if (xpDelta !== 0) parts.push(`${xpDelta > 0 ? "+" : ""}${xpDelta} XP`);
    if (coinDelta !== 0) parts.push(`${coinDelta > 0 ? "+" : ""}${coinDelta} moedas`);
    const summary = parts.join(" · ");

    await notifyStudent(
      studentId,
      xpDelta >= 0 && coinDelta >= 0 ? "Pontos registrados" : "Ajuste de pontos",
      `${summary} — ${activity}`,
      "/dashboard/aluno"
    );
    await notifyStudentParents(
      studentId,
      "Atividade em sala",
      `${summary} (${activity})`,
      `/dashboard/responsavel/filho/${studentId}`,
      "mission"
    );

    revalidatePath(`/dashboard/alunos/${studentId}`);
    revalidatePath("/dashboard/gamificacao");
    revalidatePath("/dashboard/professor");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/secretaria");
    revalidatePath("/dashboard/aluno");
    revalidatePath("/dashboard/rankings");

    return { success: true, message: `Ajuste aplicado: ${summary}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao ajustar pontos." };
  }
}
