import Link from "next/link";
import { Sparkles } from "lucide-react";
import { isDemoLoginEnabled } from "@/lib/demo-mode";
import { DEMO_ACCOUNTS, type DemoRoleKey } from "@/lib/demo-accounts";
import { demoLoginAction } from "@/actions/demo-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_ORDER: DemoRoleKey[] = ["director", "secretary", "professor", "student", "parent", "pin"];

export function DemoQuickAccess({ compact = false }: { compact?: boolean }) {
  if (!isDemoLoginEnabled()) return null;

  if (compact) {
    return (
      <Link href="/demo/director">
        <Button size="lg" className="w-full gap-2 sm:w-auto">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Demonstração ao vivo
        </Button>
      </Link>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900 dark:from-amber-950/40 dark:to-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Acesso demo instantâneo
        </CardTitle>
        <CardDescription>
          Entre com um clique — sem digitar senha. Ideal para apresentações.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_ORDER.map((role) => {
          const account = DEMO_ACCOUNTS[role];
          return (
            <form key={role} action={demoLoginAction}>
              <input type="hidden" name="role" value={role} />
              <Button type="submit" variant="outline" className="h-auto w-full py-3 text-left">
                <span className="block font-semibold">{account.label}</span>
                <span className="block text-xs font-normal text-slate-500">
                  {account.type === "pin"
                    ? `PIN ${account.enrollmentCode}`
                    : account.email}
                </span>
              </Button>
            </form>
          );
        })}
        <Link href="/demo/director" className="sm:col-span-2 lg:col-span-3">
          <Button className="w-full" size="lg">
            Entrar agora como diretor (automático)
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
