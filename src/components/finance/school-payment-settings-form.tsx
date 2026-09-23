"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveSchoolPaymentConfigAction,
  testPaymentGatewayConnectionAction,
  saveCardMachineAction,
  deleteCardMachineAction,
} from "@/actions/school-payment-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, CheckCircle2, CreditCard, Plus, ShieldCheck, Trash2, Zap } from "lucide-react";
import type { PaymentProviderType, PixKeyType } from "@/types/payment-methods";

export interface CardMachineItem {
  id: string;
  machineName: string;
  provider: string;
  serialNumber?: string | null;
  debitFeePercent: number;
  creditSightFeePercent: number;
  creditInstallmentFeePercent: number;
}

export interface SchoolPaymentConfigInitial {
  providerType?: PaymentProviderType | null;
  isActive?: boolean;
  pixKey?: string | null;
  pixKeyType?: PixKeyType | null;
  beneficiaryName?: string | null;
  bankName?: string | null;
  maskedApiKey?: string | null;
  instructions?: string | null;
}

export function SchoolPaymentSettingsForm({
  initial,
  initialCardMachines = [],
}: {
  initial?: SchoolPaymentConfigInitial | null;
  initialCardMachines?: CardMachineItem[];
}) {
  const [providerType, setProviderType] = useState<PaymentProviderType>(
    initial?.providerType ?? "MANUAL_PIX"
  );
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testPending, startTransition] = useTransition();
  const [cardMachines, setCardMachines] = useState<CardMachineItem[]>(initialCardMachines);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<CardMachineItem | null>(null);
  const [isSavingMachine, setIsSavingMachine] = useState(false);

  async function handleSaveMachine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingMachine(true);
    const formData = new FormData(e.currentTarget);
    const res = await saveCardMachineAction(formData);
    setIsSavingMachine(false);
    if (res.success) {
      setMachineModalOpen(false);
      setEditingMachine(null);
      window.location.reload();
    } else {
      alert(res.error ?? "Erro ao salvar maquininha.");
    }
  }

  async function handleDeleteMachine(id: string) {
    if (!confirm("Deseja realmente excluir este terminal POS?")) return;
    const res = await deleteCardMachineAction(id);
    if (res.success) {
      setCardMachines((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert(res.error ?? "Erro ao remover maquininha.");
    }
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      return saveSchoolPaymentConfigAction(formData);
    },
    null
  );

  const isGateway = ["ASAAS", "MERCADO_PAGO", "EFI_BANK"].includes(providerType);

  function handleTestConnection(event: React.MouseEvent) {
    event.preventDefault();
    setTestMessage(null);
    const form = (event.target as HTMLElement).closest("form");
    if (!form) return;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await testPaymentGatewayConnectionAction(formData);
      if (res.error) setTestMessage(`Erro: ${res.error}`);
      else setTestMessage(res.message ?? "Conexão OK!");
    });
  }

  return (
    <div className="space-y-6">
      {/* Alerta de 0% de Taxa / 100% Repasse Direto */}
      <Card className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm text-emerald-900 dark:text-emerald-200">
            <p className="font-bold">100% do valor vai direto para a conta da sua escola</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              O Ecohub <strong>não cobra nenhuma taxa de intermediação</strong> sobre mensalidades. Os pagamentos caem imediatamente na conta bancária/gateway da sua instituição.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            Configuração de Métodos de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="providerType">Método de Cobrança Principal</Label>
              <Select
                id="providerType"
                name="providerType"
                value={providerType}
                onChange={(e) => setProviderType(e.target.value as PaymentProviderType)}
              >
                <option value="MANUAL_PIX">Pix Direto / Chave Manual</option>
                <option value="MANUAL_BANK_TRANSFER">Transferência Bancária / Depósito</option>
                <option value="ASAAS">Gateway Integrado - Asaas (Pix Dinâmico)</option>
                <option value="MERCADO_PAGO">Gateway Integrado - Mercado Pago</option>
                <option value="EFI_BANK">Gateway Integrado - Efí Bank (Gerencianet)</option>
                <option value="CUSTOM_INSTRUCTIONS">Instruções Personalizadas na Secretaria</option>
              </Select>
            </div>

            {/* Seção de Maquininhas de Cartão (Terminais POS) */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Maquininhas de Cartão / Terminais POS
                  </p>
                  <p className="text-xs text-slate-500">
                    Cadastre os terminais físicos para calcular o valor líquido com desconto automático de taxa no recebimento.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingMachine(null);
                    setMachineModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Maquininha
                </Button>
              </div>

              {cardMachines.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 italic text-center">
                  Nenhuma maquininha de cartão cadastrada. Clique em &quot;Nova Maquininha&quot; para cadastrar.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {cardMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{machine.machineName}</p>
                        <p className="text-slate-500">{machine.provider} {machine.serialNumber ? `· S/N: ${machine.serialNumber}` : ""}</p>
                        <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                          Débito: {machine.debitFeePercent}% · Créd. à Vista: {machine.creditSightFeePercent}% · Parcelado: {machine.creditInstallmentFeePercent}%
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMachine(machine.id)}
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campos de Pix / Transferência Manual */}
            {!isGateway && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Dados para Recebimento Manual (Chave Pix / Conta)
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="pixKeyType">Tipo de Chave Pix</Label>
                    <Select
                      id="pixKeyType"
                      name="pixKeyType"
                      defaultValue={initial?.pixKeyType ?? "CNPJ"}
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CPF">CPF</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone / Celular</option>
                      <option value="RANDOM">Chave Aleatória (EVP)</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pixKey">Chave Pix</Label>
                    <Input
                      id="pixKey"
                      name="pixKey"
                      defaultValue={initial?.pixKey ?? ""}
                      placeholder="Ex: 12.345.678/0001-90 ou financeiro@escola.com.br"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="beneficiaryName">Nome do Titular / Beneficiário</Label>
                    <Input
                      id="beneficiaryName"
                      name="beneficiaryName"
                      defaultValue={initial?.beneficiaryName ?? ""}
                      placeholder="Nome da Escola ou Razão Social"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankName">Banco / Instituição</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      defaultValue={initial?.bankName ?? ""}
                      placeholder="Banco do Brasil, Itaú, Nubank..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="instructions">Orientações para o Pagador (Opcional)</Label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    rows={3}
                    defaultValue={initial?.instructions ?? ""}
                    placeholder="Ex: Envie o comprovante pelo app ou apresente na secretaria após o pagamento."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Campos de Gateway BYOK */}
            {isGateway && (
              <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  Credenciais de API do Gateway ({providerType})
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Suas chaves são armazenadas com criptografia de cofre militar (AES-256-GCM). Nunca são exibidas em texto puro.
                </p>

                <div>
                  <Label htmlFor="apiKey">API Key / Access Token</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    defaultValue={initial?.maskedApiKey ?? ""}
                    placeholder="Cole sua API Key do provedor..."
                  />
                </div>

                <div>
                  <Label htmlFor="apiSecret">Secret / Client Secret (se aplicável)</Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    placeholder="Deixe em branco se mantiver a atual..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testPending}
                  >
                    {testPending ? "Testando..." : "Testar Conexão / Credenciais"}
                  </Button>
                  {testMessage && (
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {testMessage}
                    </span>
                  )}
                </div>
              </div>
            )}

            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}

            {state?.success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {state.message ?? "Salvo com sucesso!"}
              </div>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Salvando..." : "Salvar Configurações de Pagamento"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modal para Cadastrar/Editar Maquininha POS */}
      <Modal
        open={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        title={editingMachine ? "Editar Maquininha POS" : "Cadastrar Maquininha de Cartão"}
      >
        <form onSubmit={handleSaveMachine} className="space-y-4 text-xs">
          {editingMachine && <input type="hidden" name="id" value={editingMachine.id} />}

          <div>
            <Label htmlFor="machineName">Nome do Terminal / Identificação</Label>
            <Input
              id="machineName"
              name="machineName"
              required
              placeholder="Ex: Stone Recepção ou Cielo Secretaria"
              defaultValue={editingMachine?.machineName ?? ""}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="provider">Operadora / Provedor</Label>
              <Select id="provider" name="provider" defaultValue={editingMachine?.provider ?? "Stone"}>
                <option value="Stone">Stone</option>
                <option value="Cielo">Cielo</option>
                <option value="PagSeguro">PagBank / PagSeguro</option>
                <option value="Rede">Rede</option>
                <option value="Getnet">Getnet</option>
                <option value="SumUp">SumUp</option>
                <option value="Outra">Outra</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="serialNumber">Número de Série / S/N (Opcional)</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                placeholder="Ex: 987654321"
                defaultValue={editingMachine?.serialNumber ?? ""}
              />
            </div>
          </div>

          <p className="font-semibold text-slate-800 dark:text-slate-200 border-t pt-2">
            Taxas de Desconto da Operadora (%)
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="debitFeePercent">Débito (%)</Label>
              <Input
                id="debitFeePercent"
                name="debitFeePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                defaultValue={editingMachine?.debitFeePercent ?? 1.5}
              />
            </div>

            <div>
              <Label htmlFor="creditSightFeePercent">Crédito à Vista (%)</Label>
              <Input
                id="creditSightFeePercent"
                name="creditSightFeePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                defaultValue={editingMachine?.creditSightFeePercent ?? 2.5}
              />
            </div>

            <div>
              <Label htmlFor="creditInstallmentFeePercent">Crédito Parcelado (%)</Label>
              <Input
                id="creditInstallmentFeePercent"
                name="creditInstallmentFeePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                defaultValue={editingMachine?.creditInstallmentFeePercent ?? 3.8}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMachineModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSavingMachine} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {isSavingMachine ? "Salvando..." : "Salvar Maquininha"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
