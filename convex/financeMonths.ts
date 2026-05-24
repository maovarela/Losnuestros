import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return items.sort((a, b) => b.month_key.localeCompare(a.month_key));
  },
});

export const getByMonth = query({
  args: { patientId: v.id("patients"), monthKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", args.patientId).eq("month_key", args.monthKey),
      )
      .first();
  },
});

const fieldsValidator = {
  month_key: v.string(),
  pension: v.number(),
  prima: v.optional(v.number()),
  compensar: v.number(),
  compensar_paid: v.boolean(),
  enel: v.number(),
  enel_paid: v.boolean(),
  gas: v.number(),
  gas_paid: v.boolean(),
  agua: v.number(),
  agua_paid: v.boolean(),
  internet: v.number(),
  internet_paid: v.boolean(),
  celular: v.number(),
  celular_paid: v.boolean(),
  alarma: v.number(),
  alarma_paid: v.boolean(),
  empleada: v.number(),
  caja: v.number(),
  mercado: v.number(),
  varios: v.number(),
  saldo_banco: v.optional(v.number()),
  nota: v.optional(v.string()),
};

export const upsert = mutation({
  args: {
    patientId: v.id("patients"),
    updatedBy: v.id("caregivers"),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, ...fields } = args;
    const existing = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", patientId).eq("month_key", fields.month_key),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        updated_by: updatedBy,
        updated_at: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("finance_months", {
      patient_id: patientId,
      updated_by: updatedBy,
      updated_at: Date.now(),
      ...fields,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("finance_months") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
