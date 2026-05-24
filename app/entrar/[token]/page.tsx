import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convex } from "@/lib/convex-server";
import { setSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export default async function EntrarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await convex().mutation(api.invitations.consume, { token });

  if (!result.ok) {
    const mensaje =
      result.error === "consumed"
        ? "Este link ya fue usado. Pedile a quien te lo envió que te genere otro."
        : result.error === "expired"
          ? "Este link venció. Pedile a quien te lo envió que te genere otro."
          : "Este link no es válido. Verificá que esté completo.";

    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <div className="rounded-xl border border-red-border bg-red-bg p-6">
          <div className="text-lg font-medium text-red">No pudimos abrir tu sesión</div>
          <div className="mt-2 text-sm text-red">{mensaje}</div>
        </div>
      </div>
    );
  }

  await setSession(result.caregiverId);
  redirect("/app");
}
