import { prisma } from "@/lib/db";
import { submitEnrollmentAction } from "@/actions/product-suite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { notFound } from "next/navigation";

export default async function InscricaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { slug } = await params;
  const { ok, erro } = await searchParams;
  const school = await prisma.school.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      name: true,
      slug: true,
      city: true,
      state: true,
      classGroups: { select: { id: true, name: true, gradeLevel: true }, orderBy: { name: "asc" } },
    },
  });
  if (!school) notFound();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 to-white px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-sm font-medium text-indigo-600">Matrícula online</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{school.name}</h1>
          {school.city && (
            <p className="text-sm text-slate-500">
              {school.city}
              {school.state ? `, ${school.state}` : ""}
            </p>
          )}
        </header>

        {ok === "1" && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900">
            Inscrição enviada com sucesso! A secretaria entrará em contato em breve.
          </p>
        )}
        {erro && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-900">
            {erro === "escola"
              ? "Instituição não encontrada."
              : erro === "data"
                ? "Data de nascimento inválida."
                : "Preencha todos os campos obrigatórios."}
          </p>
        )}

        <form
          action={submitEnrollmentAction}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="schoolSlug" value={school.slug} />

          <div>
            <Label htmlFor="studentName">Nome completo do aluno</Label>
            <Input id="studentName" name="studentName" required />
          </div>
          <div>
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" name="birthDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="gradeLevel">Curso desejado</Label>
            {school.classGroups.length > 0 ? (
              <Select id="gradeLevel" name="gradeLevel" required defaultValue="">
                <option value="" disabled>
                  Selecione o curso...
                </option>
                {school.classGroups.map((curso) => (
                  <option key={curso.id} value={curso.name}>
                    {curso.name}
                    {curso.gradeLevel ? ` · ${curso.gradeLevel}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input id="gradeLevel" name="gradeLevel" required placeholder="Ex.: Design de Games Kids" />
            )}
          </div>
          <hr className="border-slate-100" />
          <div>
            <Label htmlFor="parentName">Nome do responsável</Label>
            <Input id="parentName" name="parentName" required />
          </div>
          <div>
            <Label htmlFor="parentEmail">E-mail do responsável</Label>
            <Input id="parentEmail" name="parentEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="parentPhone">Telefone (WhatsApp)</Label>
            <Input id="parentPhone" name="parentPhone" type="tel" placeholder="(11) 99999-9999" />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Enviar inscrição
          </Button>
          <p className="text-center text-xs text-slate-500">
            A secretaria entrará em contato após análise da inscrição.
          </p>
        </form>
      </div>
    </div>
  );
}
