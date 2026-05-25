import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

function fmtCOPServer(n: number | undefined): string {
  if (n === undefined || n === null) return "sin dato";
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const PAID_LABELS: Record<string, string> = {
  compensar_paid: "Compensar",
  enel_paid: "Enel",
  gas_paid: "Gas",
  agua_paid: "Agua",
  internet_paid: "Internet",
  celular_paid: "Celular",
  alarma_paid: "Alarma",
};

const AMOUNT_FIELDS = [
  "pension",
  "prima",
  "compensar",
  "enel",
  "gas",
  "agua",
  "internet",
  "celular",
  "alarma",
  "empleada",
  "caja",
  "mercado",
  "varios",
] as const;

async function resolveActorName(
  ctx: { db: { get: (id: Id<"caregivers">) => Promise<Doc<"caregivers"> | null> } },
  actorId: Id<"caregivers">,
): Promise<string> {
  const actor = await ctx.db.get(actorId);
  return actor?.name ?? "alguien";
}

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const enriched = await Promise.all(
      items.map(async (m) => {
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
    return enriched.sort((a, b) => b.month_key.localeCompare(a.month_key));
  },
});

export const getLatestSaldo = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const withSaldo = all
      .filter((m) => m.saldo_banco !== undefined)
      .sort((a, b) => b.month_key.localeCompare(a.month_key));
    const latest = withSaldo[0];
    if (!latest) return null;
    return {
      monthKey: latest.month_key,
      saldo: latest.saldo_banco,
      updatedAt: latest.updated_at,
    };
  },
});

export const getByMonth = query({
  args: { patientId: v.id("patients"), monthKey: v.string() },
  handler: async (ctx, args) => {
    const m = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", args.patientId).eq("month_key", args.monthKey),
      )
      .first();
    if (!m) return null;
    const updater = m.updated_by ? await ctx.db.get(m.updated_by) : null;
    const responsible = m.responsible_for
      ? await ctx.db.get(m.responsible_for)
      : null;
    return {
      ...m,
      updated_by_name: updater?.name ?? null,
      responsible_for_name: responsible?.name ?? null,
    };
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
    responsibleFor: v.optional(v.id("caregivers")),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, responsibleFor, ...fields } = args;
    const existing = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", patientId).eq("month_key", fields.month_key),
      )
      .first();

    const actorName = await resolveActorName(ctx, updatedBy);
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        updated_by: updatedBy,
        responsible_for: responsibleFor,
        updated_at: now,
      });
      const detail = describeUpsertDiff(existing, fields);
      if (detail) {
        await ctx.db.insert("finance_audit", {
          patient_id: patientId,
          month_key: fields.month_key,
          action: "updated",
          detail,
          actor_id: updatedBy,
          actor_name: actorName,
          at: now,
        });
      }
      return existing._id;
    }
    const newId = await ctx.db.insert("finance_months", {
      patient_id: patientId,
      updated_by: updatedBy,
      responsible_for: responsibleFor,
      updated_at: now,
      ...fields,
    });
    await ctx.db.insert("finance_audit", {
      patient_id: patientId,
      month_key: fields.month_key,
      action: "created",
      detail:
        fields.saldo_banco !== undefined
          ? `Mes creado con saldo ${fmtCOPServer(fields.saldo_banco)}`
          : "Mes creado",
      actor_id: updatedBy,
      actor_name: actorName,
      at: now,
    });
    return newId;
  },
});

