/**
 * CLI para conta demo — usa tsx para importar src/lib/demo-student.ts
 * Uso: npx tsx scripts/demo-student.ts [--remove]
 */
import {
  ensureDemoStudent,
  logDemoCredentials,
  removeDemoStudent,
} from "../src/lib/demo-student";

async function main() {
  const remove = process.argv.includes("--remove");

  if (remove) {
    const result = await removeDemoStudent();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = await ensureDemoStudent();
  if (!result.ok) {
    console.error("[ecohub:demo]", result.error);
    process.exit(1);
  }
  logDemoCredentials(result);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[ecohub:demo] Falha:", error);
  process.exit(1);
});
