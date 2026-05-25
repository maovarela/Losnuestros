"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppContext } from "@/lib/app-context";
import { useDropContext } from "@/lib/drop-context";

type ServiceKey =
  | "compensar"
  | "enel"
  | "gas"
  | "agua"
  | "internet"
  | "celular"
  | "alarma";

type Proposal =
  | {
      kind: "medication";
      name: string;
      dosage: string;
      doctor: string;
      last_refill: string;
      next_refill: string;
      notes: string;
    }
  | {
      kind: "appointment";
      date: string;
      doctor: string;
      location: string;
      reason: string;
      notes: string;
    }
  | {
      kind: "payment";
      service: ServiceKey | "";
      amount: string;
      month: string;
    };

type ProposalRow = { id: string; data: Proposal };

function normalize(raw: unknown): ProposalRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p, i): ProposalRow | null => {
      if (!p || typeof p !== "object") return null;
      const obj = p as Record<string, unknown>;
      const id = `p-${Date.now()}-${i}`;
      if (obj.type === "medication") {
        return {
          id,
          data: {
            kind: "medication",
            name: String(obj.name ?? ""),
            dosage: String(obj.dosage ?? ""),
            doctor: String(obj.doctor ?? ""),
            last_refill: String(obj.last_refill ?? ""),
            next_refill: String(obj.next_refill ?? ""),
            notes: String(obj.notes ?? ""),
          },
        };
      }
      if (obj.type === "appointment") {
        return {
          id,
          data: {
            kind: "appointment",
            date: String(obj.date ?? ""),
            doctor: String(obj.doctor ?? ""),
            location: String(obj.location ?? ""),
            reason: String(obj.reason ?? ""),
            notes: String(obj.notes ?? ""),
          },
        };
      }
      if (obj.type === "payment") {
        return {
          id,
          data: {
            kind: "payment",
            service: (obj.service as ServiceKey) ?? "",
            amount: obj.amount != null ? String(obj.amount) : "",
            month: String(obj.month ?? ""),
          },
        };
      }
      return null;
    })
    .filter((p): p is ProposalRow => p !== null);
}

