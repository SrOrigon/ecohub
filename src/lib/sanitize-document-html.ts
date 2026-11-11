const DROP_WITH_CONTENT =
  /<(script|style|iframe|object|embed|svg|math|noscript|template|form|textarea|button|select|option|applet|frame|frameset|video|audio|link|meta|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

const DROP_TAG =
  /<\/?(script|style|iframe|object|embed|svg|math|noscript|template|form|textarea|button|select|option|input|applet|frame|frameset|video|audio|source|track|link|meta|base)\b[^>]*\/?\s*>/gi;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeForCheck(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, num: string) => String.fromCharCode(Number(num)))
    .replace(/&colon;/gi, ":")
    .replace(/\s+/g, "");
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  const decoded = decodeForCheck(trimmed);
  if (/^(javascript|data|vbscript):/i.test(decoded)) return "";
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return "";
}

function safeStyle(value: string) {
  const decoded = decodeForCheck(value);
  if (/expression\s*\(|url\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(decoded)) {
    return "";
  }
  return value.replace(/[<>]/g, "");
}

/** Remove script, eventos e URLs perigosas de HTML de contrato/documento. */
export function sanitizeDocumentHtml(html: string) {
  let out = html.replace(/<!--[\s\S]*?-->/g, "");
  for (let pass = 0; pass < 4; pass += 1) {
    const next = out.replace(DROP_WITH_CONTENT, "");
    if (next === out) break;
    out = next;
  }
  out = out.replace(DROP_TAG, "");
  out = out.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(
    /\s(href|src|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (_match, attr: string, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
      const safe = safeUrl(doubleQuoted ?? singleQuoted ?? bare ?? "");
      if (!safe) return "";
      return ` ${attr}="${escapeHtml(safe)}"`;
    }
  );
  out = out.replace(
    /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (_match, doubleQuoted?: string, singleQuoted?: string) => {
      const safe = safeStyle(doubleQuoted ?? singleQuoted ?? "");
      if (!safe.trim()) return "";
      return ` style="${escapeHtml(safe)}"`;
    }
  );
  return out;
}
