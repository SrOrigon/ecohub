import { WifiOff, RefreshCcw } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Você está Offline | Ecohub",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="mb-8 rounded-full bg-slate-100 p-6 dark:bg-slate-900">
        <WifiOff className="h-16 w-16 text-slate-400" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
        Você está offline
      </h1>
      <p className="mb-8 max-w-sm text-slate-500 dark:text-slate-400">
        Parece que você perdeu a conexão com a internet. Verifique sua rede e tente novamente. Algumas páginas podem estar disponíveis no modo offline se você as visitou recentemente.
      </p>

      {/* Client-side script to reload when online */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.addEventListener('online', () => {
            window.location.reload();
          });
        `
      }} />

              <Link
        href="/"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 transition-transform active:scale-95"
      >
        <RefreshCcw className="h-4 w-4" />
        Tentar Novamente
              </Link>
    </div>
  );
}
