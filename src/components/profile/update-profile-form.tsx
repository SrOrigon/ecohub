"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { updateProfileAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { LocationFields } from "@/components/forms/location-fields";
import { compressAvatarFile } from "@/lib/compress-avatar";
import { isValidExternalAvatarUrl } from "@/lib/avatar";

export function UpdateProfileForm({
  fullName: initialName,
  avatarUrl: initialAvatar,
  city: initialCity = "",
  state: initialState = "",
  showLocation = false,
}: {
  fullName: string;
  avatarUrl: string | null;
  city?: string | null;
  state?: string | null;
  showLocation?: boolean;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatar);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const revokePreviewUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) =>
      updateProfileAction(formData),
    null
  );

  const previewName = fullName.trim() || initialName;
  const trimmedUrl = avatarUrl.trim();

  const displayAvatar: string | null = removeAvatar
    ? null
    : previewUrl || (trimmedUrl && isValidExternalAvatarUrl(trimmedUrl) ? trimmedUrl : null);

  const avatarWarning = (() => {
    if (uploadError) return uploadError;
    if (trimmedUrl && !isValidExternalAvatarUrl(trimmedUrl)) {
      return "Informe uma URL válida começando com http:// ou https://";
    }
    if (previewLoadFailed) {
      return "Não foi possível carregar a imagem. Tente enviar um arquivo ou outro link.";
    }
    return null;
  })();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setPreviewLoadFailed(false);
    setCompressing(true);

    try {
      const compressed = await compressAvatarFile(file);
      revokePreviewUrl();
      const objectUrl = URL.createObjectURL(compressed);
      previewObjectUrlRef.current = objectUrl;

      const dt = new DataTransfer();
      dt.items.add(compressed);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }

      setPendingFile(compressed);
      setPreviewUrl(objectUrl);
      setRemoveAvatar(false);
      setAvatarUrl("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao processar a foto.");
    } finally {
      setCompressing(false);
    }
  }

  function handleRemovePhoto() {
    revokePreviewUrl();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPendingFile(null);
    setPreviewUrl(null);
    setAvatarUrl("");
    setRemoveAvatar(true);
    setPreviewLoadFailed(false);
    setUploadError(null);
  }

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "1" : "0"} />

      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-start">
        <ProfileAvatar
          name={previewName}
          avatarUrl={displayAvatar}
          size="lg"
          onImageError={() => setPreviewLoadFailed(true)}
        />
        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <div>
            <p className="text-sm font-medium text-slate-900">Sua foto de perfil</p>
            <p className="text-xs text-slate-500">
              Ajuda colegas, professores e responsáveis a te reconhecerem no sistema.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              name="avatarFile"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="user"
              className="sr-only"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full gap-2 sm:w-auto"
              disabled={compressing || pending}
              onClick={() => fileInputRef.current?.click()}
            >
              {compressing ? (
                "Processando..."
              ) : (
                <>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Escolher foto
                </>
              )}
            </Button>
            {(displayAvatar || initialAvatar) && !removeAvatar && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-2 sm:w-auto"
                disabled={pending}
                onClick={handleRemovePhoto}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remover foto
              </Button>
            )}
          </div>

          {pendingFile && (
            <p className="flex items-center justify-center gap-1 text-xs text-emerald-700 sm:justify-start">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Nova foto pronta  -  clique em Salvar para aplicar
            </p>
          )}
          {avatarWarning && (
            <p className="text-xs text-amber-700" role="status">
              {avatarWarning}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="profile-fullName">Nome completo</Label>
        <Input
          id="profile-fullName"
          name="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
          Usar link de imagem (opcional)
        </summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <Label htmlFor="profile-avatarUrl">URL da foto</Label>
          <Input
            id="profile-avatarUrl"
            name="avatarUrl"
            type="url"
            inputMode="url"
            placeholder="https://exemplo.com/foto.jpg"
            value={avatarUrl}
            onChange={(e) => {
              setAvatarUrl(e.target.value);
              setPreviewLoadFailed(false);
              setRemoveAvatar(false);
              if (e.target.value.trim()) {
                setPendingFile(null);
                setPreviewUrl(e.target.value.trim());
              }
            }}
            disabled={Boolean(pendingFile)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Prefira enviar um arquivo acima. Links externos também funcionam.
          </p>
        </div>
      </details>

      {showLocation && (
        <LocationFields defaultCity={initialCity ?? ""} defaultState={initialState ?? ""} />
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && state.message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending || compressing} className="w-full sm:w-auto" size="lg">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
