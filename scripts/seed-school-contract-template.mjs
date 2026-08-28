#!/usr/bin/env node
/**
 * Importa modelo de contrato .docx para UMA instituição (settings da escola).
 * Não altera outras escolas nem o modelo padrão global do sistema.
 *
 * Uso:
 *   node scripts/seed-school-contract-template.mjs --file "C:/Users/.../CONTRATO.docx" --school "ORION"
 *   node scripts/seed-school-contract-template.mjs --file ./modelo.docx --school-id clxxx
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import mammoth from "mammoth";

function parseArgs(argv) {
  const args = { file: "", school: "", schoolId: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--file" && value) {
      args.file = value;
      i += 1;
    } else if (key === "--school" && value) {
      args.school = value;
      i += 1;
    } else if (key === "--school-id" && value) {
      args.schoolId = value;
      i += 1;
    }
  }
  return args;
}

function prepareImportedContractHtml(html) {
  let prepared = html.trim();
  const replacements = [
    [/MASTER TEK SOLUTIONS LTDA ME/gi, "<<RazaoSocialEscola>>"],
    [/60\.916\.740\/0001-02/g, "<<CnpjEscola>>"],
    [/RUA MACEDO COIMBRA/gi, "<<EnderecoEscola>>"],
    [/RIO DE JANEIRO\/RJ/gi, "<<CidadeEscola>>/<<EstadoEscola>>"],
    [/CAMPO GRANDE/gi, "<<BairroEscola>>"],
  ];
  for (const [pattern, replacement] of replacements) {
    prepared = prepared.replace(pattern, replacement);
  }
  return prepared;
}

function mergeDocumentsSettings(rawSettings, documentsPatch) {
  let settings = {};
  try {
    settings = rawSettings ? JSON.parse(rawSettings) : {};
  } catch {
    settings = {};
  }
  settings.documents = {
    ...(settings.documents ?? {}),
    ...documentsPatch,
  };
  return JSON.stringify(settings);
}

async function main() {
  const { file, school, schoolId } = parseArgs(process.argv);
  if (!file) {
    console.error("Informe --file com o caminho do .docx");
    process.exit(1);
  }
  if (!schoolId && !school) {
    console.error("Informe --school (nome parcial) ou --school-id");
    process.exit(1);
  }

  const buffer = readFileSync(file);
  const converted = await mammoth.convertToHtml({ buffer });
  const html = prepareImportedContractHtml(converted.value || "");

  const prisma = new PrismaClient();
  try {
    const target = schoolId
      ? await prisma.school.findUnique({ where: { id: schoolId } })
      : await prisma.school.findFirst({
          where: {
            OR: [
              { name: { contains: school, mode: "insensitive" } },
              { slug: { contains: school.toLowerCase() } },
              { legalName: { contains: school, mode: "insensitive" } },
            ],
          },
        });

    if (!target) {
      console.error("Instituição não encontrada.");
      process.exit(1);
    }

    const sourceName = file.split(/[\\/]/).pop() ?? "modelo.docx";
    const nextSettings = mergeDocumentsSettings(target.settings, {
      contractTemplateHtml: html,
      contractTemplateSourceName: sourceName,
      contractTemplateUpdatedAt: new Date().toISOString(),
    });

    await prisma.school.update({
      where: { id: target.id },
      data: { settings: nextSettings },
    });

    console.log(
      `[contract-template] Modelo salvo para "${target.name}" (${target.id}) — ${html.length} caracteres, origem ${sourceName}.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
