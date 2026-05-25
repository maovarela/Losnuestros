"use client";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

type Props = {
  value: Id<"caregivers"> | null;
  onChange: (id: Id<"caregivers"> | null) => void;
  label?: string;
};

export function WhoDidIt({ value, onChange, label = "¿Quién lo hizo?" }: Props) {
  const { caregiverId, caregiverName, otherCaregivers, patientCaregiver } =
    useAppContext();

  if (otherCaregivers.length === 0 && !patientCaregiver) return null;

  const patientSelected =
    patientCaregiver !== null && value === patientCaregiver.id;
  const meSelected =
    !patientSelected && (value === null || value === caregiverId);

  const baseBtn =
    "min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium active:opacity-80";
  const activeBtn = "border-text bg-text text-bg";
  const idleBtn = "border-border-2 bg-bg text-text hover:bg-bg-2";

  return (
    <div>
      <div className="text-xs text-text-2">{label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {patientCaregiver && (
          <button
            type="button"
            onClick={() => onChange(patientCaregiver.id)}
            className={`${baseBtn} ${patientSelected ? activeBtn : idleBtn}`}
          >
            {patientCaregiver.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(caregiverId)}
          className={`${baseBtn} ${meSelected ? activeBtn : idleBtn}`}
        >
          Yo ({caregiverName})
        </button>
        {otherCaregivers.map((c) => {
          const active = value === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onChange(c.id)}
              className={`${baseBtn} ${active ? activeBtn : idleBtn}`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
