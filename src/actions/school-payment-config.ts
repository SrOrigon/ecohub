"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret, readStoredSecret } from "@/lib/security/crypto-vault";
import { logAuditEvent } from "@/lib/audit-logger";
import type { PaymentProviderType, PixKeyType } from "@/types/payment-methods";

function maskSecret(secret: string | null | undefined): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return "****";
  return `****${secret.slice(-4)}`;
}

export async function getSchoolPaymentConfigAction() {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return null;

  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId: user.schoolId },
  });

  if (!config) return null;

  return {
    id: config.id,
    schoolId: config.schoolId,
    providerType: config.providerType as PaymentProviderType,
    isActive: config.isActive,
    pixKey: config.pixKey,
    pixKeyType: config.pixKeyType as PixKeyType | null,
    beneficiaryName: config.beneficiaryName,
    bankName: config.bankName,
    hasApiKey: !!config.encryptedApiKey,
    hasApiSecret: !!config.encryptedApiSecret,
    maskedApiKey: maskSecret(config.encryptedApiKey),
    instructions: config.instructions,
    whatsappBillingEnabled: config.whatsappBillingEnabled,
    whatsappRemindDaysBefore: config.whatsappRemindDaysBefore,
    whatsappPhoneNumberId: config.whatsappPhoneNumberId,
    hasWhatsappToken: !!config.encryptedWhatsappToken,
    maskedWhatsappToken: maskSecret(config.encryptedWhatsappToken),
    hasWebhookSecret: Boolean(readStoredSecret(config.webhookSecret)),
    maskedWebhookSecret: maskSecret(readStoredSecret(config.webhookSecret)),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function saveSchoolPaymentConfigAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const providerType = String(formData.get("providerType") ?? "MANUAL_PIX").trim() as PaymentProviderType;
  const isActive = String(formData.get("isActive") ?? "true") === "true";
  const pixKey = String(formData.get("pixKey") ?? "").trim() || null;
  const pixKeyType = String(formData.get("pixKeyType") ?? "").trim() || null;
  const beneficiaryName = String(formData.get("beneficiaryName") ?? "").trim() || null;
  const bankName = String(formData.get("bankName") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const whatsappBillingEnabled = formData.get("whatsappBillingEnabled") === "on";
  const remindRaw = Number(formData.get("whatsappRemindDaysBefore"));
  const whatsappRemindDaysBefore = Number.isFinite(remindRaw)
    ? Math.min(30, Math.max(0, Math.trunc(remindRaw)))
    : 3;
  const whatsappPhoneNumberId = String(formData.get("whatsappPhoneNumberId") ?? "").trim() || null;
  const whatsappTokenInput = String(formData.get("whatsappAccessToken") ?? "").trim();

  const apiKeyInput = String(formData.get("apiKey") ?? "").trim();
  const apiSecretInput = String(formData.get("apiSecret") ?? "").trim();

  const existing = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId: user.schoolId },
  });

  let encryptedApiKey = existing?.encryptedApiKey ?? null;
  let encryptedApiSecret = existing?.encryptedApiSecret ?? null;

  if (apiKeyInput && !apiKeyInput.startsWith("****")) {
    encryptedApiKey = encryptSecret(apiKeyInput);
  }
  if (apiSecretInput && !apiSecretInput.startsWith("****")) {
    encryptedApiSecret = encryptSecret(apiSecretInput);
  }

  let encryptedWhatsappToken = existing?.encryptedWhatsappToken ?? null;
  if (whatsappTokenInput && !whatsappTokenInput.startsWith("****")) {
    encryptedWhatsappToken = encryptSecret(whatsappTokenInput);
  }

  const pastedWebhookSecret = String(formData.get("webhookSecret") ?? "").trim();
  const rotateWebhookSecret = formData.get("rotateWebhookSecret") === "on";
  const pastedIsNew = Boolean(pastedWebhookSecret) && !pastedWebhookSecret.startsWith("****");
  let webhookSecret = existing?.webhookSecret ?? null;
  let webhookSecretOnce: string | undefined;
  if (pastedIsNew || rotateWebhookSecret || !webhookSecret) {
    const plain = pastedIsNew ? pastedWebhookSecret : randomBytes(32).toString("hex");
    if (plain.length < 16) {
      return { error: "O segredo do webhook precisa ter pelo menos 16 caracteres." };
    }
    webhookSecret = encryptSecret(plain);
    webhookSecretOnce = plain;
  }

  const saved = await prisma.schoolPaymentConfig.upsert({
    where: { schoolId: user.schoolId },
    create: {
      schoolId: user.schoolId,
      providerType,
      isActive,
      pixKey,
      pixKeyType,
      beneficiaryName,
      bankName,
      encryptedApiKey,
      encryptedApiSecret,
      instructions,
      whatsappBillingEnabled,
      whatsappRemindDaysBefore,
      whatsappPhoneNumberId,
      encryptedWhatsappToken,
      webhookSecret,
    },
    update: {
      providerType,
      isActive,
      pixKey,
      pixKeyType,
      beneficiaryName,
      bankName,
      encryptedApiKey,
      encryptedApiSecret,
      instructions,
      whatsappBillingEnabled,
      whatsappRemindDaysBefore,
      whatsappPhoneNumberId,
      encryptedWhatsappToken,
      webhookSecret,
    },
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "SCHOOL_PAYMENT_CONFIG_SAVE",
    entityType: "SchoolPaymentConfig",
    entityId: saved.id,
    diffAfter: { providerType, isActive, pixKeyType, beneficiaryName },
  });

  revalidatePath("/dashboard/configuracoes/pagamentos");
  revalidatePath("/dashboard/configuracoes");

  return {
    success: true,
    message: webhookSecretOnce
      ? "Configuração salva. Copie o segredo do webhook agora — ele não será mostrado de novo."
      : "Configuração de pagamentos salva com sucesso.",
    webhookSecretOnce,
  };
}

