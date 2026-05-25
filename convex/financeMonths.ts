import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

function fmtCOPServer(n: number | undefined): string {
  if (n === undefined || n === null) return "sin dato";
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const PAID_LABELS: Record<string, string> = {
  compensar_paid_by: "Compensar",
  enel_paid_by: "Enel",
  gas_paid_by: "Gas",
  agua_paid_by: "Agua",
  internet_paid_by: "Internet",
  celular_paid_by: "Celular",
  alarma_paid_by: "Alarma",
};

const PAID_BY_FIELDS = [
  "compensar_paid_by",
  "enel_paid_by",
  "gas_paid_by",
  "agua_paid_by",
  "internet_paid_by",
  "celular_paid_by",
  "alarma_paid_by",
] as const;

const SERVICE_AMOUNT_FIELD: Record<
  (typeof PAID_BY_FIELDS)[number],
  string
> = {
  compensar_paid_by: "compensar",
  enel_paid_by: "enel",
  gas_paid_by: "gas",
  agua_paid_by: "agua",
  internet_paid_by: "internet",
  celular_paid_by: "celular",
  alarma_paid_by: "alarma",
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
  compensar_paid_by: v.optional(v.id("caregivers")),
  enel: v.number(),
  enel_paid_by: v.optional(v.id("caregivers")),
  gas: v.number(),
  gas_paid_by: v.optional(v.id("caregivers")),
  agua: v.number(),
  agua_paid_by: v.optional(v.id("caregivers")),
  internet: v.number(),
  internet_paid_by: v.optional(v.id("caregivers")),
  celular: v.number(),
  celular_paid_by: v.optional(v.id("caregivers")),
  alarma: v.number(),
  alarma_paid_by: v.optional(v.id("caregivers")),
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

    const actorName = await resolveActorName(ctx, updatedBy);
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        compensar_paid: undefined,
        enel_paid: undefined,
        gas_paid: undefined,
        agua_paid: undefined,
        internet_paid: undefined,
        celular_paid: undefined,
        alarma_paid: undefined,
        responsible_for: undefined,
        updated_by: updatedBy,
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
    const beforeSet = before !== undefined && before !== null;
    const afterSet = after !== undefined && after !== null;
    if (!beforeSet && afterSet) newlyPaid.push(PAID_LABELS[key]);
    if (beforeSet && !afterSet) desmarcados.push(PAID_LABELS[key]);
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

const PAID_BY_FIELD = {
  compensar: "compensar_paid_by",
  enel: "enel_paid_by",
  gas: "gas_paid_by",
  agua: "agua_paid_by",
  internet: "internet_paid_by",
  celular: "celular_paid_by",
  alarma: "alarma_paid_by",
} as const;

async function findPatientCaregiverId(
  ctx: { db: { query: (t: "caregivers") => any } },
  patientId: Id<"patients">,
): Promise<Id<"caregivers"> | null> {
  const all = await ctx.db
    .query("caregivers")
    .withIndex("by_patient", (q: any) => q.eq("patient_id", patientId))
    .collect();
  const found = (all as Doc<"caregivers">[]).find(
    (c) => c.role === "patient",
  );
  return found?._id ?? null;
}

export const markServicePaid = mutation({
  args: {
    patientId: v.id("patients"),
    updatedBy: v.id("caregivers"),
    paidBy: v.optional(v.id("caregivers")),
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
    const patientCaregiverId = await findPatientCaregiverId(
      ctx,
      args.patientId,
    );
    const payer = args.paidBy ?? patientCaregiverId ?? args.updatedBy;
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
      const field = PAID_BY_FIELD[args.service];
      const before = (existing as unknown as Record<string, unknown>)[field];
      alreadyPaid = before !== undefined && before !== null;
      await ctx.db.patch(existing._id, {
        [field]: payer,
        updated_by: args.updatedBy,
        updated_at: now,
      });
      resultId = existing._id;
    } else {
      resultId = await ctx.db.insert("finance_months", {
        patient_id: args.patientId,
        month_key: args.monthKey,
        pension: DEFAULTS.pension,
        compensar: DEFAULTS.compensar,
        compensar_paid_by: args.service === "compensar" ? payer : undefined,
        enel: DEFAULTS.enel,
        enel_paid_by: args.service === "enel" ? payer : undefined,
        gas: DEFAULTS.gas,
        gas_paid_by: args.service === "gas" ? payer : undefined,
        agua: DEFAULTS.agua,
        agua_paid_by: args.service === "agua" ? payer : undefined,
        internet: DEFAULTS.internet,
        internet_paid_by: args.service === "internet" ? payer : undefined,
        celular: DEFAULTS.celular,
        celular_paid_by: args.service === "celular" ? payer : undefined,
        alarma: DEFAULTS.alarma,
        alarma_paid_by: args.service === "alarma" ? payer : undefined,
        empleada: DEFAULTS.empleada,
        caja: DEFAULTS.caja,
        mercado: DEFAULTS.mercado,
        varios: DEFAULTS.varios,
        updated_by: args.updatedBy,
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
    if (
      args.paidBy &&
      args.paidBy !== args.updatedBy &&
      args.paidBy !== patientCaregiverId
    ) {
      const r = await ctx.db.get(args.paidBy);
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

export const backfillPaidBy = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patientCaregiverId = await findPatientCaregiverId(
      ctx,
      args.patientId,
    );
    if (!patientCaregiverId) {
      throw new Error("no hay caregiver con role='patient' para este patient");
    }
    const months = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    let migrated = 0;
    for (const m of months) {
      const payerForThisMonth = m.responsible_for ?? patientCaregiverId;
      const patch: Record<string, unknown> = {};
      const mapping: Array<[keyof Doc<"finance_months">, string]> = [
        ["compensar_paid", "compensar_paid_by"],
        ["enel_paid", "enel_paid_by"],
        ["gas_paid", "gas_paid_by"],
        ["agua_paid", "agua_paid_by"],
        ["internet_paid", "internet_paid_by"],
        ["celular_paid", "celular_paid_by"],
        ["alarma_paid", "alarma_paid_by"],
      ];
      let touched = false;
      for (const [oldField, newField] of mapping) {
        const oldVal = (m as unknown as Record<string, unknown>)[oldField];
        const newVal = (m as unknown as Record<string, unknown>)[newField];
        if (oldVal === true && newVal === undefined) {
          patch[newField] = payerForThisMonth;
          touched = true;
        }
        if (oldVal !== undefined) {
          patch[oldField] = undefined;
          touched = true;
        }
      }
      if (m.responsible_for !== undefined) {
        patch.responsible_for = undefined;
        touched = true;
      }
      if (touched) {
        await ctx.db.patch(m._id, patch);
        migrated += 1;
      }
    }
    return { migrated, total: months.length };
  },
});

export const listSettlements = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("settlements")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return rows.sort((a, b) => b.at - a.at);
  },
});

export const getBalances = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patientCaregiverId = await findPatientCaregiverId(
      ctx,
      args.patientId,
    );
    const months = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();

    const owedByCaregiver = new Map<Id<"caregivers">, number>();
    for (const m of months) {
      for (const paidByField of PAID_BY_FIELDS) {
        const payer = (m as unknown as Record<string, unknown>)[paidByField] as
          | Id<"caregivers">
          | undefined;
        if (!payer) continue;
        if (payer === patientCaregiverId) continue;
        const amountField = SERVICE_AMOUNT_FIELD[paidByField];
        const amount =
          ((m as unknown as Record<string, unknown>)[amountField] as number) ??
          0;
        owedByCaregiver.set(payer, (owedByCaregiver.get(payer) ?? 0) + amount);
      }
    }
    for (const s of settlements) {
      owedByCaregiver.set(
        s.to_id,
        (owedByCaregiver.get(s.to_id) ?? 0) - s.amount,
      );
    }

    const caregivers = await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const nonPatient = caregivers.filter((c) => c.role !== "patient");

    return nonPatient
      .map((c) => ({
        caregiverId: c._id,
        name: c.name,
        amount: Math.max(0, Math.round(owedByCaregiver.get(c._id) ?? 0)),
      }))
      .sort((a, b) => b.amount - a.amount);
  },
});

export const settle = mutation({
  args: {
    patientId: v.id("patients"),
    toId: v.id("caregivers"),
    amount: v.number(),
    monthKey: v.string(),
    actorId: v.id("caregivers"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("monto debe ser positivo");
    const to = await ctx.db.get(args.toId);
    if (!to) throw new Error("caregiver no existe");
    const actorName = await resolveActorName(ctx, args.actorId);
    const now = Date.now();
    const id = await ctx.db.insert("settlements", {
      patient_id: args.patientId,
      to_id: args.toId,
      to_name: to.name,
      amount: args.amount,
      month_key: args.monthKey,
      at: now,
      updated_by: args.actorId,
      updated_by_name: actorName,
      note: args.note,
    });
    await ctx.db.insert("finance_audit", {
      patient_id: args.patientId,
      month_key: args.monthKey,
      action: "settled",
      detail: `Devolvió ${fmtCOPServer(args.amount)} a ${to.name}`,
      actor_id: args.actorId,
      actor_name: actorName,
      at: now,
    });
    return id;
  },
});
