"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppContext } from "@/lib/app-context";

function fmtCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function frequencyLabel(freq: string | undefined, dueDay: number | undefined): string {
  if (!freq) return "";
  if (freq === "monthly") return dueDay ? `Antes del ${dueDay} de cada mes` : "Mensual";
  if (freq === "bimonthly") return dueDay ? `Bimestral · antes del ${dueDay}` : "Cada 2 meses";
  if (freq === "weekly") return "Semanal";
  if (freq === "per_visit") return "Por visita";
  return freq;
}

function freqBadgeClass(freq: string | undefined): string {
  if (freq === "bimonthly") return "bg-blue-bg text-blue";
  return "bg-amber-bg text-amber";
}

export default function ReferenciasPage() {
  const { patientId } = useAppContext();
  const refs = useQuery(api.paymentReferences.listByPatient, { patientId });

  const grouped = useMemo(() => {
    if (!refs) return { servicios: [], hogar: [] };
    return {
      servicios: refs.filter((r) => r.category === "service"),
      hogar: refs.filter((r) => r.category === "household"),
    };
  }, [refs]);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-6">
      <Link
        href="/app"
        className="mb-4 inline-block text-sm text-text-2 hover:text-text"
      >
        Volver al inicio
      </Link>

      <h1 className="text-xl font-medium">Referencias de pago</h1>

      {refs === undefined && (
        <div className="mt-6 rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
          Cargando...
        </div>
      )}

      {grouped.servicios.length > 0 && (
        <>
          <div className="mt-6 mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
            Servicios públicos
          </div>
          <div className="space-y-3">
            {grouped.servicios.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-border bg-bg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-medium">{r.service_name}</div>
                  {r.frequency && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${freqBadgeClass(r.frequency)}`}
                    >
                      {frequencyLabel(r.frequency, r.due_day)}
                    </span>
                  )}
                </div>
                {r.details && r.details.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {r.details.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline justify-between text-sm"
                      >
                        <span className="text-text-2">{d.label}</span>
                        <span className="font-mono text-xs">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(r.amount_reference || r.amount_label) && (
                  <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2 text-sm">
                    <span className="text-text-2">Valor ref.</span>
                    <span className="font-medium">
                      {r.amount_label ?? fmtCOP(r.amount_reference!)}
                    </span>
                  </div>
                )}
                {r.notes && (
                  <div className="mt-2 text-xs text-text-3">{r.notes}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {grouped.hogar.length > 0 && (
        <>
          <div className="mt-6 mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
            Gastos fijos del hogar
          </div>
          <div className="space-y-3">
            {grouped.hogar.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-border bg-bg p-4"
              >
                <div className="text-base font-medium">{r.service_name}</div>
                {(r.amount_reference || r.amount_label) && (
                  <div className="mt-1 text-sm text-text-2">
                    {r.amount_label ?? fmtCOP(r.amount_reference!)}
                  </div>
                )}
                {r.details && r.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {r.details.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline justify-between text-sm"
                      >
                        <span className="text-text-2">{d.label}</span>
                        <span>{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
