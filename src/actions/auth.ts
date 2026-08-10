"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  clearSessionCookie,
  setSessionCookie,
  requireSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultBadges, ensureDefaultRewards } from "@/lib/school-setup";
import { saveLoginPreferencesAction, saveSchoolSlugPreference } from "@/actions/preferences";
import { createUniqueSchoolSlug, findSchoolBySlug } from "@/lib/school-lookup";
import { fetchCnpjFromBrasilApi, normalizeCnpj } from "@/lib/cnpj";
import {
  canAcceptPublicSignup,
  SCHOOL_VERIFICATION_STATUS,
} from "@/lib/school-verification";
import type { UserRole } from "@/lib/constants";

function dashboardForRole(role: UserRole) {
  switch (role) {
    case "student":
      return "/dashboard/aluno";
    case "teacher":
      return "/dashboard/professor";
    case "parent":
      return "/dashboard/responsavel";
    default:
      return "/dashboard";
  }
}

function matchesPortal(role: UserRole, portal: string) {
  if (portal === "escola") return role === "admin" || role === "director";
  if (portal === "professor") return role === "teacher";
  if (portal === "aluno") return role === "student";
  if (portal === "responsavel") return role === "parent";
  return true;
}

function portalError(portal: string) {
  if (portal === "escola") return "Esta conta não é de instituição. Use o login de professor, aluno ou responsável.";
  if (portal === "professor") return "Esta conta não é de professor. Verifique o tipo de acesso.";
  if (portal === "aluno") return "Esta conta não é de aluno. Use o login de responsável se for pai/mãe.";
  if (portal === "responsavel") return "Esta conta não é de responsável. Use o login de aluno se for estudante.";
  return "Tipo de acesso incorreto.";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const portal = String(formData.get("portal") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou senha inválidos." };
  }

  if (portal && !matchesPortal(user.role as UserRole, portal)) {
    return { error: portalError(portal) };
  }

  const remember = formData.get("rememberMe") === "true";
  await saveLoginPreferencesAction(formData);

  const token = await createSessionToken(user.id, remember);
  await setSessionCookie(token, remember);
  redirect(dashboardForRole(user.role as UserRole));
}

export async function registerSchoolAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const cnpjRaw = String(formData.get("cnpj") ?? "").trim();

  if (!email || !password || !fullName || !schoolName || !cnpjRaw) {
    return { error: "Preencha todos os campos, incluindo CNPJ." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const cnpjLookup = await fetchCnpjFromBrasilApi(cnpjRaw);
  if ("error" in cnpjLookup) {
    return { error: cnpjLookup.error };
  }
  if (cnpjLookup.verificationStatus === SCHOOL_VERIFICATION_STATUS.rejected) {
    return {
      error: "CNPJ inativo ou irregular na Receita Federal. Não é possível registrar esta instituição.",
    };
  }

  const cnpj = normalizeCnpj(cnpjLookup.cnpj);
  const existingCnpj = await prisma.school.findUnique({ where: { cnpj } });
  if (existingCnpj) {
    return { error: "Este CNPJ já está cadastrado no EduHub." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está cadastrado." };

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await createUniqueSchoolSlug(schoolName);

  const school = await prisma.school.create({
    data: {
      name: schoolName,
      slug,
      cnpj,
      legalName: cnpjLookup.razaoSocial,
      verificationStatus: cnpjLookup.verificationStatus,
      cnpjCheckedAt: new Date(),
      city: cnpjLookup.city,
      state: cnpjLookup.state,
    },
  });
  await ensureDefaultBadges(school.id);
  await ensureDefaultRewards(school.id);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: "director",
      schoolId: school.id,
    },
  });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect("/dashboard");
}

