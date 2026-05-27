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

type MedDoc = Doc<"medications"> & {
  updated_by_name?: string | null;
  responsible_for_name?: string | null;
};

export default function MedicamentosPage() {
  const { patientId, caregiverId } = useAppContext();
  const meds = useQuery(api.medications.listByPatient, { patientId });
  const createMed = useMutation(api.medications.create);
  const markRefilledMut = useMutation(api.medications.markRefilled);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refilling, setRefilling] = useState<Id<"medications"> | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const searchParams = useSearchParams();
  const editIdFromUrl = searchParams.get("edit");

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

  async function handleMarkRefilled(id: Id<"medications">) {
    setRefilling(id);
    try {
      await markRefilledMut({ id, updatedBy: caregiverId });
    } finally {
      setRefilling(null);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setNameError("Necesitamos un nombre para guardarlo");
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await createMed({
        patientId,
        name: form.name.trim(),
        dosage: form.dosage.trim() || undefined,
        doctor: form.doctor.trim() || undefined,
        last_refill: form.last_refill || undefined,
        next_refill: form.next_refill || undefined,
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
      {alerts.vencidos.length > 0 && (
        <div className="space-y-2">
          {alerts.vencidos.map((m) => (
            <div
              key={m._id}
              className="flex items-center gap-3 rounded-xl border-l-4 border-red bg-red-bg px-4 py-3 text-sm text-red"
            >
              <Icon name="error" filled className="shrink-0 text-2xl" />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m.name}: refill vencido</div>
                <div className="text-xs opacity-80">
                  Debía hacerse el {fmtDate(m.next_refill!)}
                </div>
              </div>
              <button
                onClick={() => handleMarkRefilled(m._id)}
                disabled={refilling === m._id}
                className="min-h-9 shrink-0 rounded-md bg-red px-3 py-1.5 text-xs font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
              >
                {refilling === m._id ? "..." : "Hice el refill"}
              </button>
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
                className="flex items-center gap-3 rounded-xl border-l-4 border-amber bg-amber-bg px-4 py-3 text-sm text-amber"
              >
                <Icon name="schedule" className="shrink-0 text-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{m.name}: refill {cuando}</div>
                  <div className="text-xs opacity-80">
                    {fmtDate(m.next_refill!)}
                  </div>
                </div>
                <button
                  onClick={() => handleMarkRefilled(m._id)}
                  disabled={refilling === m._id}
                  className="min-h-9 shrink-0 rounded-md bg-amber px-3 py-1.5 text-xs font-medium text-bg active:opacity-80 hover:opacity-85 disabled:opacity-50"
                >
                  {refilling === m._id ? "..." : "Hice el refill"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Medicamentos</h2>
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
            <h3 className="text-base font-bold">Agregar medicamento</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setForm(EMPTY_FORM);
                setResponsibleFor(null);
                setNameError(null);
              }}
              aria-label="Cancelar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
            >
              <Icon name="close" className="text-xl" />
            </button>
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
                  onChange={(e) =>
                    setForm({ ...form, last_refill: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                />
              </div>
              <div>
                <label className="block text-xs text-text-2">Próximo refill</label>
                <input
                  type="date"
                  value={form.next_refill}
                  onChange={(e) =>
                    setForm({ ...form, next_refill: e.target.value })
                  }
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
        {meds === undefined && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Cargando...
          </div>
        )}
        {meds && meds.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-text-2">
            Aún no hay medicamentos. Toca "Agregar" arriba para crear el primero.
          </div>
        )}
        {meds && meds.length > 0 && (
          <div className="space-y-3">
            {meds.map((m) => (
              <MedCard
                key={m._id}
                m={m as MedDoc}
                caregiverId={caregiverId}
                defaultEditing={editIdFromUrl === m._id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MedCard({
  m,
  caregiverId,
  defaultEditing,
}: {
  m: MedDoc;
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
        <MedEditForm
          m={m}
          caregiverId={caregiverId}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  const d = m.next_refill ? daysUntil(m.next_refill) : null;
  const badge =
    d === null
      ? null
      : d < 0
        ? {
            text: "Vencido",
            variant: "danger" as const,
            icon: "error",
          }
        : d <= 7
          ? {
              text: `En ${d} día${d === 1 ? "" : "s"}`,
              variant: "warn" as const,
              icon: "schedule",
            }
          : {
              text: `Refill ${fmtDate(m.next_refill!)}`,
              variant: "success" as const,
              icon: "check_circle",
            };
  const showAttribution = !!m.updated_by;

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-l-4 border-border border-l-blue bg-bg p-4"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-bg text-blue"
        >
          <Icon name="medication" filled className="text-3xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight">{m.name}</h3>
            {badge && (
              <Pill variant={badge.variant} icon={badge.icon}>
                {badge.text}
              </Pill>
            )}
          </div>
          {m.dosage && (
            <div className="mt-1 text-sm text-text-2">{m.dosage}</div>
          )}
          {m.doctor && <div className="text-sm text-text-2">{m.doctor}</div>}
          {m.last_refill && (
            <div className="mt-1 text-xs text-text-3">
              Último refill: {fmtDate(m.last_refill)}
            </div>
          )}
          {m.notes && (
            <div className="mt-1 text-sm italic text-text-2">{m.notes}</div>
          )}
        </div>
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
            onClick={() => setEditing(true)}
            className="min-h-9 rounded-md border border-border-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-bg-2 active:bg-bg-2"
          >
            Editar
          </button>
          <DeleteMedButton id={m._id} name={m.name} />
        </div>
      </div>
    </div>
  );
}

function DeleteMedButton({
  id,
  name,
}: {
  id: Id<"medications">;
  name: string;
}) {
  const removeMed = useMutation(api.medications.remove);
  async function handleDelete() {
    const ok = window.confirm(
      `Vas a quitar "${name}" de la lista de medicamentos. ¿Continuar?`,
    );
    if (!ok) return;
    await removeMed({ id });
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

function MedEditForm({
  m,
  caregiverId,
  onClose,
}: {
  m: MedDoc;
  caregiverId: Id<"caregivers">;
  onClose: () => void;
}) {
  const updateMed = useMutation(api.medications.update);
  const [form, setForm] = useState<FormState>({
    name: m.name,
    dosage: m.dosage ?? "",
    doctor: m.doctor ?? "",
    last_refill: m.last_refill ?? "",
    next_refill: m.next_refill ?? "",
    notes: m.notes ?? "",
  });
  const [responsibleFor, setResponsibleFor] = useState<Id<"caregivers"> | null>(
    m.responsible_for ?? null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) {
      setNameError("Necesitamos un nombre para guardarlo");
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await updateMed({
        id: m._id,
        name: form.name.trim(),
        dosage: form.dosage.trim() || undefined,
        doctor: form.doctor.trim() || undefined,
        last_refill: form.last_refill || undefined,
        next_refill: form.next_refill || undefined,
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
        <h3 className="text-base font-bold">Editar medicamento</h3>
        <button
          onClick={onClose}
          aria-label="Cancelar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-2 active:bg-bg-2 hover:bg-bg-2"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs text-text-2">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-text-2">Médico</label>
          <input
            type="text"
            value={form.doctor}
            onChange={(e) => setForm({ ...form, doctor: e.target.value })}
            className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-2">Último refill</label>
            <input
              type="date"
              value={form.last_refill}
              onChange={(e) =>
                setForm({ ...form, last_refill: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-text-2">Próximo refill</label>
            <input
              type="date"
              value={form.next_refill}
              onChange={(e) =>
                setForm({ ...form, next_refill: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-border-2 bg-bg-2 px-3 py-2 text-sm focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-2">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
