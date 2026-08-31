"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CosmeticFrame } from "@/components/cosmetics/cosmetic-frame";
import { CosmeticBackgroundCard } from "@/components/cosmetics/cosmetic-background";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { equipStudentCosmeticAction } from "@/actions/rewards";
import { getCosmeticDefinition } from "@/lib/cosmetics-catalog";
import { playCoinSound } from "@/lib/sound-effects";
import { Sparkles, CheckCircle2, ShieldOff } from "lucide-react";

type OwnedRedemption = {
  id: string;
  reward: {
    id: string;
    name: string;
    description: string | null;
    itemType: string;
    cosmeticKey: string | null;
  };
};

export function StudentInventory({
  student,
  userFullName,
  avatarUrl,
  redemptions,
}: {
  student: {
    id: string;
    equippedFrame: string | null;
    equippedBackground: string | null;
  };
  userFullName: string;
  avatarUrl?: string | null;
  redemptions: OwnedRedemption[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrar apenas resgates de cosméticos entregues/disponíveis
  const ownedFrames = redemptions
    .filter((r) => r.reward.itemType === "frame" && r.reward.cosmeticKey)
    .map((r) => ({
      key: r.reward.cosmeticKey!,
      name: r.reward.name,
      description: r.reward.description,
    }));

  const ownedBackgrounds = redemptions
    .filter((r) => r.reward.itemType === "background" && r.reward.cosmeticKey)
    .map((r) => ({
      key: r.reward.cosmeticKey!,
      name: r.reward.name,
      description: r.reward.description,
    }));

  // Remover duplicados se houver
  const uniqueFrames = Array.from(new Map(ownedFrames.map((f) => [f.key, f])).values());
  const uniqueBackgrounds = Array.from(new Map(ownedBackgrounds.map((b) => [b.key, b])).values());

  const handleEquip = (cosmeticType: "frame" | "background", cosmeticKey: string) => {
    startTransition(async () => {
      playCoinSound();
      const formData = new FormData();
      formData.set("cosmeticType", cosmeticType);
      formData.set("cosmeticKey", cosmeticKey);
      await equipStudentCosmeticAction(formData);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* Prévia do Perfil Equipado */}
      <Card className="border-2 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Prévia do Seu Visual Equipado
          </CardTitle>
          <CardDescription>
            Veja como seu avatar e perfil aparecem para outros alunos e professores no sistema!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CosmeticBackgroundCard
            backgroundKey={student.equippedBackground}
            className="p-6 shadow-lg"
          >
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <ProfileAvatar
                name={userFullName}
                avatarUrl={avatarUrl}
                frameKey={student.equippedFrame}
                size="xl"
              />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{userFullName}</h3>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="secondary" className="bg-white/20 backdrop-blur">
                    Moldura: {student.equippedFrame ? getCosmeticDefinition(student.equippedFrame)?.name ?? "Equipada" : "Nenhuma"}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 backdrop-blur">
                    Fundo: {student.equippedBackground ? getCosmeticDefinition(student.equippedBackground)?.name ?? "Equipado" : "Padrão"}
                  </Badge>
                </div>
              </div>
            </div>
          </CosmeticBackgroundCard>
        </CardContent>
      </Card>

      {/* Seção de Molduras Compradas */}
      <section aria-labelledby="inventory-frames-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="inventory-frames-heading" className="text-lg font-bold text-slate-900">
            Suas Molduras de Avatar ({uniqueFrames.length})
          </h3>
          {student.equippedFrame && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleEquip("frame", "")}
              className="gap-2 text-slate-600"
            >
              <ShieldOff className="h-4 w-4" />
              Desequipar Moldura
            </Button>
          )}
        </div>

        {uniqueFrames.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-8 text-center text-slate-500">
              Você ainda não comprou nenhuma moldura de avatar. Explore a Loja para desbloquear!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueFrames.map((frame) => {
              const isEquipped = student.equippedFrame === frame.key;
              const cosmeticDef = getCosmeticDefinition(frame.key);

              return (
                <Card
                  key={frame.key}
                  className={`transition-all ${isEquipped ? "ring-2 ring-indigo-500 bg-indigo-50/40" : ""}`}
                >
                  <CardContent className="flex flex-col items-center p-6 text-center gap-4">
                    <CosmeticFrame frameKey={frame.key} size="lg">
                      <ProfileAvatar name={userFullName} avatarUrl={avatarUrl} size="lg" />
                    </CosmeticFrame>
                    <div>
                      <h4 className="font-bold text-slate-900">{frame.name}</h4>
                      <p className="mt-1 text-xs text-slate-600">{frame.description}</p>
                      {cosmeticDef?.badgeLabel && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {cosmeticDef.badgeLabel}
                        </Badge>
                      )}
                    </div>
                    {isEquipped ? (
                      <Button variant="secondary" disabled className="w-full gap-2 bg-indigo-100 text-indigo-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        Equipado
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleEquip("frame", frame.key)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        Equipar Moldura
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção de Planos de Fundo Comprados */}
      <section aria-labelledby="inventory-bg-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="inventory-bg-heading" className="text-lg font-bold text-slate-900">
            Seus Planos de Fundo ({uniqueBackgrounds.length})
          </h3>
          {student.equippedBackground && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleEquip("background", "")}
              className="gap-2 text-slate-600"
            >
              <ShieldOff className="h-4 w-4" />
              Desequipar Plano de Fundo
            </Button>
          )}
        </div>

        {uniqueBackgrounds.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-8 text-center text-slate-500">
              Você ainda não comprou nenhum plano de fundo de perfil. Explore a Loja para desbloquear!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueBackgrounds.map((bg) => {
              const isEquipped = student.equippedBackground === bg.key;
              const cosmeticDef = getCosmeticDefinition(bg.key);

              return (
                <Card
                  key={bg.key}
                  className={`overflow-hidden transition-all ${isEquipped ? "ring-2 ring-indigo-500" : ""}`}
                >
                  <CosmeticBackgroundCard backgroundKey={bg.key} className="p-4 text-center">
                    <p className="font-bold">{bg.name}</p>
                  </CosmeticBackgroundCard>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-slate-600">{bg.description}</p>
                    {cosmeticDef?.badgeLabel && (
                      <Badge variant="secondary" className="text-xs">
                        {cosmeticDef.badgeLabel}
                      </Badge>
                    )}
                    {isEquipped ? (
                      <Button variant="secondary" disabled className="w-full gap-2 bg-indigo-100 text-indigo-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        Equipado
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleEquip("background", bg.key)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        Equipar Fundo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