export async function registerTeacherAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();

  if (!email || !password || !fullName || !schoolSlug) {
    return { error: "Preencha nome, e-mail, senha e código da escola." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const school = await findSchoolBySlug(schoolSlug);
  if (!school) {
    return { error: "Escola não encontrada. Confira o código com a instituição." };
  }
  await saveSchoolSlugPreference(school.slug);

  if (!canAcceptPublicSignup(school.verificationStatus)) {
    return {
      error:
        "Esta instituição ainda não está verificada para cadastros públicos. Aguarde a aprovação ou peça ao diretor.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está cadastrado." };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: "teacher",
      schoolId: school.id,
    },
  });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect("/dashboard/professor");
}

export async function registerStudentAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const classId = String(formData.get("classId") ?? "").trim();
  let enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();

  if (!email || !password || !fullName || !schoolSlug || !classId) {
    return { error: "Preencha todos os campos, incluindo turma." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const school = await findSchoolBySlug(schoolSlug);
  if (!school) {
    return { error: "Escola não encontrada. Confira o código com a instituição." };
  }
  await saveSchoolSlugPreference(school.slug);

  if (!canAcceptPublicSignup(school.verificationStatus)) {
    return {
      error:
        "Esta instituição ainda não está verificada para cadastros públicos. Aguarde a aprovação ou peça ao diretor.",
    };
  }

  const turma = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: school.id },
  });
  if (!turma) {
    return { error: "Turma inválida para esta escola." };
  }

  if (!enrollmentCode) {
    enrollmentCode = `ALU-${Date.now().toString(36).toUpperCase()}`;
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return { error: "Este e-mail já está cadastrado." };

  const existingCode = await prisma.student.findUnique({ where: { enrollmentCode } });
  if (existingCode) return { error: "Matrícula já em uso. Escolha outra." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: "student",
      schoolId: school.id,
      student: {
        create: { enrollmentCode, classId: turma.id },
      },
    },
  });

  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/turmas");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Erro ao criar conta." };

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect("/dashboard/aluno");
}

export async function registerParentAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();
  const relation = String(formData.get("relation") ?? "responsavel");

  if (!email || !password || !fullName || !schoolSlug || !enrollmentCode) {
    return { error: "Preencha todos os campos, incluindo código da escola e matrícula do filho." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const school = await findSchoolBySlug(schoolSlug);
  if (!school) {
    return { error: "Escola não encontrada. Confira o código com a instituição." };
  }
  await saveSchoolSlugPreference(school.slug);

  if (!canAcceptPublicSignup(school.verificationStatus)) {
    return {
      error:
        "Esta instituição ainda não está verificada para cadastros públicos. Aguarde a aprovação ou peça ao diretor.",
    };
  }

  const student = await prisma.student.findFirst({
    where: { enrollmentCode, user: { schoolId: school.id } },
  });
  if (!student) {
    return { error: "Matrícula do aluno não encontrada nesta escola." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está cadastrado." };

  const passwordHash = await bcrypt.hash(password, 10);
  const parent = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: "parent",
      schoolId: school.id,
    },
  });

  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: student.id, relation },
  });

  const token = await createSessionToken(parent.id);
  await setSessionCookie(token);
  redirect("/dashboard/responsavel");
}

/** Lista turmas públicas para cadastro de aluno (por código parcial da escola). */
export async function listClassesForSignupAction(formData: FormData) {
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  if (!schoolSlug || schoolSlug.length < 3) {
    return { classes: [] as { id: string; name: string }[] };
  }

  const school = await findSchoolBySlug(schoolSlug);
  if (!school) {
    return { classes: [], schoolName: null, schoolSlug: null };
  }
  if (!canAcceptPublicSignup(school.verificationStatus)) {
    return {
      classes: [],
      schoolName: school.name,
      schoolSlug: school.slug,
      error: "Instituição ainda não verificada para cadastros públicos.",
    };
  }

  const classes = await prisma.classGroup.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { classes, schoolName: school.name, schoolSlug: school.slug };
}

/** @deprecated use registerSchoolAction */
export async function registerAction(formData: FormData) {
  return registerSchoolAction(formData);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function getCurrentUserAction() {
  return requireSession().catch(() => null);
}
