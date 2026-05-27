"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";
import { Icon } from "../_components/icon";
import { Pill } from "../_components/pill";

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

function fmtCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
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

type FinanceFieldMap = {
  amount: string;
  paidBy?: string;
};

function refToFinanceFields(
  serviceName: string,
  category: string,
): FinanceFieldMap | null {
  const n = serviceName.toLowerCase();
  if (category === "service") {
    if (n.includes("compensar"))
      return { amount: "compensar", paidBy: "compensar_paid_by" };
    if (n.includes("enel") || n.includes("codensa"))
      return { amount: "enel", paidBy: "enel_paid_by" };
    if (n.includes("vanti") || n.includes("gas"))
      return { amount: "gas", paidBy: "gas_paid_by" };
    if (n.includes("eaab") || n.includes("acueducto") || n.includes("agua"))
      return { amount: "agua", paidBy: "agua_paid_by" };
    if (n.includes("internet"))
      return { amount: "internet", paidBy: "internet_paid_by" };
    if (n.includes("celular"))
      return { amount: "celular", paidBy: "celular_paid_by" };
    if (n.includes("alarma"))
      return { amount: "alarma", paidBy: "alarma_paid_by" };
  }
  if (category === "household") {
    if (n.includes("empleada")) return { amount: "empleada" };
    if (n.includes("caja")) return { amount: "caja" };
    if (n.includes("mercado")) return { amount: "mercado" };
    if (n.includes("varios") || n.includes("imprevistos"))
      return { amount: "varios" };
  }
  return null;
}

type FinanceMonth = {
  month_key: string;
  [key: string]: unknown;
};

function findCurrentStatus(
  history: FinanceMonth[] | undefined,
  fields: FinanceFieldMap,
): {
  current: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
  last: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
} {
  if (!history || history.length === 0) return { current: null, last: null };
  const thisMonth = currentMonthKey();
  const sorted = [...history].sort((a, b) =>
    b.month_key.localeCompare(a.month_key),
  );
  const curr = sorted.find((m) => m.month_key === thisMonth);
  const lastWithAmount = sorted.find((m) => {
    const a = m[fields.amount];
    return typeof a === "number" && a > 0;
  });

  const current = curr
    ? {
        monthKey: curr.month_key,
        amount: (curr[fields.amount] as number) ?? 0,
        paidBy: fields.paidBy
          ? (curr[fields.paidBy] as Id<"caregivers"> | undefined)
          : undefined,
      }
    : null;
  const last = lastWithAmount
    ? {
        monthKey: lastWithAmount.month_key,
        amount: (lastWithAmount[fields.amount] as number) ?? 0,
        paidBy: fields.paidBy
          ? (lastWithAmount[fields.paidBy] as Id<"caregivers"> | undefined)
          : undefined,
      }
    : null;
  return { current, last };
}

export default function ReferenciasPage() {
  const {
    patientId,
    caregiverId,
    caregiverName,
    otherCaregivers,
    patientCaregiver,
  } = useAppContext();
  const refs = useQuery(api.paymentReferences.listByPatient, { patientId });
  const history = useQuery(api.financeMonths.listByPatient, { patientId });

  const resolvePayer = useMemo(() => {
    return (id: Id<"caregivers">) => {
      if (id === patientCaregiver?.id) return patientCaregiver.name;
      if (id === caregiverId) return caregiverName;
      const o = otherCaregivers.find((c) => c.id === id);
      return o?.name ?? "alguien";
    };
  }, [patientCaregiver, caregiverId, caregiverName, otherCaregivers]);

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
            {grouped.servicios.map((r) => {
              const fields = refToFinanceFields(r.service_name, r.category);
              const status = fields
                ? findCurrentStatus(history as FinanceMonth[] | undefined, fields)
                : { current: null, last: null };
              return (
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
                      <StatusBlock
                        status={status}
                        fallbackLabel={r.amount_label}
                        fallbackAmount={r.amount_reference}
                        resolvePayer={resolvePayer}
                      />
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
              );
            })}
          </div>
        </section>
      )}

      {grouped.hogar.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Gastos fijos del hogar</h2>
          <div className="space-y-3">
            {grouped.hogar.map((r) => {
              const fields = refToFinanceFields(r.service_name, r.category);
              const status = fields
                ? findCurrentStatus(history as FinanceMonth[] | undefined, fields)
                : { current: null, last: null };
              return (
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
                      <StatusBlock
                        status={status}
                        fallbackLabel={r.amount_label}
                        fallbackAmount={r.amount_reference}
                        resolvePayer={resolvePayer}
                      />
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
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function StatusBlock({
  status,
  fallbackLabel,
  fallbackAmount,
  resolvePayer,
}: {
  status: {
    current: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
    last: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
  };
  fallbackLabel?: string;
  fallbackAmount?: number;
  resolvePayer: (id: Id<"caregivers">) => string;
}) {
  const thisMonth = currentMonthKey();
  const thisMonthLabel = shortMonthLabel(thisMonth);
  const { current, last } = status;

  if (current && current.amount > 0) {
    const paidByName = current.paidBy ? resolvePayer(current.paidBy) : null;
    return (
      <div className="mt-2">
        {paidByName ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-green">
            <Icon name="check_circle" filled className="text-base" />
            <span>
              {thisMonthLabel}: pagado por {paidByName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber">
            <Icon name="schedule" className="text-base" />
            <span>{thisMonthLabel}: sin pagar</span>
          </div>
        )}
        <div className="mt-0.5 text-lg font-medium tabular-nums">
          {fmtCOP(current.amount)}
        </div>
      </div>
    );
  }

  if (last) {
    const paidByName = last.paidBy ? resolvePayer(last.paidBy) : null;
    return (
      <div className="mt-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-2">
          <Icon name="schedule" className="text-base" />
          <span>{thisMonthLabel}: sin registrar todavía</span>
        </div>
        <div className="mt-0.5 text-sm text-text-2">
          Última factura:{" "}
          <span className="font-medium text-text tabular-nums">
            {fmtCOP(last.amount)}
          </span>
          <span className="ml-1 text-xs text-text-3">
            ({shortMonthLabel(last.monthKey)}
            {paidByName ? ` · ${paidByName}` : ""})
          </span>
        </div>
      </div>
    );
  }

  if (fallbackLabel || fallbackAmount) {
    return (
      <div className="mt-2 text-sm text-text-2">
        Valor de referencia:{" "}
        <span className="font-medium text-text tabular-nums">
          {fallbackLabel ?? fmtCOP(fallbackAmount!)}
        </span>
      </div>
    );
  }

  return null;
}
