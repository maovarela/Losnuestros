import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("caregivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return all.filter((c) => c.role !== "patient");
  },
});

export const getPatientCaregiver = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return all.find((c) => c.role === "patient") ?? null;
  },
});

export const rename = mutation({
  args: { currentName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const c = await ctx.db
      .query("caregivers")
      .filter((q) => q.eq(q.field("name"), args.currentName))
      .first();
    if (!c) throw new Error(`caregiver "${args.currentName}" no existe`);
    await ctx.db.patch(c._id, { name: args.newName });
    return { id: c._id, name: args.newName };
  },
});

export const setEmail = mutation({
  args: { id: v.id("caregivers"), email: v.string() },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.id);
    if (!c) throw new Error("caregiver no existe");
    await ctx.db.patch(args.id, { email: args.email });
    return { id: args.id, name: c.name, email: args.email };
  },
});

export const setRole = mutation({
  args: { id: v.id("caregivers"), role: v.string() },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.id);
    if (!c) throw new Error("caregiver no existe");
    await ctx.db.patch(args.id, { role: args.role });
    return { id: args.id, name: c.name, role: args.role };
  },
});

export const createPatientView = mutation({
  args: {},
  handler: async (ctx) => {
    const patient = await ctx.db.query("patients").first();
    if (!patient) throw new Error("no hay patient");
    const existing = await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", patient._id))
      .filter((q) => q.eq(q.field("role"), "patient"))
      .first();
    if (existing) {
      return { id: existing._id, alreadyExisted: true as const };
    }
    const id = await ctx.db.insert("caregivers", {
      patient_id: patient._id,
      name: patient.name,
      role: "patient",
    });
    return { id, alreadyExisted: false as const };
  },
});
