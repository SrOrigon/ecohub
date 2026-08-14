"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { compressAvatarFile } from "@/lib/compress-avatar";
import { isValidExternalAvatarUrl } from "@/lib/avatar";

export function AvatarUploadField({
  previewName = "Professor",
  label = "Foto do professor",
  hint = "Envie uma foto ou informe um link (opcional).",
}: {
  previewName?: string;
  label?: string;
  hint?: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  // Libera o object URL da prévia se o campo sair da tela sem envio.
  useEffect(() => revokePreviewUrl, []);

  const trimmedUrl = avatarUrl.trim();
  const displayAvatar =
    previewUrl || (trimmedUrl && isValidExternalAvatarUrl(trimmedUrl) ? trimmedUrl : null);

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

      setPreviewUrl(objectUrl);
      setAvatarUrl("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao processar a foto.");
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <input type="hidden" name="removeAvatar" value="0" />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ProfileAvatar
          name={previewName}
          avatarUrl={displayAvatar}
          size="lg"
          onImageError={() => setPreviewLoadFailed(true)}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              name="avatarFile"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void handleFileChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={compressing}
              onClick={() => fileInputRef.current?.click()}
            >
              {compressing ? (
                "Processando..."
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Enviar foto
                </>
              )}
            </Button>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              JPG, PNG ou WebP · máx. 300 KB
            </span>
          </div>
          <div>
            <Label htmlFor="avatarUrl">Ou URL da imagem (opcional)</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setPreviewLoadFailed(false);
                revokePreviewUrl();
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              placeholder="https://..."
            />
          </div>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          {trimmedUrl && !isValidExternalAvatarUrl(trimmedUrl) && (
            <p className="text-xs text-amber-700">Informe uma URL válida começando com http:// ou https://</p>
          )}
          {previewLoadFailed && (
            <p className="text-xs text-amber-700">Não foi possível carregar a imagem. Tente outro arquivo ou link.</p>
          )}
        </div>
      </div>
    </div>
  );
}
