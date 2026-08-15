/** Re-lança redirects do Next.js dentro de useActionState (evita tela de erro após login/cadastro). */
export function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function runServerAction<T>(action: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await action();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[action]", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") {
      return { error: "Sessão expirada. Faça login novamente." };
    }
    if (message === "FORBIDDEN") {
      return { error: "Sem permissão para esta ação." };
    }
    if (message.includes("PERSISTENCE_UNAVAILABLE")) {
      return {
        error:
          "O volume persistente /data não está montado no Railway. Sem ele, o cadastro seria perdido no próximo deploy.",
      };
    }
    return {
      error:
        message && message.length < 180 && !message.includes("prisma")
          ? message
          : "Não foi possível concluir agora. Tente novamente em instantes.",
    };
  }
}
