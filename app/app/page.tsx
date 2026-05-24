"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

function daysUntilISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type ServiceKey =
  | "compensar"
  | "enel"
  | "gas"
  | "agua"
  | "internet"
  | "celular"
  | "alarma";

type Cta =
  | { kind: "refill"; medId: Id<"medications"> }
  | { kind: "pay"; service: ServiceKey }
  | { kind: "viewCita"; citaId: Id<"appointments"> };

type Alert = {
  key: string;
  severity: "danger" | "warn" | "info";
  title: string;
  sub: string;
  cta: Cta;
};

function mapServiceToFinanceKey(name: string): ServiceKey | null {
  const n = name.toLowerCase();
  if (n.includes("compensar")) return "compensar";
  if (n.includes("enel") || n.includes("codensa")) return "enel";
  if (n.includes("vanti") || n.includes("gas")) return "gas";
  if (n.includes("eaab") || n.includes("acueducto") || n.includes("agua")) return "agua";
  if (n.includes("internet")) return "internet";
  if (n.includes("celular")) return "celular";
  if (n.includes("alarma")) return "alarma";
  return null;
}

export default function AppHome() {
  const { patientId, patientName, patientInitials, caregiverId, caregiverName } =
    useAppContext();
  const monthKey = currentMonthKey();

  const meds = useQuery(api.medications.listByPatient, { patientId });
  const citas = useQuery(api.appointments.listByPatient, { patientId });
  const refs = useQuery(api.paymentReferences.listByPatient, { patientId });
  const finance = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey,
  });

  const markRefilled = useMutation(api.medications.markRefilled);
  const markServicePaid = useMutation(api.financeMonths.markServicePaid);

  const [pending, setPending] = useState<string | null>(null);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];

    if (meds) {
      for (const m of meds) {
        if (!m.next_refill) continue;
        const d = daysUntilISO(m.next_refill);
        if (d < 0) {
          out.push({
            key: `med-v-${m._id}`,
            severity: "danger",
            title: `Refill vencido: ${m.name}`,
            sub: `Debía hacerse el ${fmtDate(m.next_refill)}`,
            cta: { kind: "refill", medId: m._id },
          });
        } else if (d <= 7) {
          out.push({
            key: `med-p-${m._id}`,
            severity: "warn",
            title: `Refill próximo: ${m.name}`,
            sub:
              d === 0
                ? `Hoy (${fmtDate(m.next_refill)})`
                : d === 1
                  ? `Mañana (${fmtDate(m.next_refill)})`
                  : `En ${d} días (${fmtDate(m.next_refill)})`,
            cta: { kind: "refill", medId: m._id },
          });
        }
      }
    }

    if (citas) {
      for (const c of citas) {
        const d = daysUntilISO(c.date);
        if (d < 0 || d > 7) continue;
        out.push({
          key: `cita-${c._id}`,
          severity: d <= 1 ? "danger" : "warn",
          title:
            (d === 0 ? "Hoy: " : d === 1 ? "Mañana: " : `En ${d} días: `) +
            (c.doctor ?? "Cita médica"),
          sub: fmtDate(c.date) + (c.location ? ` · ${c.location}` : ""),
          cta: { kind: "viewCita", citaId: c._id },
        });
      }
    }

    if (refs) {
      const today = new Date().getDate();
      const paidMap: Partial<Record<ServiceKey, boolean>> = finance
        ? {
            compensar: finance.compensar_paid,
            enel: finance.enel_paid,
            gas: finance.gas_paid,
            agua: finance.agua_paid,
            internet: finance.internet_paid,
            celular: finance.celular_paid,
            alarma: finance.alarma_paid,
          }
        : {};

      for (const r of refs) {
        if (r.category !== "service" || !r.due_day || r.frequency !== "monthly")
          continue;
        const key = mapServiceToFinanceKey(r.service_name);
        if (!key || paidMap[key]) continue;
        const diff = r.due_day - today;
        if (diff < 0) {
          out.push({
            key: `pay-v-${r._id}`,
            severity: "danger",
            title: `${r.service_name}: vencido`,
            sub: `Debía pagarse antes del ${r.due_day}`,
            cta: { kind: "pay", service: key },
          });
        } else if (diff <= 5) {
          out.push({
            key: `pay-p-${r._id}`,
            severity: "warn",
            title: `${r.service_name}: vence en ${diff} día${diff === 1 ? "" : "s"}`,
            sub: `Antes del ${r.due_day} de este mes`,
            cta: { kind: "pay", service: key },
          });
        }
      }
    }

    out.sort((a, b) => {
      const order = { danger: 0, warn: 1, info: 2 } as const;
      return order[a.severity] - order[b.severity];
    });

    return out;
  }, [meds, citas, refs, finance]);

  const loading = meds === undefined || citas === undefined || refs === undefined;
  const groupedAlerts = useMemo(() => {
    const vencidos = alerts.filter((a) => a.severity === "danger");
    const proximos = alerts.filter((a) => a.severity !== "danger");
    return { vencidos, proximos };
  }, [alerts]);

  async function handleCta(alert: Alert) {
    setPending(alert.key);
    try {
      if (alert.cta.kind === "refill") {
        await markRefilled({ id: alert.cta.medId, updatedBy: caregiverId });
      } else if (alert.cta.kind === "pay") {
        await markServicePaid({
          patientId,
          updatedBy: caregiverId,
          monthKey,
          service: alert.cta.service,
        });
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue"
        >
          {patientInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-medium">{patientName}</div>
          <div className="text-sm text-text-2">
            Sesión: <span className="font-medium text-text">{caregiverName}</span>
          </div>
        </div>
      </div>

      <section
        aria-label="Resumen del día"
        className="mt-6 rounded-xl border border-border bg-bg p-4"
      >
        <div className="text-xs font-medium uppercase tracking-wider text-text-3">
          Hoy
        </div>
        {loading && (
          <div className="mt-2 text-sm text-text-2">Cargando...</div>
        )}
        {!loading && alerts.length === 0 && (
          <div className="mt-2 rounded-lg border border-green-border bg-green-bg px-3 py-2 text-sm text-green">
            Todo al día. Sin pagos vencidos, refills próximos ni citas en los próximos días.
          </div>
        )}
        {!loading && groupedAlerts.vencidos.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 text-xs font-medium text-red">
              Atrasados ({groupedAlerts.vencidos.length})
            </div>
            <div className="space-y-2">
              {groupedAlerts.vencidos.map((a) => (
                <AlertCard
                  key={a.key}
                  alert={a}
                  pending={pending === a.key}
                  onCta={() => handleCta(a)}
                />
              ))}
            </div>
          </div>
        )}
        {!loading && groupedAlerts.proximos.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-amber">
              Esta semana ({groupedAlerts.proximos.length})
            </div>
            <div className="space-y-2">
              {groupedAlerts.proximos.map((a) => (
                <AlertCard
                  key={a.key}
                  alert={a}
                  pending={pending === a.key}
                  onCta={() => handleCta(a)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <nav className="mt-6 space-y-3">
        <Link
          href="/app/medicamentos"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Medicamentos</div>
          <div className="mt-1 text-sm text-text-2">
            Lista, refills y alertas
          </div>
        </Link>

        <Link
          href="/app/citas"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Citas médicas</div>
          <div className="mt-1 text-sm text-text-2">
            Historial y próxima cita
          </div>
        </Link>

        <Link
          href="/app/referencias"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Referencias de pago</div>
          <div className="mt-1 text-sm text-text-2">
            Datos de servicios y gastos fijos
          </div>
        </Link>

        <Link
          href="/app/finanzas"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Finanzas mensuales</div>
          <div className="mt-1 text-sm text-text-2">
            Pensión, gastos y reconciliación bancaria
          </div>
        </Link>
      </nav>
    </main>
  );
}

function AlertCard({
  alert,
  pending,
  onCta,
}: {
  alert: Alert;
  pending: boolean;
  onCta: () => void;
}) {
  const colorClasses = alertClass(alert.severity);
  const buttonClasses =
    alert.severity === "danger"
      ? "bg-red text-bg border-red active:opacity-80 hover:opacity-85"
      : alert.severity === "warn"
        ? "bg-amber text-bg border-amber active:opacity-80 hover:opacity-85"
        : "bg-blue text-bg border-blue active:opacity-80 hover:opacity-85";

  return (
    <div className={`rounded-lg border px-3 py-3 ${colorClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{alert.title}</div>
          <div className="text-xs opacity-85">{alert.sub}</div>
        </div>
        {alert.cta.kind === "viewCita" ? (
          <Link
            href={`/app/citas?edit=${alert.cta.citaId}`}
            className={`min-h-9 shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${buttonClasses}`}
          >
            Ver cita
          </Link>
        ) : (
          <button
            onClick={onCta}
            disabled={pending}
            className={`min-h-9 shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${buttonClasses}`}
          >
            {pending
              ? "..."
              : alert.cta.kind === "refill"
                ? "Hice el refill"
                : "Marcar pagado"}
          </button>
        )}
      </div>
    </div>
  );
}

function alertClass(s: "danger" | "warn" | "info"): string {
  if (s === "danger") return "border-red-border bg-red-bg text-red";
  if (s === "warn") return "border-amber-border bg-amber-bg text-amber";
  return "border-blue-border bg-blue-bg text-blue";
}
