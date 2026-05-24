import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("payment_references")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return items.sort((a, b) => a.sort_order - b.sort_order);
  },
});

const fieldsValidator = {
  service_name: v.string(),
  category: v.string(),
  frequency: v.optional(v.string()),
  due_day: v.optional(v.number()),
  amount_reference: v.optional(v.number()),
  amount_label: v.optional(v.string()),
  details: v.optional(
    v.array(v.object({ label: v.string(), value: v.string() })),
  ),
  notes: v.optional(v.string()),
  sort_order: v.number(),
};

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    updatedBy: v.id("caregivers"),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, ...fields } = args;
    return await ctx.db.insert("payment_references", {
      patient_id: patientId,
      updated_by: updatedBy,
      updated_at: Date.now(),
      ...fields,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("payment_references"),
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
  args: { id: v.id("payment_references") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
