import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  patients: defineTable({
    name: v.string(),
    avatar_initials: v.string(),
  }),

  caregivers: defineTable({
    patient_id: v.id("patients"),
    name: v.string(),
  }).index("by_patient", ["patient_id"]),

  invitations: defineTable({
    caregiver_id: v.id("caregivers"),
    token: v.string(),
    expires_at: v.number(),
    consumed_at: v.optional(v.number()),
  }).index("by_token", ["token"]),
});
