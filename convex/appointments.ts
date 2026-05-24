import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return await Promise.all(
      items.map(async (a) => {
        const caregiver = a.updated_by ? await ctx.db.get(a.updated_by) : null;
        return { ...a, updated_by_name: caregiver?.name ?? null };
      }),
    );
  },
});

const fieldsValidator = {
  date: v.string(),
  doctor: v.optional(v.string()),
  reason: v.optional(v.string()),
  location: v.optional(v.string()),
  next_appointment: v.optional(v.string()),
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
    return await ctx.db.insert("appointments", {
      patient_id: patientId,
      updated_by: updatedBy,
      updated_at: Date.now(),
      ...fields,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
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
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
