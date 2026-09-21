export type PaymentProviderType =
  | "MANUAL_PIX"
  | "MANUAL_BANK_TRANSFER"
  | "ASAAS"
  | "MERCADO_PAGO"
  | "EFI_BANK"
  | "CUSTOM_INSTRUCTIONS";

export type InvoiceStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "PAID"
  | "OVERDUE"
  | "CANCELED"
  | "REFUNDED";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export interface SchoolPaymentConfigDTO {
  id: string;
  schoolId: string;
  providerType: PaymentProviderType;
  isActive: boolean;
  pixKey?: string | null;
  pixKeyType?: PixKeyType | null;
  beneficiaryName?: string | null;
  bankName?: string | null;
  instructions?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentInvoiceDTO {
  id: string;
  schoolId: string;
  studentId: string;
  title: string;
  amountCents: number;
  dueDate: Date | string;
  status: InvoiceStatus;
  paymentMethodId?: string | null;
  pixQrCodeBase64?: string | null;
  pixCopyPaste?: string | null;
  externalInvoiceId?: string | null;
  proofAttachmentUrl?: string | null;
  proofUploadedAt?: Date | string | null;
  paidAt?: Date | string | null;
  verifiedByUserId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
