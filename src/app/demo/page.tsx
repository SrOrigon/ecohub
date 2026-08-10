import { redirect } from "next/navigation";
import { DEFAULT_DEMO_ROLE } from "@/lib/demo-accounts";
import { isDemoLoginEnabled } from "@/lib/demo-mode";

export default function DemoIndexPage() {
  if (!isDemoLoginEnabled()) {
    redirect("/login?error=demo-indisponivel");
  }
  redirect(`/demo/${DEFAULT_DEMO_ROLE}`);
}
