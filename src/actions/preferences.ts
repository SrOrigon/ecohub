"use server";

import type { LoginPortal } from "@/lib/preference-cookies";
import {
  getPreferenceCookies as getPreferenceCookiesImpl,
  saveLoginPreferencesFromForm,
  savePortalPreference as savePortalPreferenceImpl,
  saveSchoolSlugPreference as saveSchoolSlugPreferenceImpl,
} from "@/lib/preference-cookies-server";

export async function getPreferenceCookies() {
  return getPreferenceCookiesImpl();
}

export async function saveLoginPreferencesAction(formData: FormData) {
  await saveLoginPreferencesFromForm(formData);
}

export async function savePortalPreference(portal: LoginPortal) {
  await savePortalPreferenceImpl(portal);
}

export async function saveSchoolSlugPreference(slug: string) {
  await saveSchoolSlugPreferenceImpl(slug);
}
