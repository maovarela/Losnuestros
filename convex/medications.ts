import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const meds = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return await Promise.all(
      meds.map(async (m) => {
        const caregiver = m.updated_by ? await ctx.db.get(m.updated_by) : null;
        return { ...m, updated_by_name: caregiver?.name ?? null };
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
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, ...fields } = args;
    return await ctx.db.insert("medications", {
      patient_id: patientId,
      updated_by: updatedBy,
      updated_at: Date.now(),
      ...fields,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("medications"),
    updatedBy: v.id("caregivers"),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updated_by: updatedBy,
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
