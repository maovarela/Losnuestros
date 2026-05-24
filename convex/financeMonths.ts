import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const enriched = await Promise.all(
      items.map(async (m) => {
        const c = m.updated_by ? await ctx.db.get(m.updated_by) : null;
        return { ...m, updated_by_name: c?.name ?? null };
      }),
    );
    return enriched.sort((a, b) => b.month_key.localeCompare(a.month_key));
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

const DEFAULTS = {
  pension: 4299866,
  compensar: 617200,
  enel: 252470,
  gas: 61110,
  agua: 0,
  internet: 102000,
  celular: 55000,
  alarma: 0,
  empleada: 1080000,
  caja: 1200000,
  mercado: 400000,
  varios: 0,
};

const PAID_FIELD = {
  compensar: "compensar_paid",
  enel: "enel_paid",
  gas: "gas_paid",
  agua: "agua_paid",
  internet: "internet_paid",
  celular: "celular_paid",
  alarma: "alarma_paid",
} as const;

export const markServicePaid = mutation({
  args: {
    patientId: v.id("patients"),
    updatedBy: v.id("caregivers"),
    monthKey: v.string(),
    service: v.union(
      v.literal("compensar"),
      v.literal("enel"),
      v.literal("gas"),
      v.literal("agua"),
      v.literal("internet"),
      v.literal("celular"),
      v.literal("alarma"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", args.patientId).eq("month_key", args.monthKey),
      )
      .first();

    if (existing) {
      const field = PAID_FIELD[args.service];
      await ctx.db.patch(existing._id, {
        [field]: true,
        updated_by: args.updatedBy,
        updated_at: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("finance_months", {
      patient_id: args.patientId,
      month_key: args.monthKey,
      pension: DEFAULTS.pension,
      compensar: DEFAULTS.compensar,
      compensar_paid: args.service === "compensar",
      enel: DEFAULTS.enel,
      enel_paid: args.service === "enel",
      gas: DEFAULTS.gas,
      gas_paid: args.service === "gas",
      agua: DEFAULTS.agua,
      agua_paid: args.service === "agua",
      internet: DEFAULTS.internet,
      internet_paid: args.service === "internet",
      celular: DEFAULTS.celular,
      celular_paid: args.service === "celular",
      alarma: DEFAULTS.alarma,
      alarma_paid: args.service === "alarma",
      empleada: DEFAULTS.empleada,
      caja: DEFAULTS.caja,
      mercado: DEFAULTS.mercado,
      varios: DEFAULTS.varios,
      updated_by: args.updatedBy,
      updated_at: Date.now(),
    });
  },
});
