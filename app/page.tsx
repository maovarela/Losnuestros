import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-server";

type ErrorReason = "consumed" | "expired" | "invalid" | "server";

const ERROR_MESSAGES: Record<ErrorReason, string> = {
  consumed: "Este link ya fue usado. Pídele a quien te lo envió que te genere otro.",
  expired: "Este link venció. Pídele a quien te lo envió que te genere otro.",
  invalid: "Este link no es válido. Verifica que esté completo.",
  server: "Hubo un problema del lado del servidor. Intenta de nuevo en un rato.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");

  const { error } = await searchParams;
  const errorMessage =
    error && error in ERROR_MESSAGES ? ERROR_MESSAGES[error as ErrorReason] : null;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-10">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue"
        >
          LN
        </div>
        <div>
          <div className="text-lg font-medium">Organizador familiar</div>
          <div className="text-sm text-text-2">Acceso solo por invitación</div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-xl border border-red-border bg-red-bg p-6">
          <div className="text-sm font-medium text-red">No pudimos abrir tu sesión</div>
          <div className="mt-1 text-sm text-red">{errorMessage}</div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-bg p-6">
        <div className="text-sm text-text-2">
          Esta app se accede por un link de invitación. Pídele a quien te configuró el acceso que te lo comparta.
        </div>
      </div>
    </main>
  );
}
