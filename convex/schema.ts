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
    email: v.optional(v.string()),
    role: v.optional(v.string()),
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
    responsible_for: v.optional(v.id("caregivers")),
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
    responsible_for: v.optional(v.id("caregivers")),
    updated_at: v.number(),
  }).index("by_patient", ["patient_id"]),

  payment_references: defineTable({
    patient_id: v.id("patients"),
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
    updated_by: v.optional(v.id("caregivers")),
    updated_at: v.number(),
  }).index("by_patient", ["patient_id"]),

  finance_months: defineTable({
    patient_id: v.id("patients"),
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
    updated_by: v.optional(v.id("caregivers")),
    responsible_for: v.optional(v.id("caregivers")),
    updated_at: v.number(),
  })
    .index("by_patient_month", ["patient_id", "month_key"])
    .index("by_patient", ["patient_id"]),
});
