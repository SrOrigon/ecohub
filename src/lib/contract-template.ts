import { DEFAULT_CONTRACT_HTML } from "@/lib/document-types";
import type { SchoolSettings } from "@/lib/school-settings";

/** HTML do modelo de contrato da instituição (ou padrão genérico do sistema). */
export function getContractTemplateHtml(settings: SchoolSettings): string {
  const custom = settings.documents.contractTemplateHtml?.trim();
  return custom || DEFAULT_CONTRACT_HTML;
}

export function hasInstitutionContractTemplate(settings: SchoolSettings): boolean {
  return Boolean(settings.documents.contractTemplateHtml?.trim());
}

/**
 * Ajusta HTML importado de .docx: troca dados fixos de exemplo por campos de mesclagem.
 * Cada instituição mantém o layout do seu Word; o sistema só injeta tags padrão.
 */
export function prepareImportedContractHtml(html: string): string {
  let prepared = html.trim();
  if (!prepared) return prepared;

  const replacements: Array<[RegExp, string]> = [
    [/MASTER TEK SOLUTIONS LTDA ME/gi, "<<RazaoSocialEscola>>"],
    [/60\.916\.740\/0001-02/g, "<<CnpjEscola>>"],
    [/RUA MACEDO COIMBRA/gi, "<<EnderecoEscola>>"],
    [/RIO DE JANEIRO\/RJ/gi, "<<CidadeEscola>>/<<EstadoEscola>>"],
    [/CAMPO GRANDE/gi, "<<BairroEscola>>"],
    [/(<strong>Nº do Contrato<\/strong><\/p><\/td><td><p><strong>\s*Data do Contrato<\/strong>)/i, "<strong>Nº do Contrato</strong> &lt;&lt;NumeroContrato&gt;&gt;</p></td><td><p><strong>Data do Contrato</strong> &lt;&lt;DataContrato&gt;&gt;"],
    [/(<strong>NOME DO ALUNO<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;NomeAluno&gt;&gt;$2"],
    [/(<strong>Data de Nascimento<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;DataNascAluno&gt;&gt;$2"],
    [/(<strong>Idade<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;IdadeAluno&gt;&gt; anos$2"],
    [/(<strong>Endereço<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;EnderecoAluno&gt;&gt;$2"],
    [/(<strong>CEP<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/gi, "$1&lt;&lt;CepAluno&gt;&gt;$2"],
    [/(<strong>Telefone<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;TelefoneAluno&gt;&gt;$2"],
    [/(<strong>Curso:<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;TurmaAluno&gt;&gt;$2"],
    [/(<strong>Data Inicial:<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;DataInicioContrato&gt;&gt;$2"],
    [/(<strong>Previsão de Término:<\/strong><br\s*\/?><br\s*\/?>)\s*(<\/p>)/i, "$1&lt;&lt;DataFimContrato&gt;&gt;$2"],
  ];

  for (const [pattern, replacement] of replacements) {
    prepared = prepared.replace(pattern, replacement);
  }

  return prepared;
}
