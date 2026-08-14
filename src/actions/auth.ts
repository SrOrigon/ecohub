"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  clearSessionCookie,
  clearTenantCookie,
  establishSession,
  safeEstablishSession,
  requireSession,
} from "@/lib/auth";
import { loginHubPath } from "@/lib/login-paths";
import { TENANT_COOKIE } from "@/lib/tenant";
import { findUserByEmailForLogin, verifyAndUpgradePassword } from "@/lib/auth-credentials";
import { prisma } from "@/lib/db";
import { ensureDefaultBadges, ensureDefaultRewards } from "@/lib/school-setup";
import { notifyInitialSchoolVerification } from "@/lib/sync-school-verification";
import { saveLoginPreferencesAction, saveSchoolSlugPreference } from "@/actions/preferences";
import { createUniqueSchoolSlug, findSchoolBySlug } from "@/lib/school-lookup";
import { fetchCnpjFromBrasilApi, normalizeCnpj } from "@/lib/cnpj";
import {
  canAcceptPublicSignup,
  SCHOOL_VERIFICATION_STATUS,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";
import { DEFAULT_SCHOOL_SETTINGS, getSchoolSettings, stringifySchoolSettings } from "@/lib/school-settings";
import { canSelfRegisterStudent, parseBirthDate } from "@/lib/student-age";
import { verifyStudentPin } from "@/lib/student-pin";
import type { UserRole } from "@/lib/constants";
import {
  AUTH_RATE_LIMIT,
  enforceRateLimit,
  RateLimitError,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import {
  GENERIC_AUTH_ERROR,
  GENERIC_REGISTER_ERROR,
  hashPassword,
  normalizePassword,
  validatePassword,
} from "@/lib/security/password-policy";

function handleRateLimitError(error: unknown): { error: string } | null {
  if (error instanceof RateLimitError) {
    return { error: rateLimitMessage(error.retryAfterSec) };
  }
  return null;
}

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
  if (portal === "escola") return role === "admin" || role === "director" || role === "secretary";
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
}
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const portal = String(formData.get("portal") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  try {
    await enforceRateLimit("login", email, AUTH_RATE_LIMIT.login);
  } catch (error) {
    const limited = handleRateLimitError(error);
    if (limited) return limited;
    throw error;
  }

  const user = await findUserByEmailForLogin(email);

  if (!user || !(await verifyAndUpgradePassword(user, password))) {
    return { error: GENERIC_AUTH_ERROR };
  }

  if (portal && !matchesPortal(user.role as UserRole, portal)) {
    return { error: portalError(portal) };
  }

  const remember = formData.get("rememberMe") === "true";
  const tenantSlugRaw = formData.get("tenantSlug")?.toString().trim().toLowerCase() || null;
  try {
    await saveLoginPreferencesAction(formData);
  } catch (error) {
    console.error("[auth] Falha ao salvar preferências de login (ignorado):", error);
  }

  let resolvedTenantSlug: string | null = null;
  if (tenantSlugRaw) {
    const tenantSchool = await findSchoolBySlug(tenantSlugRaw);
    if (!tenantSchool) {
      return { error: "Instituição não encontrada. Verifique o endereço de acesso." };
    }
    if (user.schoolId && tenantSchool.id !== user.schoolId) {
      return {
        error:
          portal === "escola"
            ? "Este e-mail não pertence a esta instituição neste endereço. Use /login/escola (login global) ou o link correto da sua escola."
            : "Esta conta não pertence a esta instituição.",
      };
    }
    resolvedTenantSlug = tenantSchool.slug;
  }

  try {
    await establishSession(user, { remember, tenantSlug: resolvedTenantSlug });
  } catch (error) {
    console.error("[auth] Falha ao criar sessão após login:", error);
    const reason = error instanceof Error ? error.message : "";
    if (reason.includes("AUTH_SECRET")) {
      return {
        error:
          "Servidor em configuração incompleta (AUTH_SECRET). A senha pode estar correta — contate o suporte técnico.",
      };
    }
    return {
      error:
        "Não foi possível iniciar a sessão após o login. Tente novamente em instantes ou contate o suporte.",
    };
  }
  redirect(dashboardForRole(user.role as UserRole));
}

export type RegisterSchoolSuccess = {
  success: true;
  schoolName: string;
  email: string;
  slug: string;
  verificationStatus: SchoolVerificationStatus;
  /** true quando a sessão automática falhou — usuário deve entrar manualmente */
  loginRequired?: boolean;
};

export type RegisterSchoolResult = { error: string } | RegisterSchoolSuccess | null;

export async function registerSchoolAction(formData: FormData): Promise<RegisterSchoolResult> {
  try {
    return await registerSchoolActionImpl(formData);
  } catch (error) {
    console.error("[auth] registerSchoolAction falhou:", error);
    return {
      error:
        "Não foi possível concluir o cadastro agora. Se o CNPJ ou e-mail já existir, tente fazer login em /login/escola.",
    };
  }
}

async function registerSchoolActionImpl(formData: FormData): Promise<RegisterSchoolResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const cnpjRaw = String(formData.get("cnpj") ?? "").trim();

  if (!email || !password || !fullName || !schoolName || !cnpjRaw) {
    return { error: "Preencha todos os campos, incluindo CNPJ." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  try {
    await enforceRateLimit("register-school", email, AUTH_RATE_LIMIT.register);
  } catch (error) {
    const limited = handleRateLimitError(error);
    if (limited) return limited;
    throw error;
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
    return {
      error:
        "Este CNPJ já está cadastrado. Se você já criou a conta, faça login em /login/escola com o e-mail cadastrado.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error:
        "Este e-mail já está cadastrado. Faça login em /login/escola com a senha definida no cadastro.",
    };
  }

  const passwordHash = await hashPassword(password);
  const slug = await createUniqueSchoolSlug(schoolName);

  const { school, user } = await prisma.$transaction(async (tx) => {
    const createdSchool = await tx.school.create({
      data: {
        name: schoolName,
        slug,
        cnpj,
        legalName: cnpjLookup.razaoSocial,
        verificationStatus: cnpjLookup.verificationStatus,
        cnpjCheckedAt: new Date(),
        city: cnpjLookup.city,
        state: cnpjLookup.state,
        settings: stringifySchoolSettings(structuredClone(DEFAULT_SCHOOL_SETTINGS)),
      },
    });

    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "director",
        schoolId: createdSchool.id,
      },
    });

    return { school: createdSchool, user: createdUser };
  });

  try {
    await ensureDefaultBadges(school.id);
    await ensureDefaultRewards(school.id);
  } catch (error) {
    console.error("[auth] Falha ao criar badges/recompensas padrão (cadastro segue):", error);
  }

  const verificationStatus = school.verificationStatus as SchoolVerificationStatus;

  const session = await safeEstablishSession(user, { tenantSlug: school.slug });

  try {
    await notifyInitialSchoolVerification(school.id, verificationStatus);
  } catch (error) {
    console.error("[auth] Falha ao notificar verificação inicial (ignorado):", error);
  }

  return {
    success: true,
    schoolName: school.name,
    email,
    slug: school.slug,
    verificationStatus,
    loginRequired: !session.ok,
  };
}

