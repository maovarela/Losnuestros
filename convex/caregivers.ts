import { query } from "./_generated/server";
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
    return await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
  },
});
