import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Evita flash de tema errado antes da hidratação do React. */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t==='dark'||t==='light'){document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
