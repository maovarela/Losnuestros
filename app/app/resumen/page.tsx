"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";
import { Icon } from "../_components/icon";

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function relativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

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

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
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

type UpcomingItem =
  | {
      key: string;
      severity: "danger" | "warn" | "info";
      title: string;
      sub: string;
      cta: { kind: "refill"; medId: Id<"medications"> };
    }
  | {
      key: string;
      severity: "danger" | "warn" | "info";
      title: string;
      sub: string;
      cta: { kind: "pay"; service: ServiceKey };
    }
  | {
      key: string;
      severity: "danger" | "warn" | "info";
      title: string;
      sub: string;
      cta: { kind: "viewCita"; citaId: Id<"appointments"> };
    };

type RecentItem = {
  key: string;
  updatedAt: number;
  caregiver: string | null;
  responsible: string | null;
  verb: string;
  subject: string;
  href: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function ResumenPage() {
  const { patientId, caregiverId } = useAppContext();
  const monthKey = currentMonthKey();

  const meds = useQuery(api.medications.listByPatient, { patientId });
  const citas = useQuery(api.appointments.listByPatient, { patientId });
  const refs = useQuery(api.paymentReferences.listByPatient, { patientId });
  const finance = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey,
  });
  const financeHistory = useQuery(api.financeMonths.listByPatient, {
    patientId,
  });

  const markRefilled = useMutation(api.medications.markRefilled);
  const markServicePaid = useMutation(api.financeMonths.markServicePaid);

  const [pending, setPending] = useState<string | null>(null);

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const out: UpcomingItem[] = [];

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
            compensar: finance.compensar_paid_by != null,
            enel: finance.enel_paid_by != null,
            gas: finance.gas_paid_by != null,
            agua: finance.agua_paid_by != null,
            internet: finance.internet_paid_by != null,
            celular: finance.celular_paid_by != null,
            alarma: finance.alarma_paid_by != null,
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
        } else if (diff <= 7) {
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

  const recent = useMemo<RecentItem[]>(() => {
    const out: RecentItem[] = [];
    const since = Date.now() - WEEK_MS;

    if (meds) {
      for (const m of meds) {
        if (m.updated_at < since || !m.updated_by) continue;
        const responsible =
          m.responsible_for && m.responsible_for !== m.updated_by
            ? m.responsible_for_name
            : null;
        out.push({
          key: `r-med-${m._id}-${m.updated_at}`,
          updatedAt: m.updated_at,
          caregiver: m.updated_by_name,
          responsible,
          verb: "actualizó",
          subject: m.name,
          href: `/app/medicamentos?edit=${m._id}`,
        });
      }
    }

    if (citas) {
      for (const c of citas) {
        if (c.updated_at < since || !c.updated_by) continue;
        const responsible =
          c.responsible_for && c.responsible_for !== c.updated_by
            ? c.responsible_for_name
            : null;
        out.push({
          key: `r-cita-${c._id}-${c.updated_at}`,
          updatedAt: c.updated_at,
          caregiver: c.updated_by_name,
          responsible,
          verb: "actualizó",
          subject: `cita ${c.doctor ?? fmtDate(c.date)}`,
          href: `/app/citas?edit=${c._id}`,
        });
      }
    }

    if (financeHistory) {
      for (const f of financeHistory) {
        if (f.updated_at < since || !f.updated_by) continue;
        const responsible =
          f.responsible_for && f.responsible_for !== f.updated_by
            ? f.responsible_for_name
            : null;
        out.push({
          key: `r-fin-${f._id}-${f.updated_at}`,
          updatedAt: f.updated_at,
          caregiver: f.updated_by_name,
          responsible,
          verb: "registró",
          subject: monthLabel(f.month_key),
          href: `/app/finanzas`,
        });
      }
    }

    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out.slice(0, 12);
  }, [meds, citas, financeHistory]);

  async function handleCta(item: UpcomingItem) {
    setPending(item.key);
    try {
      if (item.cta.kind === "refill") {
        await markRefilled({ id: item.cta.medId, updatedBy: caregiverId });
      } else if (item.cta.kind === "pay") {
        await markServicePaid({
          patientId,
          updatedBy: caregiverId,
          monthKey,
          service: item.cta.service,
        });
      }
    } finally {
      setPending(null);
    }
  }

  const loading =
    meds === undefined ||
    citas === undefined ||
    refs === undefined ||
    finance === undefined ||
    financeHistory === undefined;

  return (
    <main>
      <Link
        href="/app/ingestar"
        className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-blue px-5 py-4 text-bg shadow-md transition-opacity hover:opacity-90 active:opacity-85"
      >
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">
            Tomar foto o pegar mensaje
          </div>
          <p className="mt-1 text-sm opacity-90">
            Recetarios, citas de WhatsApp o recibos. La app los entiende y los
            deja listos para guardar. También puedes arrastrar una foto.
          </p>
        </div>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      <section aria-label="Lo que viene esta semana">
        <h2 className="mb-3 text-xl font-semibold">Lo que viene esta semana</h2>
        <div className="rounded-xl border border-border bg-bg p-4">
          {loading && <div className="text-sm text-text-2">Cargando...</div>}
          {!loading && upcoming.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border-l-4 border-green bg-green-bg px-3 py-3 text-sm text-green">
              <Icon name="check_circle" filled className="shrink-0 text-2xl" />
              <span className="font-medium">
                Todo al día. Sin pagos vencidos, refills próximos ni citas en los próximos días.
              </span>
            </div>
          )}
          {!loading && upcoming.length > 0 && (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <UpcomingCard
                  key={a.key}
                  item={a}
                  pending={pending === a.key}
                  onCta={() => handleCta(a)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-label="Lo que pasó esta semana" className="mt-6">
        <h2 className="mb-3 text-xl font-semibold">Lo que pasó esta semana</h2>
        <div className="rounded-xl border border-border bg-bg">
          {loading && (
            <div className="p-4 text-sm text-text-2">Cargando...</div>
          )}
          {!loading && recent.length === 0 && (
            <div className="p-4 text-sm text-text-2">
              No hay cambios registrados en los últimos siete días.
            </div>
          )}
          {!loading && recent.length > 0 && (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.key}>
                  <Link
                    href={r.href}
                    className="block px-4 py-3 hover:bg-bg-2 active:bg-bg-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        {r.caregiver ?? "Alguien"}
                      </span>{" "}
                      <span className="text-text-2">{r.verb}</span>{" "}
                      <span className="font-medium">{r.subject}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-text-2">
                      {r.responsible && (
                        <>
                          lo hizo{" "}
                          <span className="font-medium text-text">
                            {r.responsible}
                          </span>{" "}
                          ·{" "}
                        </>
                      )}
                      {relativeTime(r.updatedAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function UpcomingCard({
  item,
  pending,
  onCta,
}: {
  item: UpcomingItem;
  pending: boolean;
  onCta: () => void;
}) {
  const tone =
    item.severity === "danger"
      ? {
          bg: "bg-red-bg",
          border: "border-red",
          text: "text-red",
          button: "bg-red text-bg",
        }
      : item.severity === "warn"
        ? {
            bg: "bg-amber-bg",
            border: "border-amber",
            text: "text-amber",
            button: "bg-amber text-bg",
          }
        : {
            bg: "bg-blue-bg",
            border: "border-blue",
            text: "text-blue",
            button: "bg-blue text-bg",
          };
  const icon =
    item.cta.kind === "refill"
      ? "medication"
      : item.cta.kind === "pay"
        ? "payments"
        : "event";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-3 ${tone.bg} ${tone.border} ${tone.text}`}
    >
      <Icon name={icon} filled className="shrink-0 text-2xl" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold leading-tight">{item.title}</div>
        <div className="text-xs opacity-85">{item.sub}</div>
      </div>
      {item.cta.kind === "viewCita" ? (
        <Link
          href={`/app/citas?edit=${item.cta.citaId}`}
          className={`min-h-9 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium active:opacity-80 hover:opacity-85 ${tone.button}`}
        >
          Ver cita
        </Link>
      ) : (
        <button
          onClick={onCta}
          disabled={pending}
          className={`min-h-9 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 active:opacity-80 hover:opacity-85 ${tone.button}`}
        >
          {pending
            ? "..."
            : item.cta.kind === "refill"
              ? "Hice el refill"
              : "Marcar pagado"}
        </button>
      )}
    </div>
  );
}
