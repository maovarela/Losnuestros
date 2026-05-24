import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return await Promise.all(
      items.map(async (a) => {
        const updater = a.updated_by ? await ctx.db.get(a.updated_by) : null;
        const responsible = a.responsible_for
          ? await ctx.db.get(a.responsible_for)
          : null;
        return {
          ...a,
          updated_by_name: updater?.name ?? null,
          responsible_for_name: responsible?.name ?? null,
        };
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
    responsibleFor: v.optional(v.id("caregivers")),
    ...fieldsValidator,
  },
  handler: async (ctx, args) => {
    const { patientId, updatedBy, responsibleFor, ...fields } = args;
    const id = await ctx.db.insert("appointments", {
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
    const summary =
      (fields.doctor ?? "cita") + " (" + fields.date + ")";
    await ctx.scheduler.runAfter(0, internal.email.sendChangeAlert, {
      patientId,
      actorId: updatedBy,
      eventType: "appointment_created",
      detail: summary,
      responsibleName,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
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
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
