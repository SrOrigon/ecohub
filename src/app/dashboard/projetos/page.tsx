import { getSessionUser } from "@/lib/auth";
import { getProjects } from "@/actions/projects";
import { PageHeader } from "@/components/layout/page-header";
import { CreateProjectButton } from "@/components/student/create-project-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Gamepad2, User, Image as ImageIcon } from "lucide-react";

import { redirect } from "next/navigation";

export default async function ProjetosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Galeria de Games e Projetos"
        description="Explore os jogos e projetos desenvolvidos pelos alunos da escola."
      >
        {user.role === "student" && <CreateProjectButton />}
      </PageHeader>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-16 text-center">
          <Gamepad2 className="mb-4 h-12 w-12 text-indigo-300" aria-hidden="true" />
          <h2 className="text-xl font-bold text-indigo-900">Nenhum projeto ainda</h2>
          <p className="mt-2 text-indigo-600">Seja o primeiro a enviar um game ou projeto!</p>
          {user.role === "student" && (
            <div className="mt-6">
              <CreateProjectButton />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project, index) => (
            <Card
              key={project.id}
              className={`group flex h-full flex-col animate-fade-in-up stagger-${(index % 8) + 1} overflow-hidden rounded-xl border-2 border-indigo-100 shadow-sm transition-all hover:border-indigo-300 hover:shadow-lg dark:border-indigo-900 dark:bg-slate-900`}
            >
              <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {project.imageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt={`Capa do projeto ${project.title}`}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="line-clamp-1 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {project.title}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{project.student.user.fullName}</span>
                </div>
                {project.student.classGroup && (
                  <Badge variant="secondary" className="mt-2 w-fit text-xs font-normal">
                    {project.student.classGroup.name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-2">
                <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                  {project.description || "Sem descrição."}
                </p>
              </CardContent>
              {project.projectUrl && (
                <div className="p-4 pt-0 mt-auto">
                  <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                    <Button className="w-full gap-2 rounded-lg" variant="default">
                      Jogar / Acessar <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
