export const DOCUMENT_TYPES = [
  { value: "contract", label: "Contrato" },
  { value: "declaration", label: "Declaração" },
  { value: "certificate", label: "Certificado" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export const DOCUMENT_STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "final", label: "Finalizado" },
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]["value"];

export function documentTypeLabel(type: string) {
  return DOCUMENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function documentStatusLabel(status: string) {
  return DOCUMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export const DEFAULT_CONTRACT_HTML = `
<h2 style="text-align:center">CONTRATO DE PRESTAÇÃO DE SERVIÇO</h2>
<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse">
  <tr>
    <td><strong>Nº do Contrato:</strong> &lt;&lt;NumeroContrato&gt;&gt;</td>
    <td style="text-align:right"><strong>Data:</strong> &lt;&lt;DataContrato&gt;&gt;</td>
  </tr>
</table>
<h3>1. DA IDENTIFICAÇÃO DO ALUNO</h3>
<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse">
  <tr><td colspan="2"><strong>Nome:</strong> &lt;&lt;NomeAluno&gt;&gt;</td></tr>
  <tr>
    <td><strong>Data de nascimento:</strong> &lt;&lt;DataNascAluno&gt;&gt;</td>
    <td><strong>Idade:</strong> &lt;&lt;IdadeAluno&gt;&gt;</td>
  </tr>
  <tr>
    <td><strong>E-mail:</strong> &lt;&lt;EmailAluno&gt;&gt;</td>
    <td><strong>Telefone:</strong> &lt;&lt;TelefoneAluno&gt;&gt;</td>
  </tr>
  <tr><td colspan="2"><strong>Endereço:</strong> &lt;&lt;EnderecoAluno&gt;&gt;</td></tr>
  <tr><td colspan="2"><strong>Cidade/UF:</strong> &lt;&lt;CidadeAluno&gt;&gt; / &lt;&lt;EstadoAluno&gt;&gt;</td></tr>
  <tr><td colspan="2"><strong>Matrícula:</strong> &lt;&lt;CodigoMatricula&gt;&gt; · <strong>Turma:</strong> &lt;&lt;TurmaAluno&gt;&gt;</td></tr>
</table>
<h3>2. PRESTADORA DE SERVIÇOS</h3>
<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse">
  <tr><td colspan="2"><strong>Instituição:</strong> &lt;&lt;NomeEscola&gt;&gt;</td></tr>
  <tr><td colspan="2"><strong>Razão social:</strong> &lt;&lt;RazaoSocialEscola&gt;&gt;</td></tr>
  <tr><td><strong>CNPJ:</strong> &lt;&lt;CnpjEscola&gt;&gt;</td><td><strong>Cidade/UF:</strong> &lt;&lt;CidadeEscola&gt;&gt; / &lt;&lt;EstadoEscola&gt;&gt;</td></tr>
</table>
<p style="margin-top:24px">As partes acima identificadas celebram o presente contrato de prestação de serviços educacionais, regido pelas cláusulas abaixo, redigidas de acordo com as necessidades desta instituição.</p>
<p><br></p>
<p>______________________________________________</p>
<p>Assinatura do responsável</p>
`.trim();
