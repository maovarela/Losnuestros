import { mutation } from "./_generated/server";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const CITAS_INICIALES = [
  {
    date: "2026-06-05",
    doctor: "Neurología · Dra. María Isabel Medina De Bedoya",
    reason: "Control neurológico",
    location: "Piso 11 · Consultorio 22 · Edificio El Bosque · 11:00 AM",
  },
];

const MEDS_INICIALES = [
  {
    name: "Rivastigmina 9.5mg/24h parche transdérmico",
    dosage: "1 parche cada 24 horas · vía transdérmica",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Ácido acetilsalicílico (ASA) 100mg tableta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Atorvastatina 40mg tableta recubierta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Losartán potásico 50mg tableta recubierta",
    dosage: "1 tableta cada 12 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Levotiroxina sódica 50mcg tableta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "Indicación: eutirox",
  },
  {
    name: "Hidroxicloroquina 200mg tableta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Prednisolona 5mg tableta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Acetaminofén 500mg tableta",
    dosage: "1 tableta cada 12 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
  {
    name: "Carbonato de calcio 1500mg / Vitamina D3 200UI tableta",
    dosage: "1 tableta cada 24 horas · vía oral",
    doctor: "Dr. Bastidas Mejía Carlin José · Medicina Familiar · Compensar",
    last_refill: "2026-05-16",
    next_refill: "2026-05-31",
    notes: "",
  },
];

export const initial = mutation({
  handler: async (ctx) => {
    let patient = await ctx.db.query("patients").first();
    if (!patient) {
      const id = await ctx.db.insert("patients", {
        name: "Ana María Ortega Salcedo",
        avatar_initials: "AO",
      });
      patient = await ctx.db.get(id);
    }
    if (!patient) throw new Error("no se pudo crear/leer patient");

    const existingCaregivers = await ctx.db.query("caregivers").collect();
    const newInvitations: { caregiver: string; url: string }[] = [];

    if (existingCaregivers.length === 0) {
      const caregiversToCreate = [
        { name: "Ingrid Perez" },
        { name: "Sandra Perez" },
      ];
      for (const c of caregiversToCreate) {
        const id = await ctx.db.insert("caregivers", {
          patient_id: patient._id,
          name: c.name,
        });
        const token = randomToken();
        await ctx.db.insert("invitations", {
          caregiver_id: id,
          token,
          expires_at: Date.now() + TOKEN_TTL_MS,
        });
        newInvitations.push({ caregiver: c.name, url: `/entrar/${token}` });
      }
    }

    const existingMed = await ctx.db.query("medications").first();
    let medsAdded = 0;
    if (!existingMed) {
      for (const m of MEDS_INICIALES) {
        await ctx.db.insert("medications", {
          patient_id: patient._id,
          name: m.name,
          dosage: m.dosage,
          doctor: m.doctor,
          last_refill: m.last_refill,
          next_refill: m.next_refill,
          notes: m.notes || undefined,
          updated_at: Date.now(),
        });
        medsAdded++;
      }
    }

    const existingAppt = await ctx.db.query("appointments").first();
    let appointmentsAdded = 0;
    if (!existingAppt) {
      for (const a of CITAS_INICIALES) {
        await ctx.db.insert("appointments", {
          patient_id: patient._id,
          date: a.date,
          doctor: a.doctor,
          reason: a.reason,
          location: a.location,
          updated_at: Date.now(),
        });
        appointmentsAdded++;
      }
    }

    return {
      patient: patient.name,
      newInvitations,
      medicationsAdded: medsAdded,
      appointmentsAdded,
    };
  },
});
