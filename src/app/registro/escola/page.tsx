import { RegisterSchoolForm } from "@/components/auth/register-school-form";
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
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RegisterSchoolForm volumeReady={ready} volumeReason={reason} />
    </main>
  );
}
