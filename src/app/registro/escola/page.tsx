import { RegisterSchoolForm } from "@/components/auth/register-school-form";
import { getPersistentVolumeStatus } from "@/lib/persistence-guard";

export const dynamic = "force-dynamic";

export default function RegisterEscolaPage() {
  const volume = getPersistentVolumeStatus();

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RegisterSchoolForm volumeReady={volume.mounted} volumeReason={volume.reason} />
    </main>
  );
}
