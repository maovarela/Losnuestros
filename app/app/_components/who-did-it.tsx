"use client";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppContext } from "@/lib/app-context";

type Props = {
  value: Id<"caregivers"> | null;
  onChange: (id: Id<"caregivers"> | null) => void;
  label?: string;
};

export function WhoDidIt({ value, onChange, label = "¿Quién lo hizo?" }: Props) {
  const { caregiverId, caregiverName, otherCaregivers } = useAppContext();

  if (otherCaregivers.length === 0) return null;

  const meSelected = value === null || value === caregiverId;

  return (
    <div>
      <div className="text-xs text-text-2">{label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(caregiverId)}
          className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium active:opacity-80 ${
            meSelected
              ? "border-text bg-text text-bg"
              : "border-border-2 bg-bg text-text hover:bg-bg-2"
          }`}
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
              className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium active:opacity-80 ${
                active
                  ? "border-text bg-text text-bg"
                  : "border-border-2 bg-bg text-text hover:bg-bg-2"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
