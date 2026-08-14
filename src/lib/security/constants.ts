/** Campos públicos de usuário  -  nunca incluir passwordHash. */
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  schoolId: true,
  createdAt: true,
} as const;

export const SAFE_STUDENT_USER_SELECT = {
  id: true,
  fullName: true,
  avatarUrl: true,
  email: true,
  role: true,
} as const;

/** Cost bcrypt: 12 em produção, 10 em dev. */
export const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;
