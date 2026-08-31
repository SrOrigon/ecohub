"use client";

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  // Limpa markdown básico para leitura limpa
  const cleanText = text
    .replace(/[#*_`~>-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "pt-BR";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Tenta encontrar uma voz em português
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find((v) => v.lang.startsWith("pt") || v.lang.includes("BR"));
  if (ptVoice) {
    utterance.voice = ptVoice;
  }

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
