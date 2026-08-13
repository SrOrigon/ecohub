"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, QrCode } from "lucide-react";

export function TenantUrlCard({ slug, schoolName }: { slug: string; schoolName: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const pathUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/e/${slug}`
      : `/e/${slug}`;
  const pinUrl = `/e/${slug}/entrar`;
  const loginUrl = `/e/${slug}/login`;

  async function copy(text: string, key: string) {
    const full = text.startsWith("http") ? text : `${window.location.origin}${text}`;
    await navigator.clipboard.writeText(full);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Compartilhe estes links com famílias e professores de <strong>{schoolName}</strong>.
      </p>
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--border-subtle)] p-3">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Portal da escola</p>
          <p className="mt-1 break-all font-mono text-sm">{loginUrl}</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => copy(loginUrl, "login")}>
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {copied === "login" ? "Copiado!" : "Copiar"}
            </Button>
            <a href={loginUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" size="sm" variant="ghost">
                <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Abrir
              </Button>
            </a>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] p-3">
          <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Login aluno (PIN)</p>
          <p className="mt-1 break-all font-mono text-sm">{pinUrl}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => copy(pinUrl, "pin")}>
            <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {copied === "pin" ? "Copiado!" : "Copiar link PIN"}
          </Button>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
          <p className="flex items-center gap-1 text-xs font-medium uppercase text-indigo-800 dark:text-indigo-300">
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            Subdomínio (produção)
          </p>
          <p className="mt-1 font-mono text-sm">{slug}.ecohub.app</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Em desenvolvimento use <strong>{pathUrl}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