export async function registerTeacherAction() {
  return {
    error:
      "Cadastro de professor apenas por convite. Peça ao diretor da escola um link de convite ou acesse o link recebido por e-mail.",
  };
}

export async function registerStudentAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const classId = String(formData.get("classId") ?? "").trim();
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  let enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();

  if (!email || !password || !fullName || !schoolSlug || !classId || !birthDateStr) {
    return { error: "Preencha todos os campos, incluindo data de nascimento e turma." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  try {
    await enforceRateLimit("register-student", email, AUTH_RATE_LIMIT.register);
  } catch (error) {
    const limited = handleRateLimitError(error);
    if (limited) return limited;
    throw error;
  }

  const birthDate = parseBirthDate(birthDateStr);
  if (!birthDate) return { error: "Data de nascimento inválida." };

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

  const settings = await getSchoolSettings(school.id);
  if (!canSelfRegisterStudent(birthDate, settings.auth.studentSelfSignupMinAge)) {
    return {
      error: `Alunos menores de ${settings.auth.studentSelfSignupMinAge} anos não podem criar conta própria. Peça à escola ou ao responsável para liberar seu acesso.`,
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
  if (existingEmail) return { error: GENERIC_REGISTER_ERROR };

  const existingCode = await prisma.student.findUnique({ where: { enrollmentCode } });
  if (existingCode) return { error: "Matrícula já em uso. Escolha outra." };

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "student",
        schoolId: school.id,
        student: {
          create: { enrollmentCode, classId: turma.id, birthDate, accountType: "standard" },
        },
      },
    });
  } catch {
    // Cadastros simultâneos podem colidir em email/matrícula apesar da checagem acima.
    return { error: "E-mail ou matrícula já cadastrados. Tente novamente." };
  }

  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/turmas");

  await establishSession(user, { tenantSlug: school.slug });
  redirect("/dashboard/aluno");
}

