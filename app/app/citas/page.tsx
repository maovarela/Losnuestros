"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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

type CitaDoc = Doc<"appointments"> & {
  updated_by_name?: string | null;
  responsible_for_name?: string | null;
};

export default function CitasPage() {
  const { patientId, caregiverId } = useAppContext();
  const citas = useQuery(api.appointments.listByPatient, { patientId });
  const createCita = useMutation(api.appointments.create);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    null,
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const searchParams = useSearchParams();
  const editIdFromUrl = searchParams.get("edit");

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

  async function handleCreate() {
    if (!form.date) {
      setDateError("Necesitamos la fecha de la cita");
      return;
    }
    setDateError(null);
    setSaving(true);
    try {
      await createCita({
        patientId,
        date: form.date,
        doctor: form.doctor.trim() || undefined,
        reason: form.reason.trim() || undefined,
        location: form.location.trim() || undefined,
        next_appointment: form.next_appointment || undefined,
        notes: form.notes.trim() || undefined,
        updatedBy: caregiverId,
        responsibleFor: responsibleFor ?? undefined,
      });
      setForm(EMPTY_FORM);
      setResponsibleFor(null);
      setShowAddForm(false);
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
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

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Citas médicas</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 min-h-9 rounded-md bg-blue px-3 py-1.5 text-sm font-medium text-bg active:opacity-80 hover:opacity-85"
          >
            <Icon name="add" className="text-base" />
            Agregar
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mt-3 rounded-xl border border-l-4 border-blue-border border-l-blue bg-bg p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold">Agregar cita</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
                setResponsibleFor(null);
                setDateError(null);
              }}
              aria-label="Cancelar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
            >
              <Icon name="close" className="text-xl" />
            </button>
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
                <label className="block text-xs text-text-2">
                  Próxima programada
                </label>
                <input
                  type="date"
                  value={form.next_appointment}
                  onChange={(e) =>
                    setForm({ ...form, next_appointment: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-2">
                Especialidad o médico
              </label>
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
              <label className="block text-xs text-text-2">
                Resultado o notas
              </label>
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
          <div className="mt-4 flex items-center justify-end gap-2">
            {savedFlag && (
              <div className="mr-auto text-xs text-green">Cambios guardados</div>
            )}
            <button
              onClick={handleCreate}
              disabled={saving}
              className="min-h-11 rounded-md bg-blue px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {citas === undefined && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Cargando...
          </div>
        )}
        {citas && citas.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Aún no hay citas. Toca "Agregar" arriba para crear la primera.
          </div>
        )}
        {sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((c) => (
              <CitaCard
                key={c._id}
                c={c as CitaDoc}
                caregiverId={caregiverId}
                defaultEditing={editIdFromUrl === c._id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CitaCard({
  c,
  caregiverId,
  defaultEditing,
}: {
  c: CitaDoc;
  caregiverId: Id<"caregivers">;
  defaultEditing?: boolean;
}) {
  const [editing, setEditing] = useState(defaultEditing ?? false);
  const cardRef = useRef<HTMLDivElement>(null);
  const handledDefaultRef = useRef(false);

  useEffect(() => {
    if (defaultEditing && !handledDefaultRef.current && cardRef.current) {
      handledDefaultRef.current = true;
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [defaultEditing]);

  if (editing) {
    return (
      <div ref={cardRef}>
        <CitaEditForm
          c={c}
          caregiverId={caregiverId}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  const d = daysUntil(c.date);
  const isFuture = d >= 0;
  const showAttribution = !!c.updated_by;
  const badge = isFuture
    ? d === 0
      ? { text: "Hoy", variant: "tertiary" as const }
      : d === 1
        ? { text: "Mañana", variant: "tertiary" as const }
        : d <= 7
          ? { text: `En ${d} días`, variant: "warn" as const }
          : { text: `En ${d} días`, variant: "tertiary" as const }
    : null;

  return (
    <div
      ref={cardRef}
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
            {badge && <Pill variant={badge.variant}>{badge.text}</Pill>}
          </div>
          <div className="mt-1 text-sm text-text-2">{fmtDate(c.date)}</div>
          {c.reason && (
            <div className="mt-1 text-sm text-text-2">{c.reason}</div>
          )}
          {c.location && (
            <div className="mt-1 text-xs text-text-3">{c.location}</div>
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
            {c.responsible_for_name && c.responsible_for !== c.updated_by ? (
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
            onClick={() => setEditing(true)}
            className="min-h-9 rounded-md border border-border-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-bg-2 active:bg-bg-2"
          >
            Editar
          </button>
          <DeleteCitaButton id={c._id} label={c.doctor ?? fmtDate(c.date)} />
        </div>
      </div>
    </div>
  );
}

function DeleteCitaButton({
  id,
  label,
}: {
  id: Id<"appointments">;
  label: string;
}) {
  const removeCita = useMutation(api.appointments.remove);
  async function handleDelete() {
    const ok = window.confirm(
      `Vas a quitar "${label}" del historial. ¿Continuar?`,
    );
    if (!ok) return;
    await removeCita({ id });
  }
  return (
    <button
      onClick={handleDelete}
      className="min-h-9 rounded-md border border-red-border px-3 py-1.5 text-xs font-medium text-red hover:bg-red-bg active:bg-red-bg"
    >
      Borrar
    </button>
  );
}

function CitaEditForm({
  c,
  caregiverId,
  onClose,
}: {
  c: CitaDoc;
  caregiverId: Id<"caregivers">;
  onClose: () => void;
}) {
  const updateCita = useMutation(api.appointments.update);
  const [form, setForm] = useState<FormState>({
    date: c.date,
    doctor: c.doctor ?? "",
    reason: c.reason ?? "",
    location: c.location ?? "",
    next_appointment: c.next_appointment ?? "",
    notes: c.notes ?? "",
  });
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    c.responsible_for ?? null,
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.date) {
      setDateError("Necesitamos la fecha de la cita");
      return;
    }
    setDateError(null);
    setSaving(true);
    try {
      await updateCita({
        id: c._id,
        date: form.date,
        doctor: form.doctor.trim() || undefined,
        reason: form.reason.trim() || undefined,
        location: form.location.trim() || undefined,
        next_appointment: form.next_appointment || undefined,
        notes: form.notes.trim() || undefined,
        updatedBy: caregiverId,
        responsibleFor: responsibleFor ?? undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-l-4 border-blue-border border-l-blue bg-bg p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold">Editar cita</h3>
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
            <label className="block text-xs text-text-2">
              Próxima programada
            </label>
            <input
              type="date"
              value={form.next_appointment}
              onChange={(e) =>
                setForm({ ...form, next_appointment: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-2">
            Especialidad o médico
          </label>
          <input
            type="text"
            value={form.doctor}
            onChange={(e) => setForm({ ...form, doctor: e.target.value })}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-text-2">Motivo</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-text-2">Lugar</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-text-2">
            Resultado o notas
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="min-h-11 rounded-md border border-border-2 bg-bg px-4 py-2 text-sm hover:bg-bg-2 active:bg-bg-2"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="min-h-11 rounded-md bg-blue px-5 py-2 text-sm font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
