"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

type FormState = {
  date: string;
  doctor: string;
  reason: string;
  location: string;
  next_appointment: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  date: "",
  doctor: "",
  reason: "",
  location: "",
  next_appointment: "",
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

export default function CitasPage() {
  const { patientId, caregiverId } = useAppContext();
  const citas = useQuery(api.appointments.listByPatient, { patientId });
  const createCita = useMutation(api.appointments.create);
  const updateCita = useMutation(api.appointments.update);
  const removeCita = useMutation(api.appointments.remove);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<Id<"appointments"> | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    if (!citas) return [];
    return [...citas].sort((a, b) => b.date.localeCompare(a.date));
  }, [citas]);

  const proxima = useMemo(() => {
    if (!citas) return null;
    const future = citas
      .filter((c) => daysUntil(c.date) >= 0 && daysUntil(c.date) <= 60)
      .sort((a, b) => a.date.localeCompare(b.date));
    return future[0] ?? null;
  }, [citas]);

  function startEdit(cita: NonNullable<typeof citas>[number]) {
    setEditingId(cita._id);
    setForm({
      date: cita.date,
      doctor: cita.doctor ?? "",
      reason: cita.reason ?? "",
      location: cita.location ?? "",
      next_appointment: cita.next_appointment ?? "",
      notes: cita.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.date) {
      alert("La fecha es obligatoria");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        doctor: form.doctor.trim() || undefined,
        reason: form.reason.trim() || undefined,
        location: form.location.trim() || undefined,
        next_appointment: form.next_appointment || undefined,
        notes: form.notes.trim() || undefined,
        updatedBy: caregiverId,
      };
      if (editingId) {
        await updateCita({ id: editingId, ...payload });
      } else {
        await createCita({ patientId, ...payload });
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"appointments">, label: string) {
    if (!confirm(`¿Borrar "${label}"?`)) return;
    await removeCita({ id });
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

      <h1 className="text-xl font-medium">Citas médicas</h1>

      {proxima && (
        <div className="mt-4 rounded-xl border border-blue-border bg-blue-bg p-4">
          <div className="text-xs font-medium text-blue">Próxima cita</div>
          {proxima.doctor && (
            <div className="mt-1 text-base font-medium text-blue">
              {proxima.doctor}
            </div>
          )}
          <div className="mt-1 text-sm text-blue">
            {fmtDate(proxima.date)} ·{" "}
            {(() => {
              const d = daysUntil(proxima.date);
              return d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;
            })()}
          </div>
          {proxima.location && (
            <div className="mt-1 text-xs text-blue opacity-85">
              {proxima.location}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <div className="text-sm font-medium">
          {editingId ? "Editar cita" : "Agregar cita"}
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-2">Próxima programada</label>
              <input
                type="date"
                value={form.next_appointment}
                onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-2">Especialidad o médico</label>
            <input
              type="text"
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="Ej: Neurología · Dra. Medina"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Motivo</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ej: Control neurológico"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Lugar</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ej: Piso 11, Consultorio 22, Edificio El Bosque"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-2 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Resultado o notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: Tensión 130/80. Cambia dosis. Pedir examen de sangre."
              rows={3}
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
          Historial
        </div>
        {citas === undefined && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
            Cargando...
          </div>
        )}
        {citas && citas.length === 0 && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-3">
            No hay citas registradas
          </div>
        )}
        {sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((c) => {
              const d = daysUntil(c.date);
              const isFuture = d >= 0;
              return (
                <div
                  key={c._id}
                  className="rounded-xl border border-border bg-bg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {fmtDate(c.date)}
                        </span>
                        {isFuture && (
                          <span className="rounded-md bg-blue-bg px-2 py-0.5 text-xs font-medium text-blue">
                            {d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`}
                          </span>
                        )}
                      </div>
                      {c.doctor && (
                        <div className="mt-1 text-sm text-text">{c.doctor}</div>
                      )}
                      {c.reason && (
                        <div className="mt-1 text-xs text-text-2">{c.reason}</div>
                      )}
                      {c.location && (
                        <div className="mt-1 text-xs text-text-3">
                          {c.location}
                        </div>
                      )}
                      {c.notes && (
                        <div className="mt-2 rounded-md bg-bg-2 p-2 text-xs italic text-text-2">
                          {c.notes}
                        </div>
                      )}
                      {c.next_appointment && (
                        <div className="mt-2 text-xs text-text-2">
                          Próxima programada:{" "}
                          <strong>{fmtDate(c.next_appointment)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                    <div className="text-xs text-text-3">
                      {c.updated_by_name
                        ? `Actualizado por ${c.updated_by_name} ${relativeTime(c.updated_at)}`
                        : `Cargado ${relativeTime(c.updated_at)}`}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-xs text-blue hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c._id, c.doctor ?? fmtDate(c.date))}
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
