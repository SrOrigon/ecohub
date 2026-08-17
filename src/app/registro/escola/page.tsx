import { RegisterSchoolForm } from "@/components/auth/register-school-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPersistentVolumeStatus, isDurablePersistenceReady } from "@/lib/persistence-guard";
import { isManagedPostgres } from "@/lib/database-mode";

export const dynamic = "force-dynamic";

export default function RegisterEscolaPage() {
  const ready = isDurablePersistenceReady();
  const volume = getPersistentVolumeStatus();
  const reason = ready
    ? null
    : isManagedPostgres()
      ? null
      : volume.reason;

  return (
    <AuthShell>
      <RegisterSchoolForm volumeReady={ready} volumeReason={reason} />
    </AuthShell>
  );
}
