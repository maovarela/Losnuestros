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

  medications: defineTable({
    patient_id: v.id("patients"),
    name: v.string(),
    dosage: v.optional(v.string()),
    doctor: v.optional(v.string()),
    last_refill: v.optional(v.string()),
    next_refill: v.optional(v.string()),
    notes: v.optional(v.string()),
    updated_by: v.optional(v.id("caregivers")),
    updated_at: v.number(),
  }).index("by_patient", ["patient_id"]),

  appointments: defineTable({
    patient_id: v.id("patients"),
    date: v.string(),
    doctor: v.optional(v.string()),
    reason: v.optional(v.string()),
    location: v.optional(v.string()),
    next_appointment: v.optional(v.string()),
    notes: v.optional(v.string()),
    updated_by: v.optional(v.id("caregivers")),
    updated_at: v.number(),
  }).index("by_patient", ["patient_id"]),
});