export async function registerParentAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();
  const relation = String(formData.get("relation") ?? "responsavel");

  if (!email || !password || !fullName || !schoolSlug || !enrollmentCode) {
    return { error: "Preencha todos os campos, incluindo código da escola e matrícula do filho." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  try {
    await enforceRateLimit("register-parent", email, AUTH_RATE_LIMIT.register);
  } catch (error) {
    const limited = handleRateLimitError(error);
    if (limited) return limited;
    throw error;
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
  if (existing) return { error: GENERIC_REGISTER_ERROR };

  const passwordHash = await hashPassword(password);
  // Conta e vínculo criados juntos: sem transação, uma falha deixaria o
  // responsável sem nenhum filho associado.
  const parent = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "parent",
        schoolId: school.id,
      },
    });
    await tx.parentStudent.create({
      data: { parentId: created.id, studentId: student.id, relation },
    });
    return created;
  });

  await establishSession(parent, { tenantSlug: school.slug });
  redirect("/dashboard/responsavel");
}

export async function studentPinLoginAction(formData: FormData) {
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!schoolSlug || !enrollmentCode || !pin) {
    return { error: "Informe escola, matrícula e PIN." };
  }

  try {
    await enforceRateLimit("pin-login", `${schoolSlug}:${enrollmentCode}`, AUTH_RATE_LIMIT.pinLogin);
  } catch (error) {
    const limited = handleRateLimitError(error);
    if (limited) return limited;
    throw error;
  }

  const school = await findSchoolBySlug(schoolSlug);
  if (!school) return { error: "Escola não encontrada." };

  const settings = await getSchoolSettings(school.id);
  if (!settings.auth.allowStudentPinLogin) {
    return { error: "Login por PIN desativado nesta escola." };
  }

  const student = await prisma.student.findFirst({
    where: {
      enrollmentCode,
      user: { schoolId: school.id, role: "student" },
    },
    include: { user: true },
  });

  if (!student?.accessPinHash) {
    return { error: "Matrícula ou PIN inválidos." };
  }

  const valid = await verifyStudentPin(pin, student.accessPinHash);
  if (!valid) return { error: "Matrícula ou PIN inválidos." };

  await saveSchoolSlugPreference(school.slug);
  await establishSession(student.user, { tenantSlug: school.slug });
  redirect("/dashboard/aluno");
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

export async function logoutAction(formData?: FormData) {
  const cookieStore = await cookies();
  const tenantSlug =
    formData?.get("tenantSlug")?.toString().trim().toLowerCase() ||
    cookieStore.get(TENANT_COOKIE)?.value ||
    null;

  await clearSessionCookie();
  await clearTenantCookie();
  redirect(loginHubPath(tenantSlug));
}

export async function getCurrentUserAction() {
  return requireSession().catch(() => null);
}
