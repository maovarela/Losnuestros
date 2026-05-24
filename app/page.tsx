import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-server";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-10">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue">
          AO
        </div>
        <div>
          <div className="text-lg font-medium">Ana María Ortega Salcedo</div>
          <div className="text-sm text-text-2">Organizador familiar</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg p-6">
        <div className="text-sm text-text-2">
          Esta app se accede por un link de invitación. Pedile a quien te configuró el acceso que te lo comparta.
        </div>
      </div>
    </div>
  );
}
