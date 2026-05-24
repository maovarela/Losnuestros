import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-server";
import { getSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const session = await getSession();
  if (!session) return null;

  const [patient, caregiver] = await Promise.all([
    convex().query(api.patients.getDefault, {}),
    convex().query(api.caregivers.getById, {
      id: session.caregiverId as Id<"caregivers">,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-10">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue">
          {patient?.avatar_initials ?? "AO"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-medium">{patient?.name}</div>
          {caregiver && (
            <div className="text-sm text-text-2">
              Sesión: <span className="font-medium text-text">{caregiver.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg p-6">
        <div className="text-sm text-text-2">
          Los tabs (Medicamentos, Citas, Referencias, Finanzas) llegan en las próximas fases.
        </div>
      </div>
    </div>
  );
}
