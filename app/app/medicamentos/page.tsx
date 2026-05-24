"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

type FormState = {
  name: string;
  dosage: string;
  doctor: string;
  last_refill: string;
  next_refill: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  dosage: "",
  doctor: "",
  last_refill: "",
  next_refill: "",
  notes: "",
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

function daysUntil(iso: string): number {
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

export default function MedicamentosPage() {
  const { patientId, caregiverId } = useAppContext();
  const meds = useQuery(api.medications.listByPatient, { patientId });
  const createMed = useMutation(api.medications.create);
  const updateMed = useMutation(api.medications.update);
  const removeMed = useMutation(api.medications.remove);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<Id<"medications"> | null>(null);
  const [saving, setSaving] = useState(false);

  const alerts = useMemo(() => {
    if (!meds) return { vencidos: [], proximos: [] };
    const vencidos = meds.filter((m) => m.next_refill && daysUntil(m.next_refill) < 0);
    const proximos = meds.filter((m) => {
      if (!m.next_refill) return false;
      const d = daysUntil(m.next_refill);
      return d >= 0 && d <= 7;
    });
    return { vencidos, proximos };
  }, [meds]);

  function startEdit(med: NonNullable<typeof meds>[number]) {
    setEditingId(med._id);
    setForm({
      name: med.name,
      dosage: med.dosage ?? "",
      doctor: med.doctor ?? "",
      last_refill: med.last_refill ?? "",
      next_refill: med.next_refill ?? "",
      notes: med.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        dosage: form.dosage.trim() || undefined,
        doctor: form.doctor.trim() || undefined,
        last_refill: form.last_refill || undefined,
        next_refill: form.next_refill || undefined,
        notes: form.notes.trim() || undefined,
        updatedBy: caregiverId,
      };
      if (editingId) {
        await updateMed({ id: editingId, ...payload });
      } else {
        await createMed({ patientId, ...payload });
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"medications">, name: string) {
    if (!confirm(`¿Borrar "${name}"?`)) return;
    await removeMed({ id });
    if (editingId === id) cancelEdit();
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <Link
        href="/app"
        className="mb-4 inline-block text-sm text-text-2 hover:text-text"
      >
        ← Volver
      </Link>

      <h1 className="text-xl font-medium">Medicamentos</h1>

      {alerts.vencidos.length > 0 && (
        <div className="mt-4 space-y-2">
          {alerts.vencidos.map((m) => (
            <div
              key={m._id}
              className="rounded-lg border border-red-border bg-red-bg px-3 py-2 text-sm text-red"
            >
              Refill vencido: <strong>{m.name}</strong> — debía hacerse el{" "}
              {fmtDate(m.next_refill!)}
            </div>
          ))}
        </div>
      )}

      {alerts.proximos.length > 0 && (
        <div className="mt-2 space-y-2">
          {alerts.proximos.map((m) => {
            const d = daysUntil(m.next_refill!);
            return (
              <div
                key={m._id}
                className="rounded-lg border border-amber-border bg-amber-bg px-3 py-2 text-sm text-amber"
              >
                Refill próximo: <strong>{m.name}</strong> —{" "}
                {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`} ({fmtDate(m.next_refill!)})
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <div className="text-sm font-medium">
          {editingId ? "Editar medicamento" : "Agregar medicamento"}
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-text-2">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Atorvastatina 40mg"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Dosis</label>
            <input
              type="text"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              placeholder="Ej: 1 tableta cada 24 horas"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Médico</label>
            <input
              type="text"
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="Ej: Dr. Bastidas · Medicina Familiar"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2">Último refill</label>
              <input
                type="date"
                value={form.last_refill}
                onChange={(e) => setForm({ ...form, last_refill: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-2">Próximo refill</label>
              <input
                type="date"
                value={form.next_refill}
                onChange={(e) => setForm({ ...form, next_refill: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-2">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: Tomar con comida"
              rows={2}
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="rounded-md border border-border-2 bg-bg px-3 py-1.5 text-sm hover:bg-bg-2"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-text px-4 py-1.5 text-sm font-medium text-bg hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
          Lista
        </div>
        {meds === undefined && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
            Cargando...
          </div>
        )}
        {meds && meds.length === 0 && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
            No hay medicamentos registrados
          </div>
        )}
        {meds && meds.length > 0 && (
          <div className="space-y-2">
            {meds.map((m) => {
              const d = m.next_refill ? daysUntil(m.next_refill) : null;
              const badge =
                d === null
                  ? null
                  : d < 0
                    ? { text: "Vencido", className: "bg-red-bg text-red" }
                    : d <= 7
                      ? { text: `En ${d} día${d === 1 ? "" : "s"}`, className: "bg-amber-bg text-amber" }
                      : { text: fmtDate(m.next_refill!), className: "bg-green-bg text-green" };
              return (
                <div
                  key={m._id}
                  className="rounded-xl border border-border bg-bg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{m.name}</div>
                      {m.dosage && (
                        <div className="mt-1 text-xs text-text-2">{m.dosage}</div>
                      )}
                      {m.doctor && (
                        <div className="text-xs text-text-2">{m.doctor}</div>
                      )}
                      {m.last_refill && (
                        <div className="text-xs text-text-2">
                          Último refill: {fmtDate(m.last_refill)}
                        </div>
                      )}
                      {m.notes && (
                        <div className="mt-1 text-xs italic text-text-3">
                          {m.notes}
                        </div>
                      )}
                    </div>
                    {badge && (
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                    <div className="text-xs text-text-3">
                      {m.updated_by_name
                        ? `Actualizado por ${m.updated_by_name} ${relativeTime(m.updated_at)}`
                        : `Cargado ${relativeTime(m.updated_at)}`}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs text-blue hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(m._id, m.name)}
                        className="text-xs text-red hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
