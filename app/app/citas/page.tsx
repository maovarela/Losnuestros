"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";
import { Icon } from "../_components/icon";
import { Pill } from "../_components/pill";
import { WhoDidIt } from "../_components/who-did-it";

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
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    null,
  );
  const [editingId, setEditingId] = useState<Id<"appointments"> | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const searchParams = useSearchParams();
  const handledEditRef = useRef(false);

  useEffect(() => {
    if (handledEditRef.current) return;
    const editId = searchParams.get("edit");
    if (!editId || !citas) return;
    const target = citas.find((c) => c._id === editId);
    if (!target) return;
    handledEditRef.current = true;
    setEditingId(target._id);
    setForm({
      date: target.date,
      doctor: target.doctor ?? "",
      reason: target.reason ?? "",
      location: target.location ?? "",
      next_appointment: target.next_appointment ?? "",
      notes: target.notes ?? "",
    });
    setResponsibleFor(target.responsible_for ?? null);
    setDateError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchParams, citas]);

  useEffect(() => {
    if (!savedFlag) return;
    const t = setTimeout(() => setSavedFlag(false), 3000);
    return () => clearTimeout(t);
  }, [savedFlag]);

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
    setResponsibleFor(cita.responsible_for ?? null);
    setDateError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setResponsibleFor(null);
    setDateError(null);
  }

  async function handleSave() {
    if (!form.date) {
      setDateError("Necesitamos la fecha de la cita");
      return;
    }
    setDateError(null);
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
        responsibleFor: responsibleFor ?? undefined,
      };
      if (editingId) {
        await updateCita({ id: editingId, ...payload });
      } else {
        await createCita({ patientId, ...payload });
      }
      cancelEdit();
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"appointments">, label: string) {
    const ok = window.confirm(
      `Vas a quitar "${label}" del historial. ¿Continuar?`,
    );
    if (!ok) return;
    await removeCita({ id });
    if (editingId === id) cancelEdit();
  }

  return (
    <main>
      {proxima && (
        <div className="flex items-start gap-3 rounded-xl border-l-4 border-purple bg-purple-bg p-4">
          <Icon
            name="event"
            filled
            className="shrink-0 text-2xl text-purple"
          />
          <div className="min-w-0 flex-1 text-purple">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider">
                Próxima cita
              </div>
              <Pill variant="tertiary">
                {(() => {
                  const d = daysUntil(proxima.date);
                  return d === 0
                    ? "Hoy"
                    : d === 1
                      ? "Mañana"
                      : `En ${d} días`;
                })()}
              </Pill>
            </div>
            {proxima.doctor && (
              <div className="mt-1 text-base font-bold">{proxima.doctor}</div>
            )}
            <div className="mt-0.5 text-sm">{fmtDate(proxima.date)}</div>
            {proxima.location && (
              <div className="mt-0.5 text-xs opacity-85">
                {proxima.location}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-bg p-4">
        <div className="text-sm font-medium">
          {editingId ? "Editar cita" : "Agregar cita"}
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-2">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`mt-1 w-full rounded-md border bg-bg-2 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${dateError ? "border-red" : "border-border-2 focus:border-blue"}`}
              />
              {dateError && (
                <div className="mt-1 text-xs text-red">{dateError}</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-2">Próxima programada</label>
              <input
                type="date"
                value={form.next_appointment}
                onChange={(e) => setForm({ ...form, next_appointment: e.target.value })}
                className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-2">Especialidad o médico</label>
            <input
              type="text"
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="Ej: Neurología, Dra. Medina"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Motivo</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ej: Control neurológico"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Lugar</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ej: Piso 11, Consultorio 22, Edificio El Bosque"
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Resultado o notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: Tensión 130/80. Cambia dosis. Pedir examen de sangre."
              rows={3}
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <WhoDidIt
            value={responsibleFor}
            onChange={setResponsibleFor}
            label="¿Quién llevó a la abuela?"
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
            className="min-h-11 rounded-md bg-blue px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-xl font-semibold">Citas médicas</h2>
        {citas === undefined && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Cargando...
          </div>
        )}
        {citas && citas.length === 0 && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Aún no hay citas. Agrega la primera usando el formulario de arriba.
          </div>
        )}
        {sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((c) => {
              const d = daysUntil(c.date);
              const isFuture = d >= 0;
              const showAttribution = !!c.updated_by;
              const badge = isFuture
                ? d === 0
                  ? { text: "Hoy", variant: "tertiary" as const }
                  : d === 1
                    ? { text: "Mañana", variant: "tertiary" as const }
                    : d <= 7
                      ? {
                          text: `En ${d} días`,
                          variant: "warn" as const,
                        }
                      : {
                          text: `En ${d} días`,
                          variant: "tertiary" as const,
                        }
                : null;
              return (
                <div
                  key={c._id}
                  className="rounded-xl border border-l-4 border-border border-l-purple bg-bg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-bg text-purple"
                    >
                      <Icon name="event" filled className="text-3xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold leading-tight">
                          {c.doctor || "Cita médica"}
                        </h3>
                        {badge && (
                          <Pill variant={badge.variant}>{badge.text}</Pill>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-text-2">
                        {fmtDate(c.date)}
                      </div>
                      {c.reason && (
                        <div className="mt-1 text-sm text-text-2">
                          {c.reason}
                        </div>
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
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    {showAttribution ? (
                      <div className="text-xs text-text-2">
                        {c.responsible_for_name &&
                        c.responsible_for !== c.updated_by ? (
                          <>
                            La registró {c.updated_by_name} · la llevó{" "}
                            <span className="font-medium text-text">
                              {c.responsible_for_name}
                            </span>{" "}
                            {relativeTime(c.updated_at)}
                          </>
                        ) : (
                          <>
                            La actualizó {c.updated_by_name} {relativeTime(c.updated_at)}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="min-h-9 rounded-md border border-border-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-bg-2 active:bg-bg-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(c._id, c.doctor ?? fmtDate(c.date))
                        }
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
