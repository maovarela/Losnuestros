"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";
import { WhoDidIt } from "../_components/who-did-it";

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
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    null,
  );
  const [editingId, setEditingId] = useState<Id<"medications"> | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const searchParams = useSearchParams();
  const handledEditRef = useRef(false);

  useEffect(() => {
    if (handledEditRef.current) return;
    const editId = searchParams.get("edit");
    if (!editId || !meds) return;
    const target = meds.find((m) => m._id === editId);
    if (!target) return;
    handledEditRef.current = true;
    setEditingId(target._id);
    setForm({
      name: target.name,
      dosage: target.dosage ?? "",
      doctor: target.doctor ?? "",
      last_refill: target.last_refill ?? "",
      next_refill: target.next_refill ?? "",
      notes: target.notes ?? "",
    });
    setResponsibleFor(target.responsible_for ?? null);
    setNameError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchParams, meds]);

  useEffect(() => {
    if (!savedFlag) return;
    const t = setTimeout(() => setSavedFlag(false), 3000);
    return () => clearTimeout(t);
  }, [savedFlag]);

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
    setResponsibleFor(med.responsible_for ?? null);
    setNameError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setResponsibleFor(null);
    setNameError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setNameError("Necesitamos un nombre para guardarlo");
      return;
    }
    setNameError(null);
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
        responsibleFor: responsibleFor ?? undefined,
      };
      if (editingId) {
        await updateMed({ id: editingId, ...payload });
      } else {
        await createMed({ patientId, ...payload });
      }
      cancelEdit();
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"medications">, name: string) {
    const ok = window.confirm(
      `Vas a quitar "${name}" de la lista de medicamentos. ¿Continuar?`,
    );
    if (!ok) return;
    await removeMed({ id });
    if (editingId === id) cancelEdit();
  }

  return (
    <main>
      {alerts.vencidos.length > 0 && (
        <div className="space-y-2">
          {alerts.vencidos.map((m) => (
            <div
              key={m._id}
              className="rounded-lg border border-red-border bg-red-bg px-3 py-2 text-sm text-red"
            >
              Refill vencido. <strong>{m.name}</strong> debía hacerse el{" "}
              {fmtDate(m.next_refill!)}.
            </div>
          ))}
        </div>
      )}

      {alerts.proximos.length > 0 && (
        <div className="mt-2 space-y-2">
          {alerts.proximos.map((m) => {
            const d = daysUntil(m.next_refill!);
            const cuando =
              d === 0
                ? "hoy"
                : d === 1
                  ? "mañana"
                  : `en ${d} días`;
            return (
              <div
                key={m._id}
                className="rounded-lg border border-amber-border bg-amber-bg px-3 py-2 text-sm text-amber"
              >
                Refill próximo. <strong>{m.name}</strong>, {cuando} (
                {fmtDate(m.next_refill!)}).
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
            <label className="block text-xs text-text-2" htmlFor="med-name">
              Nombre
            </label>
            <input
              id="med-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Atorvastatina 40mg"
              className={`mt-1 w-full rounded-md border bg-bg-2 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${nameError ? "border-red" : "border-border-2 focus:border-blue"}`}
            />
            {nameError && (
              <div className="mt-1 text-xs text-red">{nameError}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-text-2">Dosis</label>
            <input
              type="text"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              placeholder="Ej: 1 tableta cada 24 horas"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Médico</label>
            <input
              type="text"
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="Ej: Dr. Bastidas, Medicina Familiar"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2">Último refill</label>
              <input
                type="date"
                value={form.last_refill}
                onChange={(e) => setForm({ ...form, last_refill: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-text-2">Próximo refill</label>
              <input
                type="date"
                value={form.next_refill}
                onChange={(e) => setForm({ ...form, next_refill: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
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
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <WhoDidIt
            value={responsibleFor}
            onChange={setResponsibleFor}
            label="¿Quién hizo el refill?"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {savedFlag && (
            <div className="mr-auto text-xs text-green">Cambios guardados</div>
          )}
          {editingId && (
            <button
              onClick={cancelEdit}
              className="min-h-11 rounded-md border border-border-2 bg-bg px-4 py-2 text-sm hover:bg-bg-2 active:bg-bg-2"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 rounded-md bg-text px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
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
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Cargando...
          </div>
        )}
        {meds && meds.length === 0 && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Aún no hay medicamentos. Agrega el primero usando el formulario de arriba.
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
              const showAttribution = !!m.updated_by;
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
                        <div className="mt-1 text-xs italic text-text-2">
                          {m.notes}
                        </div>
                      )}
                    </div>
                    {badge && (
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    {showAttribution ? (
                      <div className="text-xs text-text-2">
                        {m.responsible_for_name &&
                        m.responsible_for !== m.updated_by ? (
                          <>
                            Lo registró {m.updated_by_name} · lo hizo{" "}
                            <span className="font-medium text-text">
                              {m.responsible_for_name}
                            </span>{" "}
                            {relativeTime(m.updated_at)}
                          </>
                        ) : (
                          <>
                            Lo actualizó {m.updated_by_name} {relativeTime(m.updated_at)}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(m)}
                        className="min-h-9 rounded-md border border-border-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-bg-2 active:bg-bg-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(m._id, m.name)}
                        className="min-h-9 rounded-md border border-red-border px-3 py-1.5 text-xs font-medium text-red hover:bg-red-bg active:bg-red-bg"
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
    </main>
  );
}
