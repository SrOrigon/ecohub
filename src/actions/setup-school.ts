"use server";

import { requireSession } from "@/lib/auth";

export async function provisionRealSchoolSetupAction() {
  const user = await requireSession();
  if (user.role !== "admin" && user.role !== "director" && user.role !== "secretary") {
    return { error: "Permissão negada. Apenas direção e secretaria acessam o cadastro da instituição." };
  }
  if (!user.schoolId) {
    return { error: "Usuário não vinculado a uma instituição." };
  }
  return {
    error: "Cadastre turmas, disciplinas, atitudes e produtos da instituição. O sistema não cria esses dados.",
  };
}
