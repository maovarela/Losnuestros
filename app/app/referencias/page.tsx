"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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

function frequencyLabel(
  freq: string | undefined,
  dueDay: number | undefined,
): string {
  if (!freq) return "";
  if (freq === "monthly")
    return dueDay ? `Antes del ${dueDay} de cada mes` : "Mensual";
  if (freq === "bimonthly")
    return dueDay ? `Bimestral · antes del ${dueDay}` : "Cada 2 meses";
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
  if (n.includes("compensar") || n.includes("salud"))
    return "health_and_safety";
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

type Status = {
  current: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
  last: { monthKey: string; amount: number; paidBy?: Id<"caregivers"> } | null;
};

function findCurrentStatus(
  history: FinanceMonth[] | undefined,
  fields: FinanceFieldMap,
): Status {
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

type RefDoc = {
  _id: Id<"payment_references">;
  service_name: string;
  category: string;
  frequency?: string;
  due_day?: number;
  amount_reference?: number;
  amount_label?: string;
  details?: { label: string; value: string }[];
  notes?: string;
  sort_order: number;
};

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
          <div className="space-y-2">
            {grouped.servicios.map((r) => (
              <RefCard
                key={r._id}
                r={r as RefDoc}
                history={history as FinanceMonth[] | undefined}
                resolvePayer={resolvePayer}
                caregiverId={caregiverId}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.hogar.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Gastos fijos del hogar</h2>
          <div className="space-y-2">
            {grouped.hogar.map((r) => (
              <RefCard
                key={r._id}
                r={r as RefDoc}
                history={history as FinanceMonth[] | undefined}
                resolvePayer={resolvePayer}
                caregiverId={caregiverId}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function RefCard({
  r,
  history,
  resolvePayer,
  caregiverId,
}: {
  r: RefDoc;
  history: FinanceMonth[] | undefined;
  resolvePayer: (id: Id<"caregivers">) => string;
  caregiverId: Id<"caregivers">;
}) {
  const [editing, setEditing] = useState(false);

  const fields = refToFinanceFields(r.service_name, r.category);
  const status = fields
    ? findCurrentStatus(history, fields)
    : { current: null, last: null };

  if (editing) {
    return (
      <RefEditForm
        r={r}
        caregiverId={caregiverId}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-l-4 border-border border-l-amber bg-bg p-3">
      <div className="flex items-start gap-2.5">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-bg text-amber"
        >
          <Icon name={serviceIcon(r.service_name)} className="text-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-tight">{r.service_name}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {r.frequency && (
                <Pill variant={freqVariant(r.frequency)}>
                  {frequencyLabel(r.frequency, r.due_day)}
                </Pill>
              )}
              <button
                onClick={() => setEditing(true)}
                aria-label="Editar"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
              >
                <Icon name="edit" className="text-base" />
              </button>
            </div>
          </div>
          <CompactStatus
            status={status}
            fallbackLabel={r.amount_label}
            fallbackAmount={r.amount_reference}
            resolvePayer={resolvePayer}
          />
          {r.details && r.details.length > 0 && (
            <div className="mt-1 space-y-0.5 text-xs text-text-2">
              {r.details.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span>{d.label}</span>
                  <span className="font-mono text-text">{d.value}</span>
                </div>
              ))}
            </div>
          )}
          {r.notes && (
            <div className="mt-1 text-xs italic text-text-3">{r.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactStatus({
  status,
  fallbackLabel,
  fallbackAmount,
  resolvePayer,
}: {
  status: Status;
  fallbackLabel?: string;
  fallbackAmount?: number;
  resolvePayer: (id: Id<"caregivers">) => string;
}) {
  const thisMonthLabel = shortMonthLabel(currentMonthKey());
  const { current, last } = status;

  if (current && current.amount > 0) {
    const paidByName = current.paidBy ? resolvePayer(current.paidBy) : null;
    if (paidByName) {
      return (
        <div className="mt-0.5 flex items-center gap-1 text-xs text-text-2">
          <Icon
            name="check_circle"
            filled
            className="text-sm text-green"
          />
          <span>
            <span className="font-medium tabular-nums text-text">
              {fmtCOP(current.amount)}
            </span>{" "}
            pagados en {thisMonthLabel.toLowerCase()} por {paidByName}
          </span>
        </div>
      );
    }
    return (
      <div className="mt-0.5 flex items-center gap-1 text-xs text-text-2">
        <Icon name="schedule" className="text-sm text-amber" />
        <span>
          {thisMonthLabel}: sin pagar ·{" "}
          <span className="font-medium tabular-nums text-text">
            {fmtCOP(current.amount)}
          </span>
        </span>
      </div>
    );
  }

  if (last) {
    return (
      <div className="mt-0.5 text-xs text-text-3">
        Última factura:{" "}
        <span className="font-medium tabular-nums">
          {fmtCOP(last.amount)}
        </span>{" "}
        ({shortMonthLabel(last.monthKey).toLowerCase()})
      </div>
    );
  }

  if (fallbackLabel || fallbackAmount) {
    return (
      <div className="mt-0.5 text-xs text-text-3">
        Valor de referencia:{" "}
        <span className="font-medium tabular-nums">
          {fallbackLabel ?? fmtCOP(fallbackAmount!)}
        </span>
      </div>
    );
  }

  return null;
}

function RefEditForm({
  r,
  caregiverId,
  onClose,
}: {
  r: RefDoc;
  caregiverId: Id<"caregivers">;
  onClose: () => void;
}) {
  const update = useMutation(api.paymentReferences.update);
  const [frequency, setFrequency] = useState(r.frequency ?? "");
  const [dueDay, setDueDay] = useState(r.due_day?.toString() ?? "");
  const [notes, setNotes] = useState(r.notes ?? "");
  const [details, setDetails] = useState<{ label: string; value: string }[]>(
    r.details ? r.details.map((d) => ({ ...d })) : [],
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const cleanDetails = details
        .map((d) => ({ label: d.label.trim(), value: d.value.trim() }))
        .filter((d) => d.label || d.value);
      await update({
        id: r._id,
        updatedBy: caregiverId,
        service_name: r.service_name,
        category: r.category,
        sort_order: r.sort_order,
        frequency: frequency || undefined,
        due_day: dueDay ? parseInt(dueDay, 10) : undefined,
        amount_reference: r.amount_reference,
        amount_label: r.amount_label,
        details: cleanDetails.length > 0 ? cleanDetails : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function addDetail() {
    setDetails([...details, { label: "", value: "" }]);
  }

  function updateDetail(idx: number, key: "label" | "value", val: string) {
    setDetails(
      details.map((d, i) => (i === idx ? { ...d, [key]: val } : d)),
    );
  }

  function removeDetail(idx: number) {
    setDetails(details.filter((_, i) => i !== idx));
  }

  return (
    <div className="rounded-xl border border-l-4 border-blue-border border-l-blue bg-bg p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold">{r.service_name}</h3>
        <button
          onClick={onClose}
          aria-label="Cancelar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-2">Frecuencia</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            >
              <option value="">(ninguna)</option>
              <option value="monthly">Mensual</option>
              <option value="bimonthly">Bimestral</option>
              <option value="weekly">Semanal</option>
              <option value="per_visit">Por visita</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-2">
              Día de vencimiento
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ej: 21"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-2">Datos de pago</label>
          <div className="mt-1 space-y-2">
            {details.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={d.label}
                  onChange={(e) => updateDetail(idx, "label", e.target.value)}
                  placeholder="N° cliente"
                  className="min-w-0 flex-1 rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                />
                <input
                  type="text"
                  value={d.value}
                  onChange={(e) => updateDetail(idx, "value", e.target.value)}
                  placeholder="0501354-1"
                  className="min-w-0 flex-1 rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm font-mono focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                />
                <button
                  onClick={() => removeDetail(idx)}
                  aria-label="Borrar este dato"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red active:bg-red-bg hover:bg-red-bg"
                >
                  <Icon name="close" className="text-base" />
                </button>
              </div>
            ))}
            <button
              onClick={addDetail}
              className="flex items-center gap-1 text-xs font-medium text-blue active:opacity-80 hover:opacity-85"
            >
              <Icon name="add" className="text-base" />
              Agregar dato
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-2">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: El valor varía mensualmente."
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="min-h-9 rounded-md border border-border-2 bg-bg px-4 py-1.5 text-sm hover:bg-bg-2 active:bg-bg-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="min-h-9 rounded-md bg-blue px-4 py-1.5 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
