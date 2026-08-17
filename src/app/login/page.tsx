import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginHubPage() {
  return (
    <AuthShell wide>
      <AuthPortalPicker mode="login" />
    </AuthShell>
  );
}
