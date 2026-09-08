import { useRef } from "react";

/** Sempre aponta para o valor mais recente — evita closure velha no `useActionState`. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
