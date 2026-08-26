"use client";

import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { LocationFields } from "@/components/forms/location-fields";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import {
  GENDER_OPTIONS,
  PRONOUN_OPTIONS,
  SOCIAL_NETWORKS,
  parseInterests,
  type SocialLinks,
} from "@/lib/student-profile";

export type StudentProfileFieldValues = {
  fullName?: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  birthDate?: string;
  gender?: string | null;
  pronouns?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string | null;
  interests?: string | null;
  socialLinks?: SocialLinks;
};

function ExtraProfileFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: StudentProfileFieldValues;
}) {
  const interestsText = parseInterests(values?.interests).join(", ");
  const social = values?.socialLinks ?? {};

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-gender`}>Gênero (opcional)</Label>
          <Select id={`${idPrefix}-gender`} name="gender" defaultValue={values?.gender ?? ""}>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-pronouns`}>Pronomes (opcional)</Label>
          <Select id={`${idPrefix}-pronouns`} name="pronouns" defaultValue={values?.pronouns ?? ""}>
            {PRONOUN_OPTIONS.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Contato</h3>
        <div>
          <Label htmlFor={`${idPrefix}-phone`}>Telefone / celular (opcional)</Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            defaultValue={values?.phone ?? ""}
          />
          <p className="mt-1 text-xs text-slate-500">Pode ser usado para 2FA, SMS e recuperação de conta.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Localização e contexto</h3>
        <LocationFields
          defaultCity={values?.city ?? ""}
          defaultState={values?.state ?? ""}
          defaultZip={values?.zipCode ?? ""}
          showZip
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${idPrefix}-latitude`}>Latitude (opcional)</Label>
            <Input
              id={`${idPrefix}-latitude`}
              name="latitude"
              inputMode="decimal"
              placeholder="-23.5505"
              defaultValue={values?.latitude ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-longitude`}>Longitude (opcional)</Label>
            <Input
              id={`${idPrefix}-longitude`}
              name="longitude"
              inputMode="decimal"
              placeholder="-46.6333"
              defaultValue={values?.longitude ?? ""}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Coordenadas para recursos de proximidade e eventos locais. Uso interno da instituição.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Perfil social, engajamento e interesses</h3>
        <div>
          <Label htmlFor={`${idPrefix}-bio`}>Biografia / descrição curta</Label>
          <Textarea
            id={`${idPrefix}-bio`}
            name="bio"
            rows={3}
            maxLength={280}
            placeholder="Apresentação breve da criança"
            defaultValue={values?.bio ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-interests`}>Interesses / tags</Label>
          <Input
            id={`${idPrefix}-interests`}
            name="interests"
            placeholder="leitura, futebol, artes, ciências"
            defaultValue={interestsText}
          />
          <p className="mt-1 text-xs text-slate-500">Separe por vírgula. Usado para recomendações e conexões.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">Redes sociais vinculadas</p>
          {SOCIAL_NETWORKS.map((network) => (
            <div key={network.key}>
              <Label htmlFor={`${idPrefix}-social-${network.key}`}>{network.label}</Label>
              <Input
                id={`${idPrefix}-social-${network.key}`}
                name={`social_${network.key}`}
                type="url"
                placeholder={network.placeholder}
                defaultValue={social[network.key] ?? ""}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function StudentProfileFields({
  idPrefix,
  values,
  showIdentityCore = true,
  showUsername = true,
  showAvatar = true,
  showBirthDate = true,
  birthDateRequired = false,
  collapsibleExtras = false,
}: {
  idPrefix: string;
  values?: StudentProfileFieldValues;
  showIdentityCore?: boolean;
  showUsername?: boolean;
  showAvatar?: boolean;
  showBirthDate?: boolean;
  birthDateRequired?: boolean;
  collapsibleExtras?: boolean;
}) {
  const extras = <ExtraProfileFields idPrefix={idPrefix} values={values} />;

  return (
    <div className="space-y-5">
      {showIdentityCore && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Identificação e cadastro básico</h3>
          <div>
            <Label htmlFor={`${idPrefix}-fullName`}>Nome completo</Label>
            <Input
              id={`${idPrefix}-fullName`}
              name="fullName"
              required
              defaultValue={values?.fullName ?? ""}
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-displayName`}>Nome de exibição (opcional)</Label>
            <Input
              id={`${idPrefix}-displayName`}
              name="displayName"
              defaultValue={values?.displayName ?? ""}
              placeholder="Como o nome aparece no perfil"
            />
          </div>
          {showUsername && (
            <div>
              <Label htmlFor={`${idPrefix}-username`}>Nome de usuário (opcional)</Label>
              <Input
                id={`${idPrefix}-username`}
                name="username"
                defaultValue={values?.username ? `@${values.username}` : ""}
                placeholder="@usuario"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
              />
              <p className="mt-1 text-xs text-slate-500">
                Identificador único para menções e busca. Use letras minúsculas, números ou _.
              </p>
            </div>
          )}
        </section>
      )}

      {showAvatar && (
        <AvatarUploadField
          previewName={values?.fullName || values?.displayName || "Aluno"}
          label="Foto de perfil / avatar"
          hint="Imagem personalizada ou link de avatar (opcional)."
          currentAvatarUrl={values?.avatarUrl}
        />
      )}

      {showBirthDate && (
        <div>
          <Label htmlFor={`${idPrefix}-birthDate`}>Data de nascimento</Label>
          <Input
            id={`${idPrefix}-birthDate`}
            name="birthDate"
            type="date"
            required={birthDateRequired}
            defaultValue={values?.birthDate ?? ""}
          />
          <p className="mt-1 text-xs text-slate-500">Usada para faixa etária e conformidade dos termos de uso.</p>
        </div>
      )}

      {collapsibleExtras ? (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Perfil complementar (gênero, contato, localização e redes)
          </summary>
          <div className="space-y-5 border-t border-slate-100 px-4 py-4">{extras}</div>
        </details>
      ) : (
        extras
      )}
    </div>
  );
}
