import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterHubPage() {
  return (
    <AuthShell wide>
      <AuthPortalPicker mode="register" />
    </AuthShell>
  );
}
