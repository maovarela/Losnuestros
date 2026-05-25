import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppProvider } from "@/lib/app-context";
import { convex } from "@/lib/convex-server";
import { ConvexClientProvider } from "@/lib/convex-client";
import { DropProvider } from "@/lib/drop-context";
import { getSession } from "@/lib/session-server";
import { DragDropOverlay } from "./_components/drag-drop-overlay";
import { Tabs } from "./_components/tabs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const [patient, caregiver] = await Promise.all([
    convex().query(api.patients.getDefault, {}),
    convex().query(api.caregivers.getById, {
      id: session.caregiverId as Id<"caregivers">,
    }),
  ]);

  if (!patient || !caregiver) redirect("/");
  if (caregiver.role === "patient") redirect("/abuela");

  const [allCaregivers, patientCaregiverRecord] = await Promise.all([
    convex().query(api.caregivers.listByPatient, { patientId: patient._id }),
    convex().query(api.caregivers.getPatientCaregiver, {
      patientId: patient._id,
    }),
  ]);
  const otherCaregivers = allCaregivers
    .filter((c) => c._id !== caregiver._id)
    .map((c) => ({ id: c._id, name: c.name }));
  const patientCaregiver = patientCaregiverRecord
    ? {
        id: patientCaregiverRecord._id,
        name: patientCaregiverRecord.name
          .split(/\s+/)
          .slice(0, 2)
          .join(" "),
      }
    : null;

  return (
    <ConvexClientProvider>
      <AppProvider
        value={{
          caregiverId: caregiver._id,
          caregiverName: caregiver.name,
          patientId: patient._id,
          patientName: patient.name,
          patientInitials: patient.avatar_initials,
          otherCaregivers,
          patientCaregiver,
        }}
      >
        <DropProvider>
          <div className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-12">
            <header className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue"
              >
                {patient.avatar_initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-medium">{patient.name}</div>
                <div className="text-xs text-text-2">
                  Sesión:{" "}
                  <span className="font-medium text-text">{caregiver.name}</span>
                </div>
              </div>
            </header>
            <Tabs />
            {children}
          </div>
          <DragDropOverlay />
        </DropProvider>
      </AppProvider>
    </ConvexClientProvider>
  );
}
