import { mutation } from "./_generated/server";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const REFERENCIAS_INICIALES = [
  {
    service_name: "Energía Enel / Codensa",
    category: "service",
    frequency: "monthly",
    due_day: 21,
    amount_reference: 252470,
    details: [
      { label: "N° de cliente", value: "0501354-1" },
      { label: "N° medidor", value: "25676886" },
    ],
    notes:
      "Incluye energía + aseo Bogotá Limpia + cuota Codensa. El valor varía mensualmente.",
    sort_order: 1,
  },
  {
    service_name: "Acueducto + alcantarillado + aseo · EAAB",
    category: "service",
    frequency: "bimonthly",
    due_day: 20,
    amount_reference: 318650,
    details: [
      { label: "N° para pagos", value: "19890424815" },
      { label: "Cuenta contrato", value: "10235641" },
    ],
    notes: "Factura cada 2 meses.",
    sort_order: 2,
  },
  {
    service_name: "Gas · Vanti",
    category: "service",
    frequency: "monthly",
    due_day: 18,
    amount_reference: 61110,
    details: [{ label: "Código sector", value: "60971121" }],
    notes: "Verificar el N° de referencia en cada factura nueva.",
    sort_order: 3,
  },
  {
    service_name: "Salud · Compensar",
    category: "service",
    frequency: "monthly",
    due_day: 30,
    amount_reference: 617200,
    details: [
      { label: "Referencia de pago", value: "0416050024245972" },
      { label: "NIT", value: "860066942-7" },
      { label: "Dirección", value: "Av. 68 No. 49A-47 · Tel. 428 06 66" },
    ],
    sort_order: 4,
  },
  {
    service_name: "Claro internet",
    category: "service",
    frequency: "monthly",
    due_day: 30,
    amount_reference: 102000,
    sort_order: 5,
  },
  {
    service_name: "Claro celular",
    category: "service",
    frequency: "monthly",
    due_day: 30,
    amount_reference: 55000,
    sort_order: 6,
  },
  {
    service_name: "Alarma",
    category: "service",
    frequency: "monthly",
    sort_order: 7,
  },
  {
    service_name: "Caja menor semanal",
    category: "household",
    frequency: "weekly",
    amount_reference: 300000,
    amount_label: "$300.000 / semana · ≈ $1.200.000 / mes",
    sort_order: 10,
  },
  {
    service_name: "Empleada doméstica",
    category: "household",
    frequency: "per_visit",
    amount_reference: 90000,
    amount_label: "$90.000 × 12 visitas = $1.080.000 / mes",
    details: [{ label: "Días que va", value: "Lunes · Miércoles · Sábado" }],
    sort_order: 11,
  },
  {
    service_name: "Mercado mensual",
    category: "household",
    frequency: "monthly",
    amount_reference: 400000,
    sort_order: 12,
  },
];

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

    const existingRef = await ctx.db.query("payment_references").first();
    let referencesAdded = 0;
    if (!existingRef) {
      for (const r of REFERENCIAS_INICIALES) {
        await ctx.db.insert("payment_references", {
          patient_id: patient._id,
          updated_at: Date.now(),
          ...r,
        });
        referencesAdded++;
      }
    }

    return {
      patient: patient.name,
      newInvitations,
      medicationsAdded: medsAdded,
      appointmentsAdded,
      referencesAdded,
    };
  },
});

export const addCitasMay2026 = mutation({
  handler: async (ctx) => {
    const patient = await ctx.db.query("patients").first();
    if (!patient) throw new Error("no patient");

    const ingrid = await ctx.db
      .query("caregivers")
      .filter((q) => q.eq(q.field("name"), "Ingrid Perez"))
      .first();

    const citas = [
      {
        date: "2026-05-26",
        doctor: "Sicología",
        location: "Sede 98 con 11 · 11:40 AM",
      },
      {
        date: "2026-05-26",
        doctor: "Nutrición",
        location: "Sede 98 con 11 · 12:40 PM",
      },
      {
        date: "2026-05-28",
        doctor: "Reumatología",
        location: "Sede 98 con 11 · 11:00 AM",
      },
    ];

    let added = 0;
    for (const c of citas) {
      await ctx.db.insert("appointments", {
        patient_id: patient._id,
        date: c.date,
        doctor: c.doctor,
        location: c.location,
        updated_by: ingrid?._id,
        updated_at: Date.now(),
      });
      added++;
    }

    return { added };
  },
});
