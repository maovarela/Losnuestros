"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppContext } from "@/lib/app-context";
import { Icon } from "../_components/icon";
import { Pill } from "../_components/pill";

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

function freqVariant(freq: string | undefined): "info" | "warn" | "neutral" {
  if (freq === "bimonthly") return "info";
  if (freq === "monthly") return "warn";
  return "neutral";
}

function serviceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("compensar") || n.includes("salud")) return "health_and_safety";
  if (n.includes("enel") || n.includes("energ")) return "bolt";
  if (n.includes("gas")) return "local_fire_department";
  if (n.includes("agua") || n.includes("acueducto")) return "water_drop";
  if (n.includes("internet")) return "wifi";
  if (n.includes("celular")) return "smartphone";
  if (n.includes("alarma")) return "security";
  return "receipt_long";
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
    <main>
      {refs === undefined && (
        <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
          Cargando...
        </div>
      )}

      {grouped.servicios.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Servicios públicos</h2>
          <div className="space-y-3">
            {grouped.servicios.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-l-4 border-border border-l-amber bg-bg p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-bg text-amber"
                  >
                    <Icon name={serviceIcon(r.service_name)} className="text-3xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold leading-tight">
                        {r.service_name}
                      </h3>
                      {r.frequency && (
                        <Pill variant={freqVariant(r.frequency)}>
                          {frequencyLabel(r.frequency, r.due_day)}
                        </Pill>
                      )}
                    </div>
                    {(r.amount_reference || r.amount_label) && (
                      <div className="mt-1 text-lg font-medium tabular-nums">
                        {r.amount_label ?? fmtCOP(r.amount_reference!)}
                      </div>
                    )}
                    {r.details && r.details.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-border pt-2">
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
                    {r.notes && (
                      <div className="mt-2 text-xs text-text-3">{r.notes}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {grouped.hogar.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Gastos fijos del hogar</h2>
          <div className="space-y-3">
            {grouped.hogar.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-l-4 border-border border-l-amber bg-bg p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-bg text-amber"
                  >
                    <Icon name="home" className="text-3xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-tight">
                      {r.service_name}
                    </h3>
                    {(r.amount_reference || r.amount_label) && (
                      <div className="mt-1 text-lg font-medium tabular-nums">
                        {r.amount_label ?? fmtCOP(r.amount_reference!)}
                      </div>
                    )}
                    {r.details && r.details.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-border pt-2">
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
