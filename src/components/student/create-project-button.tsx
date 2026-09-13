"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/actions/projects";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const projectUrl = formData.get("projectUrl") as string;
    const imageUrl = formData.get("imageUrl") as string;

    try {
      await createProject({ title, description, projectUrl, imageUrl });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar projeto.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Enviar Meu Game/Projeto
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Enviar Novo Projeto">
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-slate-500">
              Mostre para a escola o que você construiu! Adicione a URL do seu game ou projeto.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="title">Título do Projeto</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Jogo da Memória Eco"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Como jogar? O que o projeto faz?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectUrl">URL do Jogo/Projeto</Label>
              <Input
                id="projectUrl"
                name="projectUrl"
                type="url"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">URL da Capa (Imagem)</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://... (URL da imagem)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar Projeto"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
