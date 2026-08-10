import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRewardCategoryForm } from "@/components/forms/create-reward-category-form";
import { EditRewardCategoryForm } from "@/components/forms/edit-reward-category-form";
import { ToggleRewardCategoryButton } from "@/components/forms/toggle-reward-category-button";
import { DeleteRewardCategoryButton } from "@/components/forms/delete-reward-category-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";

export type RewardCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { rewards: number };
};

export function InstitutionShopCategories({ categories }: { categories: RewardCategoryRow[] }) {
  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/20">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Categorias da loja
          </CardTitle>
          <CardDescription className="mt-1 max-w-2xl">
            A instituição define as categorias exibidas na vitrine. Depois, vincule cada item a uma
            delas ao cadastrar prêmios.
          </CardDescription>
        </div>
        <CreateRewardCategoryForm />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="default">{activeCount} ativa(s)</Badge>
          <Badge variant="secondary">{categories.length} cadastrada(s)</Badge>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhuma categoria"
            description='Crie categorias como "Lanches", "Material escolar" ou "Benefícios" antes de cadastrar itens.'
            className="py-6"
          />
        ) : (
          <ResponsiveTable minWidth="32rem" className="rounded-xl border border-slate-200 bg-white">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                <th scope="col" className="px-4 py-3 font-medium">Categoria</th>
                <th scope="col" className="px-4 py-3 font-medium">Ordem</th>
                <th scope="col" className="px-4 py-3 font-medium">Itens</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{cat.name}</p>
                    {cat.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{cat.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cat.sortOrder}</td>
                  <td className="px-4 py-3 text-slate-600">{cat._count.rewards}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cat.isActive ? "success" : "secondary"}>
                      {cat.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <EditRewardCategoryForm category={cat} />
                      <ToggleRewardCategoryButton categoryId={cat.id} isActive={cat.isActive} />
                      <DeleteRewardCategoryButton categoryId={cat.id} hasItems={cat._count.rewards > 0} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
}
