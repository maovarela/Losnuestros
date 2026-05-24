"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

type Alert = {
  key: string;
  severity: "danger" | "warn" | "info";
  title: string;
  sub: string;
};

export default function AppHome() {
  const { patientId, patientName, patientInitials, caregiverName } = useAppContext();
  const monthKey = currentMonthKey();

  const meds = useQuery(api.medications.listByPatient, { patientId });
  const citas = useQuery(api.appointments.listByPatient, { patientId });
  const refs = useQuery(api.paymentReferences.listByPatient, { patientId });
  const finance = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey,
  });

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
        });
      }
    }

    if (refs) {
      const today = new Date().getDate();
      const paidMap: Record<string, boolean> = finance
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
        if (key && paidMap[key]) continue;
        const diff = r.due_day - today;
        if (diff < 0) {
          out.push({
            key: `pay-v-${r._id}`,
            severity: "danger",
            title: `${r.service_name}: vencido`,
            sub: `Debía pagarse antes del ${r.due_day}`,
          });
        } else if (diff <= 5) {
          out.push({
            key: `pay-p-${r._id}`,
            severity: "warn",
            title: `${r.service_name}: vence en ${diff} día${diff === 1 ? "" : "s"}`,
            sub: `Antes del ${r.due_day} de este mes`,
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

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue">
          {patientInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-medium">{patientName}</div>
          <div className="text-sm text-text-2">
            Sesión: <span className="font-medium text-text">{caregiverName}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-text-3">
          Hoy
        </div>
        {loading && (
          <div className="mt-2 text-sm text-text-3">Cargando...</div>
        )}
        {!loading && alerts.length === 0 && (
          <div className="mt-2 rounded-lg border border-green-border bg-green-bg px-3 py-2 text-sm text-green">
            Todo al día. Sin pagos vencidos, refills próximos ni citas en los próximos días.
          </div>
        )}
        {!loading && alerts.length > 0 && (
          <div className="mt-2 space-y-2">
            {alerts.map((a) => (
              <div
                key={a.key}
                className={`rounded-lg border px-3 py-2 ${alertClass(a.severity)}`}
              >
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs opacity-85">{a.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
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
      </div>
    </div>
  );
}

function alertClass(s: "danger" | "warn" | "info"): string {
  if (s === "danger") return "border-red-border bg-red-bg text-red";
  if (s === "warn") return "border-amber-border bg-amber-bg text-amber";
  return "border-blue-border bg-blue-bg text-blue";
}

function mapServiceToFinanceKey(name: string): string | null {
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
