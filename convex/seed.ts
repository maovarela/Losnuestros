import { mutation } from "./_generated/server";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const initial = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("patients").first();
    if (existing) {
      return { skipped: true as const, reason: "ya hay datos en la base" };
    }

    const patientId = await ctx.db.insert("patients", {
      name: "Ana María Ortega Salcedo",
      avatar_initials: "AO",
    });

    const mamaId = await ctx.db.insert("caregivers", {
      patient_id: patientId,
      name: "Ingrid Perez",
    });

    const tiaId = await ctx.db.insert("caregivers", {
      patient_id: patientId,
      name: "Sandra Perez",
    });

    const mamaToken = randomToken();
    await ctx.db.insert("invitations", {
      caregiver_id: mamaId,
      token: mamaToken,
      expires_at: Date.now() + TOKEN_TTL_MS,
    });

    const tiaToken = randomToken();
    await ctx.db.insert("invitations", {
      caregiver_id: tiaId,
      token: tiaToken,
      expires_at: Date.now() + TOKEN_TTL_MS,
    });

    return {
      skipped: false as const,
      patient: "Ana María Ortega Salcedo",
      invitations: [
        { caregiver: "Mamá", url: `/entrar/${mamaToken}` },
        { caregiver: "Tía", url: `/entrar/${tiaToken}` },
      ],
    };
  },
});
