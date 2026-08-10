import { performDemoLogin } from "@/actions/demo-login";
import { isDemoRoleKey } from "@/lib/demo-accounts";
import { redirect } from "next/navigation";

export default async function DemoAutoLoginPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isDemoRoleKey(role)) {
    redirect("/demo/director");
  }
  await performDemoLogin(role);
}
