import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppProvider } from "@/lib/app-context";
import { convex } from "@/lib/convex-server";
import { ConvexClientProvider } from "@/lib/convex-client";
import { getSession } from "@/lib/session-server";

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

  return (
    <ConvexClientProvider>
      <AppProvider
        value={{
          caregiverId: caregiver._id,
          caregiverName: caregiver.name,
          patientId: patient._id,
          patientName: patient.name,
          patientInitials: patient.avatar_initials,
        }}
      >
        {children}
      </AppProvider>
    </ConvexClientProvider>
  );
}
