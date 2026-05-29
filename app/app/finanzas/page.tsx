"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

const DEFAULTS = {
  pension: 4299866,
  compensar: 617200,
  enel: 252470,
  gas: 61110,
  empleada: 1080000,
  caja: 1200000,
  mercado: 400000,
  internet: 102000,
  celular: 55000,
};

const SERVICE_KEYS = [
  "compensar",
  "enel",
  "gas",
  "agua",
  "internet",
  "celular",
  "alarma",
] as const;
type ServiceKey = (typeof SERVICE_KEYS)[number];

const SERVICE_LABELS: Record<ServiceKey, string> = {
  compensar: "Compensar salud",
  enel: "Energía Enel",
  gas: "Gas Vanti",
  agua: "Acueducto EAAB",
  internet: "Claro internet",
  celular: "Claro celular",
  alarma: "Alarma",
};

function previousMonthKeyOf(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function relativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

function fmtCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeysRange(): string[] {
  const out: string[] = [];
  const start = new Date();
  start.setMonth(start.getMonth() + 3);
  for (let i = 0; i < 36; i++) {
    const k = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    out.push(k);
    start.setMonth(start.getMonth() - 1);
  }
  return out;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type PayerId = Id<"caregivers"> | null;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type FormState = {
  pension: string;
  prima: string;
  compensar: string;
  compensar_paid_by: PayerId;
  compensar_paid_at: string;
  enel: string;
  enel_paid_by: PayerId;
  enel_paid_at: string;
  gas: string;
  gas_paid_by: PayerId;
  gas_paid_at: string;
  agua: string;
  agua_paid_by: PayerId;
  agua_paid_at: string;
  internet: string;
  internet_paid_by: PayerId;
  internet_paid_at: string;
  celular: string;
  celular_paid_by: PayerId;
  celular_paid_at: string;
  alarma: string;
  alarma_paid_by: PayerId;
  alarma_paid_at: string;
  empleada: string;
  caja: string;
  mercado: string;
  varios: string;
  saldo_banco: string;
  nota: string;
};

function emptyForm(): FormState {
  return {
    pension: String(DEFAULTS.pension),
    prima: "",
    compensar: String(DEFAULTS.compensar),
    compensar_paid_by: null,
    compensar_paid_at: "",
    enel: String(DEFAULTS.enel),
    enel_paid_by: null,
    enel_paid_at: "",
    gas: String(DEFAULTS.gas),
    gas_paid_by: null,
    gas_paid_at: "",
    agua: "",
    agua_paid_by: null,
    agua_paid_at: "",
    internet: String(DEFAULTS.internet),
    internet_paid_by: null,
    internet_paid_at: "",
    celular: String(DEFAULTS.celular),
    celular_paid_by: null,
    celular_paid_at: "",
    alarma: "",
    alarma_paid_by: null,
    alarma_paid_at: "",
    empleada: String(DEFAULTS.empleada),
    caja: String(DEFAULTS.caja),
    mercado: String(DEFAULTS.mercado),
    varios: "",
    saldo_banco: "",
    nota: "",
  };
}

function num(s: string): number {
  const digits = s.replace(/\D/g, "");
  const n = parseInt(digits, 10);
  return isNaN(n) ? 0 : n;
}

function formatThousands(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("es-CO");
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export default function FinanzasPage() {
  const { patientId, caregiverId, caregiverName, otherCaregivers, patientCaregiver } =
    useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [form, setForm] = useState<FormState>(emptyForm());
  const [settling, setSettling] = useState<Id<"caregivers"> | null>(null);

  const monthData = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey: selectedMonth,
  });
  const prevMonthData = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey: previousMonthKeyOf(selectedMonth),
  });
  const history = useQuery(api.financeMonths.listByPatient, { patientId });
  const audit = useQuery(api.financeMonths.listAuditByPatient, { patientId });
  const balances = useQuery(api.financeMonths.getBalances, { patientId });
  const settlements = useQuery(api.financeMonths.listSettlements, {
    patientId,
  });
  const upsert = useMutation(api.financeMonths.upsert);
  const remove = useMutation(api.financeMonths.remove);
  const settle = useMutation(api.financeMonths.settle);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  function updateForm(updates: Partial<FormState>) {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  }

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const initializedFor = useRef<string | null>(null);

  const previousMonthSaldo = useMemo(() => {
    if (!history) return undefined;
    return history
      .filter(
        (m) => m.month_key < selectedMonth && m.saldo_banco !== undefined,
      )
      .sort((a, b) => b.month_key.localeCompare(a.month_key))[0]?.saldo_banco;
  }, [history, selectedMonth]);

  useEffect(() => {
    if (monthData === undefined) return;
    if (initializedFor.current === selectedMonth) return;
    initializedFor.current = selectedMonth;

    if (monthData === null) {
      setForm(emptyForm());
      setDirty(false);
      return;
    }

    setForm({
      pension: String(monthData.pension),
      prima: monthData.prima ? String(monthData.prima) : "",
      compensar: String(monthData.compensar),
      compensar_paid_by: monthData.compensar_paid_by ?? null,
      compensar_paid_at: monthData.compensar_paid_at ?? "",
      enel: String(monthData.enel),
      enel_paid_by: monthData.enel_paid_by ?? null,
      enel_paid_at: monthData.enel_paid_at ?? "",
      gas: String(monthData.gas),
      gas_paid_by: monthData.gas_paid_by ?? null,
      gas_paid_at: monthData.gas_paid_at ?? "",
      agua: monthData.agua ? String(monthData.agua) : "",
      agua_paid_by: monthData.agua_paid_by ?? null,
      agua_paid_at: monthData.agua_paid_at ?? "",
      internet: String(monthData.internet),
      internet_paid_by: monthData.internet_paid_by ?? null,
      internet_paid_at: monthData.internet_paid_at ?? "",
      celular: String(monthData.celular),
      celular_paid_by: monthData.celular_paid_by ?? null,
      celular_paid_at: monthData.celular_paid_at ?? "",
      alarma: monthData.alarma ? String(monthData.alarma) : "",
      alarma_paid_by: monthData.alarma_paid_by ?? null,
      alarma_paid_at: monthData.alarma_paid_at ?? "",
      empleada: String(monthData.empleada),
      caja: String(monthData.caja),
      mercado: String(monthData.mercado),
      varios: monthData.varios ? String(monthData.varios) : "",
      saldo_banco: monthData.saldo_banco ? String(monthData.saldo_banco) : "",
      nota: monthData.nota ?? "",
    });
    setDirty(false);
  }, [monthData, selectedMonth]);

  const totals = useMemo(() => {
    const ingreso = num(form.pension) + num(form.prima);
    const otrosGastos =
      num(form.empleada) + num(form.caja) + num(form.mercado) + num(form.varios);
    let serviciosTotal = 0;
    let serviciosOtros = 0;
    for (const k of SERVICE_KEYS) {
      const amount = num(form[k]);
      serviciosTotal += amount;
      const payer = form[`${k}_paid_by`] as PayerId;
      if (payer && payer !== patientCaregiver?.id) {
        serviciosOtros += amount;
      }
    }
    const gastosTotales = serviciosTotal + otrosGastos;
    const gastosDeAna = gastosTotales - serviciosOtros;

    const settlementsEsteMes =
      settlements
        ?.filter((s) => s.month_key === selectedMonth)
        .reduce((acc, s) => acc + s.amount, 0) ?? 0;

    const inicial = previousMonthSaldo ?? 0;
    const final = num(form.saldo_banco);
    const hasInicial = previousMonthSaldo !== undefined;
    const hasFinal = form.saldo_banco.trim() !== "";
    const esperado_final = inicial + ingreso - gastosDeAna - settlementsEsteMes;
    const dif = hasInicial && hasFinal ? final - esperado_final : 0;
    return {
      ingreso,
      gastosTotales,
      gastosDeAna,
      serviciosOtros,
      settlementsEsteMes,
      inicial,
      final,
      esperado_final,
      dif,
      hasInicial,
      hasFinal,
    };
  }, [form, previousMonthSaldo, patientCaregiver, settlements, selectedMonth]);

  function handlePaidToggle(service: ServiceKey, checked: boolean) {
    if (checked) {
      updateForm({
        [`${service}_paid_by`]: patientCaregiver?.id ?? caregiverId,
        [`${service}_paid_at`]: todayISO(),
      } as Partial<FormState>);
    } else {
      updateForm({
        [`${service}_paid_by`]: null,
        [`${service}_paid_at`]: "",
      } as Partial<FormState>);
    }
  }

  function handlePayerChange(service: ServiceKey, paidBy: PayerId) {
    updateForm({
      [`${service}_paid_by`]: paidBy,
      [`${service}_paid_at`]:
        paidBy && !form[`${service}_paid_at` as keyof FormState]
          ? todayISO()
          : form[`${service}_paid_at` as keyof FormState],
    } as Partial<FormState>);
  }

  function handlePaidAtChange(service: ServiceKey, date: string) {
    updateForm({ [`${service}_paid_at`]: date } as Partial<FormState>);
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      await upsert({
        patientId,
        updatedBy: caregiverId,
        month_key: selectedMonth,
        pension: num(form.pension),
        prima: form.prima ? num(form.prima) : undefined,
        compensar: num(form.compensar),
        compensar_paid_by: form.compensar_paid_by ?? undefined,
        compensar_paid_at: form.compensar_paid_at || undefined,
        enel: num(form.enel),
        enel_paid_by: form.enel_paid_by ?? undefined,
        enel_paid_at: form.enel_paid_at || undefined,
        gas: num(form.gas),
        gas_paid_by: form.gas_paid_by ?? undefined,
        gas_paid_at: form.gas_paid_at || undefined,
        agua: num(form.agua),
        agua_paid_by: form.agua_paid_by ?? undefined,
        agua_paid_at: form.agua_paid_at || undefined,
        internet: num(form.internet),
        internet_paid_by: form.internet_paid_by ?? undefined,
        internet_paid_at: form.internet_paid_at || undefined,
        celular: num(form.celular),
        celular_paid_by: form.celular_paid_by ?? undefined,
        celular_paid_at: form.celular_paid_at || undefined,
        alarma: num(form.alarma),
        alarma_paid_by: form.alarma_paid_by ?? undefined,
        alarma_paid_at: form.alarma_paid_at || undefined,
        empleada: num(form.empleada),
        caja: num(form.caja),
        mercado: num(form.mercado),
        varios: num(form.varios),
        saldo_banco: form.saldo_banco.trim() ? num(form.saldo_banco) : undefined,
        nota: form.nota.trim() || undefined,
      });
      setDirty(false);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const handle = setTimeout(() => {
      handleSave();
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  async function handleDelete(id: Id<"finance_months">, key: string) {
    const ok = window.confirm(
      `Vas a borrar el registro de ${monthLabel(key)}. Quedará en la bitácora con una copia de respaldo. ¿Continuar?`,
    );
    if (!ok) return;
    await remove({ id, actorId: caregiverId });
  }

  async function handleSettle(
    toId: Id<"caregivers">,
    name: string,
    amount: number,
  ) {
    const ok = window.confirm(
      `Vas a registrar que Ana María le devolvió ${fmtCOP(amount)} a ${name}. Esto baja el saldo del banco y cierra la deuda. ¿Continuar?`,
    );
    if (!ok) return;
    setSettling(toId);
    try {
      await settle({
        patientId,
        toId,
        amount,
        monthKey: selectedMonth,
        actorId: caregiverId,
      });
    } finally {
      setSettling(null);
    }
  }

  const difClass =
    Math.abs(totals.dif) < 10000
      ? "text-green"
      : totals.dif < 0
        ? "text-red"
        : "text-amber";

  const payerOptions: { id: PayerId; label: string }[] = [
    { id: null, label: "No pagado" },
    ...(patientCaregiver
      ? [{ id: patientCaregiver.id as PayerId, label: patientCaregiver.name }]
      : []),
    { id: caregiverId as PayerId, label: `Yo (${caregiverName})` },
    ...otherCaregivers.map((c) => ({ id: c.id as PayerId, label: c.name })),
  ];

  return (
    <main>
      <div className="rounded-xl border border-border bg-bg p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            aria-label="Mes anterior"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
          >
            <Icon name="chevron_left" className="text-2xl" />
          </button>
          <div className="relative flex-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Seleccionar mes"
              className="w-full appearance-none rounded-md border border-border-2 bg-bg-2 px-4 py-2.5 text-center text-base font-medium tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            >
              {monthKeysRange().map((k) => (
                <option key={k} value={k}>
                  {monthLabel(k)}
                </option>
              ))}
            </select>
            <Icon
              name="arrow_drop_down"
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-2xl text-text-2"
            />
          </div>
          <button
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            aria-label="Mes siguiente"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
          >
            <Icon name="chevron_right" className="text-2xl" />
          </button>
        </div>
        {(selectedMonth === currentMonthKey() ||
          selectedMonth === previousMonthKey() ||
          saveStatus !== "idle") && (
          <div className="mt-2 flex items-center justify-between text-xs text-text-2">
            <span>
              {selectedMonth === currentMonthKey()
                ? "Este es el mes actual"
                : selectedMonth === previousMonthKey()
                  ? "Este es el mes pasado"
                  : ""}
            </span>
            <SaveIndicator status={saveStatus} />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-4">
        <h2 className="text-xl font-semibold">
          Estado de cuenta
          <span className="ml-2 text-base font-normal text-text-2">
            {monthLabel(selectedMonth)}
          </span>
        </h2>

        {totals.hasFinal && (
          <div className="glass-card mt-3 rounded-2xl p-6">
            <div className="text-sm font-medium text-text-2">
              Saldo en el banco hoy
            </div>
            <div
              className={`mt-2 text-5xl font-bold tabular-nums leading-tight ${
                totals.hasInicial ? difClass : "text-text"
              }`}
            >
              {fmtCOP(totals.final)}
            </div>
            {totals.hasInicial && (
              <div className={`mt-2 text-sm ${difClass}`}>
                {Math.abs(totals.dif) < 10000
                  ? "Cuadra con lo registrado"
                  : totals.dif < 0
                    ? `Faltan ${fmtCOP(Math.abs(totals.dif))} frente a lo esperado`
                    : `Sobran ${fmtCOP(totals.dif)} frente a lo esperado`}
              </div>
            )}
          </div>
        )}

        {!totals.hasFinal && (
          <div className="mt-3 rounded-lg border border-border-2 p-3 text-xs text-text-2">
            Escribe el saldo del banco abajo para ver el estado de cuenta.
          </div>
        )}

        {totals.hasFinal && (
          <div className="mt-4">
            <div className="text-xs font-medium uppercase tracking-wider text-text-3">
              Cómo se calcula
            </div>
            <div className="mt-2 space-y-1.5 rounded-lg border border-border-2 p-3 text-sm">
              <StatementRow
                label="Saldo del mes pasado"
                value={
                  totals.hasInicial ? fmtCOP(totals.inicial) : "Sin dato"
                }
                muted={!totals.hasInicial}
              />
              <StatementRow
                label="+ Pensión y otros ingresos"
                value={`+${fmtCOP(totals.ingreso)}`}
                valueClass="text-green"
              />
              <StatementRow
                label="− Gastos pagados por Ana María"
                value={`−${fmtCOP(totals.gastosDeAna)}`}
                valueClass="text-red"
              />
              {totals.serviciosOtros > 0 && (
                <StatementRow
                  label={`(${fmtCOP(totals.serviciosOtros)} los pagó alguien más, queda en cuentas pendientes)`}
                  value=""
                  muted
                />
              )}
              {totals.settlementsEsteMes > 0 && (
                <StatementRow
                  label="− Devoluciones del mes"
                  value={`−${fmtCOP(totals.settlementsEsteMes)}`}
                  valueClass="text-red"
                />
              )}
              <div className="border-t border-border pt-1.5">
                <StatementRow
                  label="Saldo esperado"
                  value={
                    totals.hasInicial ? fmtCOP(totals.esperado_final) : "—"
                  }
                  bold
                  muted={!totals.hasInicial}
                />
              </div>
              <StatementRow
                label="Saldo real (banco)"
                value={fmtCOP(totals.final)}
                bold
              />
              {totals.hasInicial && (
                <div className="border-t border-border pt-1.5">
                  <StatementRow
                    label="Diferencia"
                    value={`${totals.dif >= 0 ? "+" : ""}${fmtCOP(totals.dif)}`}
                    valueClass={difClass}
                    bold
                  />
                </div>
              )}
            </div>
            {!totals.hasInicial && (
              <p className="mt-2 text-xs text-text-2">
                Este es el primer mes registrado. Desde el próximo, la app
                compara contra este saldo para detectar si falta o sobra plata.
              </p>
            )}
          </div>
        )}
        {monthData && monthData.updated_at && (
          <div className="mt-3 border-t border-border pt-2 text-xs text-text-2">
            Actualizado por {monthData.updated_by_name ?? "alguien"}{" "}
            {relativeTime(monthData.updated_at)}
          </div>
        )}
      </div>

      <PreviousMonthStatus
        prev={prevMonthData}
        prevKey={previousMonthKeyOf(selectedMonth)}
        onGoToMonth={(k) => setSelectedMonth(k)}
        resolvePayerName={(id) => {
          if (id === patientCaregiver?.id) return patientCaregiver.name;
          if (id === caregiverId) return caregiverName;
          const o = otherCaregivers.find((c) => c.id === id);
          return o?.name ?? "?";
        }}
      />

      {balances && balances.some((b) => b.amount > 0) && (
        <div className="mt-4 rounded-xl border-l-4 border-amber bg-amber-bg p-4">
          <div className="text-xl font-semibold text-amber">
            Cuentas pendientes
          </div>
          <p className="mt-1 text-xs text-text-2">
            Plata que pagaron Ingrid o Sandra de su bolsillo. Ana María se las
            debe hasta que les devuelva.
          </p>
          <ul className="mt-3 space-y-2">
            {balances
              .filter((b) => b.amount > 0)
              .map((b) => (
                <li
                  key={b.caregiverId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-2 bg-bg p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm">
                      Ana María le debe a{" "}
                      <span className="font-medium">{b.name}</span>
                    </div>
                    <div className="text-base font-medium tabular-nums">
                      {fmtCOP(b.amount)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettle(b.caregiverId, b.name, b.amount)
                    }
                    disabled={settling === b.caregiverId}
                    className="min-h-9 rounded-md bg-blue px-3 py-1.5 text-xs font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
                  >
                    {settling === b.caregiverId ? "Registrando..." : "Le devolví todo"}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <SectionLabel>Ingresos</SectionLabel>
        <div className="mt-2 space-y-3">
          <MoneyRow
            label="Pensión recibida"
            value={form.pension}
            onChange={(v) => updateForm({ pension: v })}
          />
          <MoneyRow
            label="Prima (junio o diciembre)"
            value={form.prima}
            onChange={(v) => updateForm({ prima: v })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-4">
        <SectionLabel>Egresos</SectionLabel>

        <SectionLabel className="mt-4">Servicios públicos</SectionLabel>
        <div className="mt-2 space-y-2">
          {(
            [
              { key: "compensar" as const, label: "Compensar salud" },
              { key: "enel" as const, label: "Energía Enel" },
              { key: "gas" as const, label: "Gas Vanti" },
              { key: "agua" as const, label: "Acueducto EAAB" },
              { key: "internet" as const, label: "Claro internet" },
              { key: "celular" as const, label: "Claro celular" },
              { key: "alarma" as const, label: "Alarma" },
            ] as { key: ServiceKey; label: string }[]
          ).map(({ key, label }) => (
            <PaidServiceRow
              key={key}
              label={label}
              amount={form[key]}
              paidBy={form[`${key}_paid_by`] as PayerId}
              paidAt={form[`${key}_paid_at`] as string}
              patientCaregiverId={patientCaregiver?.id ?? null}
              currentCaregiverId={caregiverId}
              currentCaregiverName={caregiverName}
              otherCaregivers={otherCaregivers}
              onAmountChange={(v) =>
                updateForm({ [key]: v } as Partial<FormState>)
              }
              onPaidToggle={(c) => handlePaidToggle(key, c)}
              onPaidByChange={(p) => handlePayerChange(key, p)}
              onPaidAtChange={(d) => handlePaidAtChange(key, d)}
            />
          ))}
        </div>

        <SectionLabel className="mt-5">Gastos del hogar</SectionLabel>
        <div className="mt-2 space-y-3">
          <MoneyRow
            label="Empleada doméstica"
            value={form.empleada}
            onChange={(v) => updateForm({ empleada: v })}
          />
          <MoneyRow
            label="Caja menor"
            value={form.caja}
            onChange={(v) => updateForm({ caja: v })}
          />
          <MoneyRow
            label="Mercado"
            value={form.mercado}
            onChange={(v) => updateForm({ mercado: v })}
          />
          <MoneyRow
            label="Imprevistos o varios"
            value={form.varios}
            onChange={(v) => updateForm({ varios: v })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-4">
        <div className="rounded-lg border border-border-2 p-3">
          <div className="text-sm font-medium">Saldo en el banco</div>
          <p className="mt-1 text-xs text-text-2">
            Escribe lo que hay en la cuenta hoy (o al cerrar el mes). La app
            usa el saldo del mes pasado para verificar que cuadre con lo que
            registraste arriba.
          </p>

          {previousMonthSaldo !== undefined && (
            <div className="mt-3 flex items-baseline justify-between text-xs text-text-2">
              <span>Saldo del mes pasado</span>
              <span className="font-medium tabular-nums">
                {fmtCOP(previousMonthSaldo)}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm text-text">Saldo actual</div>
              <div className="text-xs text-text-2">
                {previousMonthSaldo === undefined
                  ? "Lo que hay en la cuenta hoy"
                  : "Lo que hay en la cuenta hoy o al cerrar el mes"}
              </div>
            </div>
            <div className="relative flex shrink-0 items-center">
              <span className="pointer-events-none absolute left-3 text-sm text-text-2">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousands(form.saldo_banco)}
                onChange={(e) =>
                  updateForm({ saldo_banco: digitsOnly(e.target.value) })
                }
                placeholder=""
                className="w-40 rounded-md border border-border-2 bg-bg-2 pl-6 pr-3 py-2 text-right text-sm tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs text-text-2">Nota del mes</label>
          <textarea
            value={form.nota}
            onChange={(e) => updateForm({ nota: e.target.value })}
            placeholder="Ej: Se pagó médico por gripa $85.000. Llegó factura bimestral del agua."
            rows={2}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>

      </div>

      {history && history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Historial</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-2">
                  <th className="px-3 py-2 text-left">Mes</th>
                  <th className="px-3 py-2 text-right">Ingreso</th>
                  <th className="px-3 py-2 text-right">Gastos</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-right">Dif.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => {
                  const ingreso = m.pension + (m.prima ?? 0);
                  const servicios =
                    m.compensar + m.enel + m.gas + m.agua + m.internet + m.celular + m.alarma;
                  const otros = m.empleada + m.caja + m.mercado + m.varios;
                  let externos = 0;
                  for (const k of SERVICE_KEYS) {
                    const payer = (m as unknown as Record<string, unknown>)[
                      `${k}_paid_by`
                    ] as Id<"caregivers"> | undefined;
                    if (payer && payer !== patientCaregiver?.id) {
                      externos += (m as unknown as Record<string, number>)[k];
                    }
                  }
                  const gastosAna = servicios + otros - externos;
                  const sumSettlements =
                    settlements
                      ?.filter((s) => s.month_key === m.month_key)
                      .reduce((acc, s) => acc + s.amount, 0) ?? 0;
                  const prevSaldo = history
                    .filter(
                      (x) =>
                        x.month_key < m.month_key && x.saldo_banco !== undefined,
                    )
                    .sort((a, b) => b.month_key.localeCompare(a.month_key))[0]
                    ?.saldo_banco;
                  const saldo = m.saldo_banco;
                  const hasPrev = prevSaldo !== undefined;
                  const hasSaldo = saldo !== undefined;
                  const dif =
                    hasPrev && hasSaldo
                      ? saldo - (prevSaldo + ingreso - gastosAna - sumSettlements)
                      : 0;
                  const difCls =
                    !hasPrev || !hasSaldo
                      ? "text-text-2"
                      : Math.abs(dif) < 10000
                        ? "text-green"
                        : dif < 0
                          ? "text-red"
                          : "text-amber";
                  return (
                    <tr key={m._id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <button
                          onClick={() => setSelectedMonth(m.month_key)}
                          className="text-left hover:underline"
                        >
                          {monthLabel(m.month_key)}
                        </button>
                        {m.updated_by_name && (
                          <div className="text-xs font-normal text-text-2">
                            {m.updated_by_name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-green">
                        {fmtCOP(ingreso)}
                      </td>
                      <td className="px-3 py-2 text-right text-red">
                        {fmtCOP(gastosAna)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {hasSaldo ? fmtCOP(saldo) : "Sin dato"}
                      </td>
                      <td className={`px-3 py-2 text-right ${difCls}`}>
                        {!hasPrev || !hasSaldo
                          ? "—"
                          : `${dif >= 0 ? "+" : ""}${fmtCOP(dif)}`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(m._id, m.month_key)}
                          className="min-h-8 rounded-md border border-red-border px-2 py-1 text-xs font-medium text-red active:bg-red-bg hover:bg-red-bg"
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-text-2">
            La columna Gastos solo cuenta lo que pagó Ana María. Lo que pagaron
            otros queda en cuentas pendientes y descuenta saldo solo cuando se
            les devuelve.
          </div>
        </div>
      )}

      {audit && audit.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Bitácora</h2>
          <div className="rounded-xl border border-border bg-bg">
            <ul className="divide-y divide-border">
              {audit.map((row) => (
                <li key={row._id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <span className="font-medium">{row.actor_name}</span>{" "}
                      <span className="text-text-2">{row.detail}</span>
                    </div>
                    <div className="text-xs text-text-3 tabular-nums">
                      {monthLabel(row.month_key)} · {relativeTime(row.at)}
                    </div>
                  </div>
                  {row.action === "deleted" && row.snapshot && (
                    <AuditSnapshot snapshot={row.snapshot} />
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 text-xs text-text-2">
            Registro no modificable de todos los cambios. Si se borra un mes, queda una copia completa en esta bitácora.
          </div>
        </div>
      )}

      <SaveToast status={saveStatus} />
    </main>
  );
}

function AuditSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
  const get = (k: string) => snapshot[k];
  const numField = (k: string) => {
    const v = get(k);
    return typeof v === "number" ? v : 0;
  };
  const paidList: Array<[string, string]> = [
    ["compensar", "Compensar"],
    ["enel", "Enel"],
    ["gas", "Gas"],
    ["agua", "Agua"],
    ["internet", "Internet"],
    ["celular", "Celular"],
    ["alarma", "Alarma"],
  ];
  const pagados = paidList
    .filter(([k]) => {
      const newField = get(`${k}_paid_by`);
      if (newField !== undefined && newField !== null) return true;
      return get(`${k}_paid`) === true;
    })
    .map(([, l]) => l);
  const ingreso = numField("pension") + numField("prima");
  const gastos =
    numField("compensar") +
    numField("enel") +
    numField("gas") +
    numField("agua") +
    numField("internet") +
    numField("celular") +
    numField("alarma") +
    numField("empleada") +
    numField("caja") +
    numField("mercado") +
    numField("varios");
  const saldo = get("saldo_banco");
  const nota = get("nota");
  return (
    <div className="mt-2 rounded-md border border-border-2 bg-bg-2 p-3 text-xs text-text-2 space-y-1">
      <div className="flex justify-between">
        <span>Ingreso</span>
        <span className="tabular-nums text-text">{fmtCOP(ingreso)}</span>
      </div>
      <div className="flex justify-between">
        <span>Gastos</span>
        <span className="tabular-nums text-text">{fmtCOP(gastos)}</span>
      </div>
      <div className="flex justify-between">
        <span>Saldo</span>
        <span className="tabular-nums text-text">
          {typeof saldo === "number" ? fmtCOP(saldo) : "Sin dato"}
        </span>
      </div>
      {pagados.length > 0 && (
        <div className="pt-1">
          Pagos: <span className="text-text">{pagados.join(", ")}</span>
        </div>
      )}
      {typeof nota === "string" && nota.trim() && (
        <div className="pt-1">
          Nota: <span className="text-text">{nota}</span>
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-xs font-medium uppercase tracking-wider text-text-3 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

type PrevMonth = {
  month_key: string;
  compensar: number;
  compensar_paid_by?: Id<"caregivers">;
  enel: number;
  enel_paid_by?: Id<"caregivers">;
  gas: number;
  gas_paid_by?: Id<"caregivers">;
  agua: number;
  agua_paid_by?: Id<"caregivers">;
  internet: number;
  internet_paid_by?: Id<"caregivers">;
  celular: number;
  celular_paid_by?: Id<"caregivers">;
  alarma: number;
  alarma_paid_by?: Id<"caregivers">;
};

function PreviousMonthStatus({
  prev,
  prevKey,
  onGoToMonth,
  resolvePayerName,
}: {
  prev: PrevMonth | null | undefined;
  prevKey: string;
  onGoToMonth: (k: string) => void;
  resolvePayerName: (id: Id<"caregivers">) => string;
}) {
  if (prev === undefined || prev === null) return null;
  const monthName = monthLabel(prevKey);

  const rows = SERVICE_KEYS.map((s) => {
    const amount = prev[s];
    const paidBy = prev[`${s}_paid_by` as keyof PrevMonth] as
      | Id<"caregivers">
      | undefined;
    return { key: s, label: SERVICE_LABELS[s], amount, paidBy };
  });

  const totalApplicable = rows.filter((r) => r.amount > 0).length;
  const totalPaid = rows.filter((r) => r.amount > 0 && r.paidBy).length;
  const allPaid = totalApplicable > 0 && totalPaid === totalApplicable;

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Estado de {monthName}
            </h2>
            {allPaid ? (
              <Pill variant="success" icon="check_circle">
                Todo pagado
              </Pill>
            ) : (
              <Pill variant="warn" icon="schedule">
                {totalPaid} de {totalApplicable}
              </Pill>
            )}
          </div>
          <p className="mt-1 text-xs text-text-2">Mes anterior al seleccionado</p>
        </div>
        <button
          onClick={() => onGoToMonth(prevKey)}
          className="shrink-0 text-xs font-medium text-blue active:opacity-80 hover:opacity-85"
        >
          Abrir mes →
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((r) => {
          if (r.amount === 0) {
            return (
              <li
                key={r.key}
                className="flex items-center gap-3 py-2 text-sm text-text-3"
              >
                <Icon name="remove" className="text-lg" />
                <span className="flex-1">{r.label}</span>
                <span className="text-xs">No aplica</span>
              </li>
            );
          }
          if (r.paidBy) {
            return (
              <li
                key={r.key}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <Icon
                  name="check_circle"
                  filled
                  className="text-lg text-green"
                />
                <span className="flex-1">{r.label}</span>
                <span className="text-xs text-text-2">
                  {resolvePayerName(r.paidBy)}
                </span>
              </li>
            );
          }
          return (
            <li
              key={r.key}
              className="flex items-center gap-3 py-2 text-sm text-amber"
            >
              <Icon name="schedule" className="text-lg" />
              <span className="flex-1">{r.label}</span>
              <span className="text-xs font-medium">Sin pagar</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
      <span className="text-sm text-text-2">{label}</span>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-sm text-text-2">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={formatThousands(value)}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
          placeholder={placeholder ?? "0"}
          className="w-40 rounded-md border border-border-2 bg-bg-2 pl-6 pr-3 py-2 text-right text-sm tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
        />
      </div>
    </div>
  );
}

function PaidServiceRow({
  label,
  amount,
  paidBy,
  paidAt,
  patientCaregiverId,
  currentCaregiverId,
  currentCaregiverName,
  otherCaregivers,
  onAmountChange,
  onPaidToggle,
  onPaidByChange,
  onPaidAtChange,
}: {
  label: string;
  amount: string;
  paidBy: PayerId;
  paidAt: string;
  patientCaregiverId: Id<"caregivers"> | null;
  currentCaregiverId: Id<"caregivers">;
  currentCaregiverName: string;
  otherCaregivers: { id: Id<"caregivers">; name: string }[];
  onAmountChange: (v: string) => void;
  onPaidToggle: (checked: boolean) => void;
  onPaidByChange: (p: PayerId) => void;
  onPaidAtChange: (date: string) => void;
}) {
  const isPaid = paidBy !== null;
  const paidByPatient = isPaid && paidBy === patientCaregiverId;
  const tintClass = !isPaid
    ? "bg-bg"
    : paidByPatient
      ? "bg-green-bg/50"
      : "bg-amber-bg/50";

  const payerOptions: { id: Id<"caregivers">; label: string }[] = [
    ...(patientCaregiverId
      ? [{ id: patientCaregiverId, label: "Ana María" }]
      : []),
    { id: currentCaregiverId, label: `Yo (${currentCaregiverName})` },
    ...otherCaregivers.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <div
      className={`rounded-lg border border-border p-3 transition-colors ${tintClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => onPaidToggle(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-blue"
            aria-label={`Marcar ${label} como pagado`}
          />
          <span className="text-sm font-medium text-text">{label}</span>
        </label>
        <div className="relative flex shrink-0 items-center">
          <span className="pointer-events-none absolute left-3 text-sm text-text-2">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(amount)}
            onChange={(e) => onAmountChange(digitsOnly(e.target.value))}
            placeholder="0"
            className="w-32 rounded-md border border-border-2 bg-bg pl-6 pr-3 py-1.5 text-right text-sm tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
      </div>

      {isPaid && (
        <div className="mt-2.5 space-y-2 pl-7">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-2">Pagó:</span>
            {payerOptions.map((o) => {
              const active = paidBy === o.id;
              return (
                <button
                  key={String(o.id)}
                  type="button"
                  onClick={() => onPaidByChange(o.id)}
                  className={`min-h-7 rounded-md border px-2 py-0.5 text-xs font-medium active:opacity-80 ${
                    active
                      ? "border-text bg-text text-bg"
                      : "border-border-2 bg-bg text-text hover:bg-bg-2"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-2">El:</span>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => onPaidAtChange(e.target.value)}
              className="rounded-md border border-border-2 bg-bg px-2 py-1 text-xs focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-text-2">
        <Icon name="sync" className="text-base animate-spin" />
        Guardando...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green">
        <Icon name="check_circle" filled className="text-base" />
        Cambios guardados
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red">
      <Icon name="error" filled className="text-base" />
      Error al guardar
    </span>
  );
}

function SaveToast({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  if (status === "idle") return null;
  const base =
    "fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full px-5 py-2.5 shadow-lg pointer-events-none transition-opacity";
  if (status === "saving") {
    return (
      <div className={`${base} bg-bg text-text border border-border`}>
        <Icon name="sync" className="text-lg animate-spin" />
        <span className="text-sm font-medium">Guardando...</span>
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className={`${base} bg-green text-bg`}>
        <Icon name="check_circle" filled className="text-lg" />
        <span className="text-sm font-medium">Guardado</span>
      </div>
    );
  }
  return (
    <div className={`${base} bg-red text-bg`}>
      <Icon name="error" filled className="text-lg" />
      <span className="text-sm font-medium">Error al guardar</span>
    </div>
  );
}

function StatementRow({
  label,
  value,
  valueClass,
  bold,
  muted,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={muted ? "text-text-3" : "text-text-2"}>{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-medium" : ""} ${
          valueClass ?? (muted ? "text-text-3" : "text-text")
        }`}
      >
        {value}
      </span>
    </div>
  );
}
