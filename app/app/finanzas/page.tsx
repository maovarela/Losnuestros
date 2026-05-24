"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

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

type FormState = {
  pension: string;
  prima: string;
  compensar: string;
  compensar_paid: boolean;
  enel: string;
  enel_paid: boolean;
  gas: string;
  gas_paid: boolean;
  agua: string;
  agua_paid: boolean;
  internet: string;
  internet_paid: boolean;
  celular: string;
  celular_paid: boolean;
  alarma: string;
  alarma_paid: boolean;
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
    compensar_paid: false,
    enel: String(DEFAULTS.enel),
    enel_paid: false,
    gas: String(DEFAULTS.gas),
    gas_paid: false,
    agua: "",
    agua_paid: false,
    internet: String(DEFAULTS.internet),
    internet_paid: false,
    celular: String(DEFAULTS.celular),
    celular_paid: false,
    alarma: "",
    alarma_paid: false,
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
  const { patientId, caregiverId } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const monthData = useQuery(api.financeMonths.getByMonth, {
    patientId,
    monthKey: selectedMonth,
  });
  const history = useQuery(api.financeMonths.listByPatient, { patientId });
  const upsert = useMutation(api.financeMonths.upsert);
  const remove = useMutation(api.financeMonths.remove);

  useEffect(() => {
    if (!savedFlag) return;
    const t = setTimeout(() => setSavedFlag(false), 3000);
    return () => clearTimeout(t);
  }, [savedFlag]);

  useEffect(() => {
    if (monthData === undefined) return;
    if (monthData === null) {
      setForm(emptyForm());
    } else {
      setForm({
        pension: String(monthData.pension),
        prima: monthData.prima ? String(monthData.prima) : "",
        compensar: String(monthData.compensar),
        compensar_paid: monthData.compensar_paid,
        enel: String(monthData.enel),
        enel_paid: monthData.enel_paid,
        gas: String(monthData.gas),
        gas_paid: monthData.gas_paid,
        agua: monthData.agua ? String(monthData.agua) : "",
        agua_paid: monthData.agua_paid,
        internet: String(monthData.internet),
        internet_paid: monthData.internet_paid,
        celular: String(monthData.celular),
        celular_paid: monthData.celular_paid,
        alarma: monthData.alarma ? String(monthData.alarma) : "",
        alarma_paid: monthData.alarma_paid,
        empleada: String(monthData.empleada),
        caja: String(monthData.caja),
        mercado: String(monthData.mercado),
        varios: monthData.varios ? String(monthData.varios) : "",
        saldo_banco: monthData.saldo_banco ? String(monthData.saldo_banco) : "",
        nota: monthData.nota ?? "",
      });
    }
  }, [monthData]);

  const totals = useMemo(() => {
    const ingreso = num(form.pension) + num(form.prima);
    const gastos =
      num(form.compensar) +
      num(form.enel) +
      num(form.gas) +
      num(form.agua) +
      num(form.internet) +
      num(form.celular) +
      num(form.alarma) +
      num(form.empleada) +
      num(form.caja) +
      num(form.mercado) +
      num(form.varios);
    const teorico = ingreso - gastos;
    const banco = num(form.saldo_banco);
    const dif = banco - teorico;
    const hasBanco = form.saldo_banco.trim() !== "";
    return { ingreso, gastos, teorico, banco, dif, hasBanco };
  }, [form]);

  async function handleSave() {
    setSaving(true);
    try {
      await upsert({
        patientId,
        updatedBy: caregiverId,
        month_key: selectedMonth,
        pension: num(form.pension),
        prima: form.prima ? num(form.prima) : undefined,
        compensar: num(form.compensar),
        compensar_paid: form.compensar_paid,
        enel: num(form.enel),
        enel_paid: form.enel_paid,
        gas: num(form.gas),
        gas_paid: form.gas_paid,
        agua: num(form.agua),
        agua_paid: form.agua_paid,
        internet: num(form.internet),
        internet_paid: form.internet_paid,
        celular: num(form.celular),
        celular_paid: form.celular_paid,
        alarma: num(form.alarma),
        alarma_paid: form.alarma_paid,
        empleada: num(form.empleada),
        caja: num(form.caja),
        mercado: num(form.mercado),
        varios: num(form.varios),
        saldo_banco: form.saldo_banco.trim() ? num(form.saldo_banco) : undefined,
        nota: form.nota.trim() || undefined,
      });
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"finance_months">, key: string) {
    const ok = window.confirm(
      `Vas a borrar el registro de ${monthLabel(key)}. ¿Continuar?`,
    );
    if (!ok) return;
    await remove({ id });
  }

  const difClass =
    Math.abs(totals.dif) < 10000
      ? "text-green"
      : totals.dif < 0
        ? "text-red"
        : "text-amber";
  const difLabel =
    Math.abs(totals.dif) < 10000
      ? "Cuadra"
      : totals.dif > 0
        ? "Hay más en el banco de lo esperado"
        : "Faltan pesos en el banco frente a lo calculado";

  return (
    <main>
      <div className="rounded-xl border border-border bg-bg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium">Mes</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedMonth(currentMonthKey())}
              className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium active:bg-bg-2 ${selectedMonth === currentMonthKey() ? "border-text bg-text text-bg" : "border-border-2 bg-bg text-text hover:bg-bg-2"}`}
            >
              Mes actual
            </button>
            <button
              onClick={() => setSelectedMonth(previousMonthKey())}
              className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium active:bg-bg-2 ${selectedMonth === previousMonthKey() ? "border-text bg-text text-bg" : "border-border-2 bg-bg text-text hover:bg-bg-2"}`}
            >
              Mes pasado
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-h-9 rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-xs focus:border-blue focus:outline-none"
            >
              {monthKeysRange().map((k) => (
                <option key={k} value={k}>
                  {monthLabel(k)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs text-text-2">
          Editando {monthLabel(selectedMonth)}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-4">
        <SectionLabel>Ingresos</SectionLabel>
        <div className="mt-2 space-y-3">
          <MoneyRow
            label="Pensión recibida"
            value={form.pension}
            onChange={(v) => setForm({ ...form, pension: v })}
          />
          <MoneyRow
            label="Prima (junio o diciembre)"
            value={form.prima}
            onChange={(v) => setForm({ ...form, prima: v })}
            placeholder="0"
          />
        </div>

        <SectionLabel className="mt-5">Servicios públicos</SectionLabel>
        <div className="mt-2 space-y-3">
          <MoneyPaidRow
            label="Compensar salud"
            value={form.compensar}
            paid={form.compensar_paid}
            onChange={(v) => setForm({ ...form, compensar: v })}
            onPaid={(p) => setForm({ ...form, compensar_paid: p })}
          />
          <MoneyPaidRow
            label="Energía Enel"
            value={form.enel}
            paid={form.enel_paid}
            onChange={(v) => setForm({ ...form, enel: v })}
            onPaid={(p) => setForm({ ...form, enel_paid: p })}
          />
          <MoneyPaidRow
            label="Gas Vanti"
            value={form.gas}
            paid={form.gas_paid}
            onChange={(v) => setForm({ ...form, gas: v })}
            onPaid={(p) => setForm({ ...form, gas_paid: p })}
          />
          <MoneyPaidRow
            label="Acueducto EAAB"
            value={form.agua}
            paid={form.agua_paid}
            onChange={(v) => setForm({ ...form, agua: v })}
            onPaid={(p) => setForm({ ...form, agua_paid: p })}
          />
          <MoneyPaidRow
            label="Claro internet"
            value={form.internet}
            paid={form.internet_paid}
            onChange={(v) => setForm({ ...form, internet: v })}
            onPaid={(p) => setForm({ ...form, internet_paid: p })}
          />
          <MoneyPaidRow
            label="Claro celular"
            value={form.celular}
            paid={form.celular_paid}
            onChange={(v) => setForm({ ...form, celular: v })}
            onPaid={(p) => setForm({ ...form, celular_paid: p })}
          />
          <MoneyPaidRow
            label="Alarma (la paga la hermana)"
            value={form.alarma}
            paid={form.alarma_paid}
            onChange={(v) => setForm({ ...form, alarma: v })}
            onPaid={(p) => setForm({ ...form, alarma_paid: p })}
          />
        </div>

        <SectionLabel className="mt-5">Gastos del hogar</SectionLabel>
        <div className="mt-2 space-y-3">
          <MoneyRow
            label="Empleada doméstica"
            value={form.empleada}
            onChange={(v) => setForm({ ...form, empleada: v })}
          />
          <MoneyRow
            label="Caja menor"
            value={form.caja}
            onChange={(v) => setForm({ ...form, caja: v })}
          />
          <MoneyRow
            label="Mercado"
            value={form.mercado}
            onChange={(v) => setForm({ ...form, mercado: v })}
          />
          <MoneyRow
            label="Imprevistos o varios"
            value={form.varios}
            onChange={(v) => setForm({ ...form, varios: v })}
            placeholder="0"
          />
        </div>

        <div className="mt-5 rounded-lg border border-border-2 p-3">
          <div className="text-xs font-medium text-text-2">
            Saldo real en cuenta bancaria al cierre del mes
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm text-text-2">Saldo en banco</span>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-sm text-text-2">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousands(form.saldo_banco)}
                onChange={(e) =>
                  setForm({ ...form, saldo_banco: digitsOnly(e.target.value) })
                }
                placeholder="0"
                className="w-40 rounded-md border border-border-2 bg-bg-2 pl-6 pr-3 py-2 text-right text-sm tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs text-text-2">Nota del mes</label>
          <textarea
            value={form.nota}
            onChange={(e) => setForm({ ...form, nota: e.target.value })}
            placeholder="Ej: Se pagó médico por gripa $85.000. Llegó factura bimestral del agua."
            rows={2}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {savedFlag && (
            <div className="mr-auto text-xs text-green">Cambios guardados</div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 rounded-md bg-text px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar mes"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <div className="text-sm font-medium">
          Resumen de {monthLabel(selectedMonth)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Ingreso" value={fmtCOP(totals.ingreso)} className="text-green" />
          <Metric label="Gastos" value={fmtCOP(totals.gastos)} className="text-red" />
          <Metric
            label="Saldo teórico"
            value={fmtCOP(totals.teorico)}
            className="text-text-2"
            sub="calculado"
          />
          {totals.hasBanco && (
            <Metric
              label="Saldo banco"
              value={fmtCOP(totals.banco)}
              className={difClass}
              sub="confirmado"
            />
          )}
        </div>
        {totals.hasBanco && (
          <div className="mt-3 rounded-lg border border-border-2 p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-text-2">Diferencia</span>
              <span className={`font-medium ${difClass}`}>
                {totals.dif >= 0 ? "+" : ""}
                {fmtCOP(totals.dif)} · {difLabel}
              </span>
            </div>
          </div>
        )}
        {monthData && monthData.updated_at && (
          <div className="mt-3 border-t border-border pt-2 text-xs text-text-2">
            Actualizado {relativeTime(monthData.updated_at)}
            {monthData.updated_by && monthData.updated_by !== caregiverId && (
              <span> por otra cuidadora</span>
            )}
          </div>
        )}
      </div>

      {history && history.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
            Historial
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-2">
                  <th className="px-3 py-2 text-left">Mes</th>
                  <th className="px-3 py-2 text-right">Ingreso</th>
                  <th className="px-3 py-2 text-right">Gastos</th>
                  <th className="px-3 py-2 text-right">Teórico</th>
                  <th className="px-3 py-2 text-right">Banco</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => {
                  const ingreso = m.pension + (m.prima ?? 0);
                  const gastos =
                    m.compensar +
                    m.enel +
                    m.gas +
                    m.agua +
                    m.internet +
                    m.celular +
                    m.alarma +
                    m.empleada +
                    m.caja +
                    m.mercado +
                    m.varios;
                  const teorico = ingreso - gastos;
                  const banco = m.saldo_banco ?? 0;
                  const dif = banco - teorico;
                  const hasBanco = m.saldo_banco !== undefined;
                  const cls = !hasBanco
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
                        {fmtCOP(gastos)}
                      </td>
                      <td className="px-3 py-2 text-right text-text-2">
                        {fmtCOP(teorico)}
                      </td>
                      <td className={`px-3 py-2 text-right ${cls}`}>
                        {hasBanco ? fmtCOP(banco) : "Sin dato"}
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
            Teórico es ingresos menos gastos. Diferencia mayor a $10.000 con el banco aparece en amarillo o rojo.
          </div>
        </div>
      )}
    </main>
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

function MoneyPaidRow({
  label,
  value,
  paid,
  onChange,
  onPaid,
}: {
  label: string;
  value: string;
  paid: boolean;
  onChange: (v: string) => void;
  onPaid: (p: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
      <span className="text-sm text-text-2">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-sm text-text-2">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(value)}
            onChange={(e) => onChange(digitsOnly(e.target.value))}
            placeholder="0"
            className="w-36 rounded-md border border-border-2 bg-bg-2 pl-6 pr-3 py-2 text-right text-sm tabular-nums focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => onPaid(e.target.checked)}
            className="h-5 w-5"
          />
          Pagado
        </label>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  className,
  sub,
}: {
  label: string;
  value: string;
  className?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-bg-2 p-3">
      <div className="text-xs text-text-2">{label}</div>
      <div className={`mt-0.5 text-base font-medium ${className ?? ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-text-3">{sub}</div>}
    </div>
  );
}