function describeUpsertDiff(
  prev: Doc<"finance_months">,
  next: Record<string, unknown>,
): string | null {
  const parts: string[] = [];
  const newlyPaid: string[] = [];
  const desmarcados: string[] = [];
  for (const key of Object.keys(PAID_LABELS)) {
    const before = (prev as unknown as Record<string, unknown>)[key];
    const after = next[key];
    if (before === false && after === true) newlyPaid.push(PAID_LABELS[key]);
    if (before === true && after === false) desmarcados.push(PAID_LABELS[key]);
  }
  if (newlyPaid.length > 0) parts.push(`pagó ${newlyPaid.join(", ")}`);
  if (desmarcados.length > 0)
    parts.push(`desmarcó ${desmarcados.join(", ")}`);

  const prevSaldo = prev.saldo_banco;
  const nextSaldo = next.saldo_banco as number | undefined;
  if (prevSaldo !== nextSaldo) {
    if (nextSaldo === undefined) parts.push("borró saldo");
    else parts.push(`saldo ${fmtCOPServer(nextSaldo)}`);
  }

  let amountsChanged = 0;
  for (const f of AMOUNT_FIELDS) {
    const before = (prev as unknown as Record<string, unknown>)[f];
    const after = next[f];
    if ((before ?? 0) !== (after ?? 0)) amountsChanged += 1;
  }
  if (amountsChanged > 0)
    parts.push(`${amountsChanged} monto${amountsChanged === 1 ? "" : "s"}`);

  if ((prev.nota ?? "") !== ((next.nota as string | undefined) ?? ""))
    parts.push("nota");

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export const remove = mutation({
  args: {
    id: v.id("finance_months"),
    actorId: v.id("caregivers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    const actorName = await resolveActorName(ctx, args.actorId);
    const { _id: _omitId, _creationTime: _omitTime, ...snapshot } = existing;
    void _omitId;
    void _omitTime;
    await ctx.db.insert("finance_audit", {
      patient_id: existing.patient_id,
      month_key: existing.month_key,
      action: "deleted",
      detail: `Mes eliminado (saldo ${fmtCOPServer(existing.saldo_banco)})`,
      actor_id: args.actorId,
      actor_name: actorName,
      snapshot,
      at: Date.now(),
    });
    await ctx.db.delete(args.id);
  },
});

export const listAuditByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("finance_audit")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return rows.sort((a, b) => b.at - a.at);
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
    responsibleFor: v.optional(v.id("caregivers")),
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
    const responsible = args.responsibleFor ?? args.updatedBy;
    const existing = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", args.patientId).eq("month_key", args.monthKey),
      )
      .first();

    const now = Date.now();
    const actorName = await resolveActorName(ctx, args.updatedBy);
    let resultId: Id<"finance_months">;
    let alreadyPaid = false;
    if (existing) {
      const field = PAID_FIELD[args.service];
      alreadyPaid =
        (existing as unknown as Record<string, unknown>)[field] === true;
      await ctx.db.patch(existing._id, {
        [field]: true,
        updated_by: args.updatedBy,
        responsible_for: responsible,
        updated_at: now,
      });
      resultId = existing._id;
    } else {
      resultId = await ctx.db.insert("finance_months", {
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
        responsible_for: responsible,
        updated_at: now,
      });
    }

    const paidLabel = {
      compensar: "Compensar",
      enel: "Enel",
      gas: "Gas",
      agua: "Agua",
      internet: "Internet",
      celular: "Celular",
      alarma: "Alarma",
    }[args.service];
    if (!alreadyPaid) {
      await ctx.db.insert("finance_audit", {
        patient_id: args.patientId,
        month_key: args.monthKey,
        action: "paid",
        detail: `Marcó ${paidLabel} como pagado`,
        actor_id: args.updatedBy,
        actor_name: actorName,
        at: now,
      });
    }

    let responsibleName: string | undefined;
    if (args.responsibleFor && args.responsibleFor !== args.updatedBy) {
      const r = await ctx.db.get(args.responsibleFor);
      responsibleName = r?.name;
    }
    const serviceLabel = {
      compensar: "Compensar",
      enel: "Energía Enel",
      gas: "Gas Vanti",
      agua: "Acueducto EAAB",
      internet: "Claro internet",
      celular: "Claro celular",
      alarma: "Alarma",
    }[args.service];
    await ctx.scheduler.runAfter(0, internal.email.sendChangeAlert, {
      patientId: args.patientId,
      actorId: args.updatedBy,
      eventType: "payment",
      detail: serviceLabel,
      responsibleName,
    });
    return resultId;
  },
});
