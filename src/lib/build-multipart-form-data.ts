/** Monta FormData com campos de texto explícitos (evita perda de e-mail/senha em uploads). */
export function buildMultipartFormData(
  form: HTMLFormElement,
  textFields: string[]
): FormData {
  const fd = new FormData();

  for (const name of textFields) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      fd.set(name, field.value);
    } else if (field instanceof RadioNodeList) {
      const checked = Array.from(field).find((el) => el instanceof HTMLInputElement && el.checked);
      if (checked instanceof HTMLInputElement) fd.set(name, checked.value);
    }
  }

  for (const el of form.elements) {
    if (!(el instanceof HTMLInputElement)) continue;
    if (el.type !== "file" || !el.name) continue;
    const file = el.files?.[0];
    if (file && file.size > 0) fd.set(el.name, file);
  }

  return fd;
}
