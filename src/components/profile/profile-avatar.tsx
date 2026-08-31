"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CosmeticFrame } from "@/components/cosmetics/cosmetic-frame";

export function ProfileAvatar({
  name = "",
  avatarUrl,
  frameKey,
  size = "lg",
  className,
  onImageError,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  frameKey?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onImageError?: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const sizes = {
    xs: "h-8 w-8 text-xs",
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-20 w-20 text-2xl",
    xl: "h-28 w-28 text-4xl",
  };

  const ringSizes = {
    xs: "ring-1",
    sm: "ring-2",
    md: "ring-2",
    lg: "ring-4",
    xl: "ring-4",
  };

  const safeName = (name ?? "").trim();
  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const showImage = Boolean(avatarUrl) && avatarUrl !== failedUrl;

  const renderAvatarContent = () => {
    if (showImage) {
      const isDataUrl = avatarUrl!.startsWith("data:");
      const imageClass = cn(
        "relative overflow-hidden rounded-full shadow-md",
        ringSizes[size],
        "ring-white",
        sizes[size],
        className
      );

      if (isDataUrl) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl!}
            alt={`Foto de ${safeName}`}
            className={cn(imageClass, "object-cover")}
            onError={() => {
              setFailedUrl(avatarUrl!);
              onImageError?.();
            }}
          />
        );
      }

      return (
        <div className={imageClass}>
          <Image
            src={avatarUrl!}
            alt={`Foto de ${safeName}`}
            fill
            className="object-cover"
            unoptimized
            onError={() => {
              setFailedUrl(avatarUrl!);
              onImageError?.();
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[color:var(--school-primary,#4f46e5)] font-bold text-white shadow-md",
          ringSizes[size],
          "ring-white",
          sizes[size],
          className
        )}
        aria-hidden={initials ? true : undefined}
        title={safeName || undefined}
      >
        {initials || "?"}
      </div>
    );
  };

  return (
    <CosmeticFrame frameKey={frameKey} size={size}>
      {renderAvatarContent()}
    </CosmeticFrame>
  );
}

