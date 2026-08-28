import mammoth from "mammoth";

type HtmlToDocxFn = (
  html: string,
  headerHTMLString: string | null,
  documentOptions?: Record<string, unknown>
) => Promise<Buffer | ArrayBuffer | Uint8Array>;

export async function importDocxToHtml(buffer: Buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    }
  );
  return {
    html: result.value || "<p></p>",
    messages: result.messages.map((message) => message.message),
  };
}

export async function exportHtmlToDocx(html: string, fileName: string) {
  const HTMLtoDOCX = (await import("html-to-docx")).default as HtmlToDocxFn;
  const wrapped = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.4;">
      ${html}
    </body></html>
  `;
  const buffer = await HTMLtoDOCX(wrapped, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  return {
    buffer: Buffer.from(bytes),
    fileName: fileName.endsWith(".docx") ? fileName : `${fileName}.docx`,
  };
}
