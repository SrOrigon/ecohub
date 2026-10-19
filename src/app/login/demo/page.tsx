import { AuthShell } from "@/components/auth/auth-shell";
import { DemoLoginHub } from "@/components/auth/demo-login-hub";

export const metadata = {
  title: "Login demo | Ecohub",
  description: "Demonstração com instituição, professor e aluno.",
};

export default function LoginDemoPage() {
  return (
    <AuthShell wide>
      <DemoLoginHub />
    </AuthShell>
  );
}