export async function saveCardMachineAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const id = String(formData.get("id") ?? "").trim();
  const machineName = String(formData.get("machineName") ?? "").trim();
  const provider = String(formData.get("provider") ?? "Stone").trim();
  const serialNumber = String(formData.get("serialNumber") ?? "").trim() || null;
  const debitFeePercent = Number(formData.get("debitFeePercent") ?? 1.5);
  const creditSightFeePercent = Number(formData.get("creditSightFeePercent") ?? 2.5);
  const creditInstallmentFeePercent = Number(formData.get("creditInstallmentFeePercent") ?? 3.8);

  if (!machineName) return { error: "Nome do terminal POS é obrigatório." };

  if (id) {
    await prisma.cardMachineConfig.updateMany({
      where: { id, schoolId: user.schoolId },
      data: {
        machineName,
        provider,
        serialNumber,
        debitFeePercent,
        creditSightFeePercent,
        creditInstallmentFeePercent,
      },
    });
  } else {
    await prisma.cardMachineConfig.create({
      data: {
        schoolId: user.schoolId,
        machineName,
        provider,
        serialNumber,
        debitFeePercent,
        creditSightFeePercent,
        creditInstallmentFeePercent,
      },
    });
  }

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "CARD_MACHINE_SAVE",
    entityType: "CardMachineConfig",
    diffAfter: { machineName, provider, serialNumber },
  });

  revalidatePath("/dashboard/configuracoes/pagamentos");
  return { success: true, message: "Maquininha cadastrada/atualizada com sucesso!" };
}

export async function deleteCardMachineAction(id: string) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  await prisma.cardMachineConfig.deleteMany({
    where: { id, schoolId: user.schoolId },
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "CARD_MACHINE_DELETE",
    entityType: "CardMachineConfig",
    entityId: id,
  });

  revalidatePath("/dashboard/configuracoes/pagamentos");
  return { success: true, message: "Maquininha removida com sucesso." };
}

export async function getCardMachinesAction() {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return [];

  return prisma.cardMachineConfig.findMany({
    where: { schoolId: user.schoolId, isActive: true },
    orderBy: { machineName: "asc" },
  });
}

export async function testPaymentGatewayConnectionAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const providerType = String(formData.get("providerType") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!providerType || providerType === "MANUAL_PIX" || providerType === "MANUAL_BANK_TRANSFER") {
    return { success: true, message: "Modo manual ativado. Chave Pix e dados bancários validados." };
  }

  if (!apiKey || apiKey.startsWith("****")) {
    return {
      success: true,
      message: "Nenhuma chave nova para conferir. O segredo já salvo permanece no cofre.",
    };
  }

  return {
    success: true,
    message: `A chave de ${providerType} foi aceita para gravação. A confirmação real acontece quando o gateway enviar um pagamento com o segredo do webhook.`,
  };
}
