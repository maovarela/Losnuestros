import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const meds = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return await Promise.all(
      meds.map(async (m) => {
        const updater = m.updated_by ? await ctx.db.get(m.updated_by) : null;
        const responsible = m.responsible_for
          ? await ctx.db.get(m.responsible_for)
          : null;
        return {
          ...m,
          updated_by_name: updater?.name ?? null,
          responsible_for_name: responsible?.name ?? null,
        };
      }),
    );
  },
});

const fieldsValidator = {
  name: v.string(),
  dosage: v.optional(v.string()),
  doctor: v.optional(v.string()),
  last_refill: v.optional(v.string()),
  next_refill: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    updatedBy: v.id("caregivers"),
    responsibleFor: v.optional(v.id("caregivers")),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, responsibleFor, ...fields } = args;
    const id = await ctx.db.insert("medications", {
      patient_id: patientId,
      updated_by: updatedBy,
      responsible_for: responsibleFor,
      updated_at: Date.now(),
      ...fields,
    });
    let responsibleName: string | undefined;
    if (responsibleFor && responsibleFor !== updatedBy) {
      const r = await ctx.db.get(responsibleFor);
      responsibleName = r?.name;
    }
    await ctx.scheduler.runAfter(0, internal.email.sendChangeAlert, {
      patientId,
      actorId: updatedBy,
      eventType: "medication_created",
      detail: fields.name,
      responsibleName,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("medications"),
    updatedBy: v.id("caregivers"),
    responsibleFor: v.optional(v.id("caregivers")),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, responsibleFor, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updated_by: updatedBy,
      responsible_for: responsibleFor,
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) /
      86400000,
  );
}

export const markRefilled = mutation({
  args: {
    id: v.id("medications"),
    updatedBy: v.id("caregivers"),
    responsibleFor: v.optional(v.id("caregivers")),
  },
  handler: async (ctx, args) => {
    const med = await ctx.db.get(args.id);
    if (!med) throw new Error("medication not found");

    const today = todayISO();
    let interval = 30;
    if (med.last_refill && med.next_refill) {
      const prev = diffDays(med.last_refill, med.next_refill);
      if (prev > 0) interval = prev;
    }
    await ctx.db.patch(args.id, {
      last_refill: today,
      next_refill: addDaysISO(today, interval),
      updated_by: args.updatedBy,
      responsible_for: args.responsibleFor ?? args.updatedBy,
      updated_at: Date.now(),
    });
    let responsibleName: string | undefined;
    if (args.responsibleFor && args.responsibleFor !== args.updatedBy) {
      const r = await ctx.db.get(args.responsibleFor);
      responsibleName = r?.name;
    }
    await ctx.scheduler.runAfter(0, internal.email.sendChangeAlert, {
      patientId: med.patient_id,
      actorId: args.updatedBy,
      eventType: "refill",
      detail: med.name,
      responsibleName,
    });
  },
});
