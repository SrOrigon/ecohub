"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { eduhubAiChatAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { Bot, Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export function EduHubAiChat({
  assistantName,
  suggestions,
}: {
  assistantName: string;
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Olá! Sou a **${assistantName}**, assistente pedagógica local da EduHub — treinada para BNCC, sem uso de APIs externas. Como posso ajudar?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);

    const fd = new FormData();
    fd.set("message", trimmed);
    startTransition(async () => {
      const result = await eduhubAiChatAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.reply) {
        setMessages((m) => [...m, { role: "assistant", content: result.reply! }]);
      }
    });
  }

  return (
    <div className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{assistantName}</p>
          <p className="text-xs text-slate-500">IA especialista local · sem API externa</p>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-amber-500" aria-hidden="true" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-slate-50 text-slate-800 ring-1 ring-slate-100"
            }`}
          >
            <AiMessageContent content={msg.content} />
          </div>
        ))}
        {pending && (
          <p className="text-sm text-slate-500" aria-live="polite">
            {assistantName} está pensando…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {suggestions.length > 0 && messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="px-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form
        className="flex gap-2 border-t border-slate-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre BNCC, exercícios, comunicados…"
          rows={2}
          className="min-h-0 flex-1 resize-none"
          aria-label="Mensagem para a EduHub IA"
        />
        <Button type="submit" disabled={pending || !input.trim()} className="shrink-0 self-end">
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Enviar</span>
        </Button>
      </form>
    </div>
  );
}

function AiMessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
