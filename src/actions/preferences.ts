"use server";

import { cookies } from "next/headers";
import {
  isLoginPortal,
  PREF_COOKIES,
  PREF_MAX_AGE,
  type LoginPortal,
} from "@/lib/preference-cookies";

const baseOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: PREF_MAX_AGE,
  httpOnly: true,
};

export async function getPreferenceCookies() {
  const store = await cookies();
  const portal = store.get(PREF_COOKIES.lastPortal)?.value;
  return {
    lastPortal: portal && isLoginPortal(portal) ? portal : null,
    lastSchoolSlug: store.get(PREF_COOKIES.lastSchoolSlug)?.value ?? null,
    rememberEmail: store.get(PREF_COOKIES.rememberEmail)?.value ?? null,
  };
}

export async function saveLoginPreferencesAction(formData: FormData) {
  const store = await cookies();
  const portal = formData.get("portal")?.toString();
  const schoolSlug =
    formData.get("schoolSlug")?.toString()?.trim().toLowerCase() ??
    formData.get("tenantSlug")?.toString()?.trim().toLowerCase();
  const email = formData.get("email")?.toString()?.trim().toLowerCase();
  const rememberEmail = formData.get("rememberEmail") === "true";

  if (portal && isLoginPortal(portal)) {
    store.set(PREF_COOKIES.lastPortal, portal, baseOptions);
  }
  if (schoolSlug && schoolSlug.length >= 3) {
    store.set(PREF_COOKIES.lastSchoolSlug, schoolSlug, baseOptions);
  }
  if (rememberEmail && email) {
    store.set(PREF_COOKIES.rememberEmail, email, baseOptions);
  } else {
    store.delete(PREF_COOKIES.rememberEmail);
  }
}

export async function saveSchoolSlugPreference(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 3) return;
  const store = await cookies();
  store.set(PREF_COOKIES.lastSchoolSlug, normalized, baseOptions);
}

export async function savePortalPreference(portal: LoginPortal) {
  const store = await cookies();
  store.set(PREF_COOKIES.lastPortal, portal, baseOptions);
}
