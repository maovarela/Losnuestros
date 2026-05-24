import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convex } from "@/lib/convex-server";
import { getSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";

function fmtCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function todayInSpanish(): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formatted = formatter.format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default async function AbuelaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const patient = await convex().query(api.patients.getDefault, {});
  if (!patient) redirect("/");

  const [latestSaldo, meds] = await Promise.all([
    convex().query(api.financeMonths.getLatestSaldo, {
      patientId: patient._id,
    }),
    convex().query(api.medications.listByPatient, {
      patientId: patient._id,
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-10">
      <header className="text-center">
        <div className="text-xl text-text-2">{todayInSpanish()}</div>
        <h1 className="mt-2 text-3xl font-medium">{patient.name}</h1>
      </header>

      <section className="mt-10 rounded-2xl border border-green-border bg-green-bg p-8 text-center">
        <div className="text-base font-medium uppercase tracking-wider text-green">
          Saldo en el banco
        </div>
        <div className="mt-3 text-5xl font-medium text-green tabular-nums">
          {latestSaldo ? fmtCOP(latestSaldo.saldo!) : "Sin dato"}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-medium uppercase tracking-wider text-text-3">
          Medicamentos del día
        </h2>
        {meds.length === 0 ? (
          <div className="mt-4 text-lg text-text-2">
            No hay medicamentos en la lista.
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {meds.map((m) => (
              <li
                key={m._id}
                className="rounded-xl border border-border bg-bg p-5"
              >
                <div className="text-xl font-medium">{m.name}</div>
                {m.dosage && (
                  <div className="mt-2 text-base text-text-2">{m.dosage}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