export default function IngestarPage() {
  const { patientId, caregiverId } = useAppContext();
  const createMed = useMutation(api.medications.create);
  const createCita = useMutation(api.appointments.create);
  const markPaid = useMutation(api.financeMonths.markServicePaid);

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const { consumePendingFile } = useDropContext();
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;
    const pending = consumePendingFile();
    if (pending) {
      consumedRef.current = true;
      setFile(pending);
    }
  }, [consumePendingFile]);

  async function handleAnalyze() {
    setError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok && data.error !== "parse_failed" && data.error !== "api_failed") {
        setError(data.message ?? "Algo salió mal al analizar");
        return;
      }
      if (data.message) setError(data.message);
      const rows = normalize(data.proposals);
      if (rows.length === 0 && !data.message) {
        setError(
          "No encontré nada para registrar. Prueba con otra foto, otro texto, o ingresa los datos a mano en la pestaña correspondiente.",
        );
      }
      setProposals((prev) => [...rows, ...prev]);
      setText("");
      setFile(null);
    } catch (e) {
      setError(
        `No pude conectar con el servidor: ${e instanceof Error ? e.message : "error desconocido"}. Prueba de nuevo o ingresa a mano.`,
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRow(id: string, patch: Partial<Proposal>) {
    setProposals((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, data: { ...r.data, ...patch } as Proposal } : r,
      ),
    );
  }

  function discardRow(id: string) {
    setProposals((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveRow(row: ProposalRow) {
    setSavingId(row.id);
    try {
      if (row.data.kind === "medication") {
        if (!row.data.name.trim()) {
          setError("El medicamento necesita un nombre");
          return;
        }
        await createMed({
          patientId,
          updatedBy: caregiverId,
          name: row.data.name.trim(),
          dosage: row.data.dosage.trim() || undefined,
          doctor: row.data.doctor.trim() || undefined,
          last_refill: row.data.last_refill || undefined,
          next_refill: row.data.next_refill || undefined,
          notes: row.data.notes.trim() || undefined,
        });
      } else if (row.data.kind === "appointment") {
        if (!row.data.date) {
          setError("La cita necesita una fecha");
          return;
        }
        await createCita({
          patientId,
          updatedBy: caregiverId,
          date: row.data.date,
          doctor: row.data.doctor.trim() || undefined,
          location: row.data.location.trim() || undefined,
          reason: row.data.reason.trim() || undefined,
          notes: row.data.notes.trim() || undefined,
        });
      } else if (row.data.kind === "payment") {
        if (!row.data.service || !row.data.month) {
          setError("El pago necesita servicio y mes");
          return;
        }
        await markPaid({
          patientId,
          updatedBy: caregiverId,
          monthKey: row.data.month,
          service: row.data.service as ServiceKey,
        });
      }
      discardRow(row.id);
      setSavedCount((n) => n + 1);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main>
      <section
        aria-label="Cargar foto o texto"
        className="rounded-xl border border-border bg-bg p-4"
      >
        <div className="text-sm font-medium">
          Subir recetario, mensaje de cita o recibo
        </div>
        <p className="mt-1 text-xs text-text-2">
          Tómale foto al recetario o pega el mensaje de WhatsApp. La app te
          propone lo que entendió y tú confirmas antes de guardar.
        </p>

        <div className="mt-3">
          <label className="block text-xs text-text-2">Foto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-text file:px-3 file:py-1.5 file:text-bg"
          />
          {file && (
            <div className="mt-1 text-xs text-text-2">
              Seleccionado: {file.name}
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="block text-xs text-text-2">Texto (opcional)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej: Reumatología - Mayo 28 - 11 AM, Sede 98 con 11"
            rows={3}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {savedCount > 0 && (
            <div className="mr-auto text-xs text-green">
              {savedCount === 1
                ? "1 item guardado"
                : `${savedCount} items guardados`}
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!text.trim() && !file)}
            className="min-h-11 rounded-md bg-blue px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
          >
            {analyzing ? "Analizando..." : "Analizar"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-amber-border bg-amber-bg px-3 py-2 text-sm text-amber">
            {error}
          </div>
        )}
      </section>

      {proposals.length > 0 && (
        <section aria-label="Propuestas" className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
            Propuestas ({proposals.length})
          </div>
          <div className="space-y-3">
            {proposals.map((row) => (
              <ProposalCard
                key={row.id}
                row={row}
                saving={savingId === row.id}
                onChange={(patch) => updateRow(row.id, patch)}
                onDiscard={() => discardRow(row.id)}
                onSave={() => saveRow(row)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-bg p-4 text-xs text-text-2">
        Si la app no logra leerlo o se equivoca, puedes ingresar los datos a
        mano directamente en{" "}
        <Link href="/app/medicamentos" className="text-blue underline">
          Medicamentos
        </Link>
        ,{" "}
        <Link href="/app/citas" className="text-blue underline">
          Citas
        </Link>{" "}
        o{" "}
        <Link href="/app/finanzas" className="text-blue underline">
          Finanzas
        </Link>
        .
      </section>
    </main>
  );
}

const TYPE_LABEL: Record<Proposal["kind"], string> = {
  medication: "Medicamento",
  appointment: "Cita médica",
  payment: "Pago de servicio",
};

const TYPE_BADGE: Record<Proposal["kind"], string> = {
  medication: "bg-amber-bg text-amber",
  appointment: "bg-blue-bg text-blue",
  payment: "bg-green-bg text-green",
};

function ProposalCard({
  row,
  saving,
  onChange,
  onDiscard,
  onSave,
}: {
  row: ProposalRow;
  saving: boolean;
  onChange: (patch: Partial<Proposal>) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[row.data.kind]}`}
        >
          {TYPE_LABEL[row.data.kind]}
        </span>
        <button
          onClick={onDiscard}
          className="min-h-8 rounded-md border border-border-2 px-2 py-1 text-xs text-text-2 hover:bg-bg-2 active:bg-bg-2"
        >
          Descartar
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {row.data.kind === "medication" && (
          <MedicationFields data={row.data} onChange={onChange} />
        )}
        {row.data.kind === "appointment" && (
          <AppointmentFields data={row.data} onChange={onChange} />
        )}
        {row.data.kind === "payment" && (
          <PaymentFields data={row.data} onChange={onChange} />
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="min-h-9 rounded-md bg-blue px-4 py-1.5 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar este"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-text-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
      />
    </div>
  );
}

function MedicationFields({
  data,
  onChange,
}: {
  data: Extract<Proposal, { kind: "medication" }>;
  onChange: (patch: Partial<Proposal>) => void;
}) {
  return (
    <>
      <Field
        label="Nombre"
        value={data.name}
        onChange={(v) => onChange({ name: v })}
      />
      <Field
        label="Dosis"
        value={data.dosage}
        onChange={(v) => onChange({ dosage: v })}
      />
      <Field
        label="Médico"
        value={data.doctor}
        onChange={(v) => onChange({ doctor: v })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Último refill"
          type="date"
          value={data.last_refill}
          onChange={(v) => onChange({ last_refill: v })}
        />
        <Field
          label="Próximo refill"
          type="date"
          value={data.next_refill}
          onChange={(v) => onChange({ next_refill: v })}
        />
      </div>
      <Field
        label="Notas"
        value={data.notes}
        onChange={(v) => onChange({ notes: v })}
      />
    </>
  );
}

function AppointmentFields({
  data,
  onChange,
}: {
  data: Extract<Proposal, { kind: "appointment" }>;
  onChange: (patch: Partial<Proposal>) => void;
}) {
  return (
    <>
      <Field
        label="Fecha"
        type="date"
        value={data.date}
        onChange={(v) => onChange({ date: v })}
      />
      <Field
        label="Médico o especialidad"
        value={data.doctor}
        onChange={(v) => onChange({ doctor: v })}
      />
      <Field
        label="Lugar (incluye hora)"
        value={data.location}
        onChange={(v) => onChange({ location: v })}
      />
      <Field
        label="Motivo"
        value={data.reason}
        onChange={(v) => onChange({ reason: v })}
      />
      <Field
        label="Notas"
        value={data.notes}
        onChange={(v) => onChange({ notes: v })}
      />
    </>
  );
}

const SERVICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Elegí un servicio" },
  { value: "compensar", label: "Salud Compensar" },
  { value: "enel", label: "Energía Enel" },
  { value: "gas", label: "Gas Vanti" },
  { value: "agua", label: "Acueducto EAAB" },
  { value: "internet", label: "Claro internet" },
  { value: "celular", label: "Claro celular" },
  { value: "alarma", label: "Alarma" },
];

function PaymentFields({
  data,
  onChange,
}: {
  data: Extract<Proposal, { kind: "payment" }>;
  onChange: (patch: Partial<Proposal>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs text-text-2">Servicio</label>
        <select
          value={data.service}
          onChange={(e) =>
            onChange({ service: e.target.value as ServiceKey | "" })
          }
          className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
        >
          {SERVICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Mes (YYYY-MM)"
        value={data.month}
        onChange={(v) => onChange({ month: v })}
        placeholder="2026-05"
      />
      <Field
        label="Monto"
        value={data.amount}
        onChange={(v) => onChange({ amount: v.replace(/\D/g, "") })}
        placeholder="252470"
      />
      <p className="text-xs text-text-2">
        Marcar el pago como hecho. El monto queda registrado en finanzas.
      </p>
    </>
  );
}
