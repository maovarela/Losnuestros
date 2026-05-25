import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalQuery,
} from "./_generated/server";

const FROM_ADDRESS = "LosNuestros <onboarding@resend.dev>";
const APP_URL = "https://losnuestros.vercel.app";
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no esta configurado en las env vars de Convex",
    );
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend respondio ${res.status}: ${text}`);
  }
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid rgba(0,0,0,0.08);">
    <div style="font-size:18px;font-weight:500;margin-bottom:8px;">${title}</div>
    ${body}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.1);font-size:12px;color:#6b6b6b;">
      <a href="${APP_URL}" style="color:#185fa5;text-decoration:none;">Abrir la app</a>
    </div>
  </div>
</body>
</html>`;
}

function fmtDateISO(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntilISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

export const internalGetEmailRecipients = internalQuery({
  args: { patientId: v.id("patients"), excludeId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("caregivers")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    return all
      .filter((c) => c._id !== args.excludeId && c.email)
      .map((c) => ({ id: c._id, name: c.name, email: c.email as string }));
  },
});

export const internalGetCaregiver = internalQuery({
  args: { id: v.id("caregivers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const sendChangeAlert = internalAction({
  args: {
    patientId: v.id("patients"),
    actorId: v.id("caregivers"),
    eventType: v.union(
      v.literal("refill"),
      v.literal("payment"),
      v.literal("appointment_created"),
      v.literal("medication_created"),
    ),
    detail: v.string(),
    responsibleName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.email.internalGetCaregiver, {
      id: args.actorId,
    });
    if (!actor) return;
    const recipients = await ctx.runQuery(
      internal.email.internalGetEmailRecipients,
      { patientId: args.patientId, excludeId: args.actorId },
    );
    if (recipients.length === 0) return;

    let titulo = "";
    let cuerpo = "";
    const actorName = actor.name;
    const onBehalf =
      args.responsibleName && args.responsibleName !== actorName
        ? ` (lo hizo ${args.responsibleName})`
        : "";

    if (args.eventType === "refill") {
      titulo = `${actorName} marco un refill${onBehalf}`;
      cuerpo = `<p style="margin:0 0 8px;color:#1a1a1a;">${actorName} registro que se hizo el refill de <strong>${args.detail}</strong>${onBehalf}.</p>`;
    } else if (args.eventType === "payment") {
      titulo = `${actorName} marco un pago${onBehalf}`;
      cuerpo = `<p style="margin:0 0 8px;color:#1a1a1a;">${actorName} registro el pago de <strong>${args.detail}</strong> este mes${onBehalf}.</p>`;
    } else if (args.eventType === "appointment_created") {
      titulo = `${actorName} agrego una cita`;
      cuerpo = `<p style="margin:0 0 8px;color:#1a1a1a;">${actorName} agrego una cita: <strong>${args.detail}</strong>.</p>`;
    } else if (args.eventType === "medication_created") {
      titulo = `${actorName} agrego un medicamento`;
      cuerpo = `<p style="margin:0 0 8px;color:#1a1a1a;">${actorName} agrego <strong>${args.detail}</strong> a la lista de medicamentos.</p>`;
    }

    const html = shell(titulo, cuerpo);
    for (const r of recipients) {
      try {
        await sendResendEmail({
          to: r.email,
          subject: `LosNuestros: ${titulo}`,
          html,
        });
      } catch (e) {
        console.error("Resend fallo para", r.email, e);
      }
    }
  },
});

type DigestData = {
  upcoming: Array<{ kind: "refill" | "appointment" | "payment"; line: string }>;
  recent: Array<{ caregiver: string; verb: string; subject: string }>;
};

export const internalCollectDigestForPatient = internalQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args): Promise<DigestData> => {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const since = Date.now() - WEEK_MS;

    const meds = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const citas = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const refs = await ctx.db
      .query("payment_references")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const finance = await ctx.db
      .query("finance_months")
      .withIndex("by_patient_month", (q) =>
        q.eq("patient_id", args.patientId).eq("month_key", monthKey),
      )
      .first();

    const upcoming: DigestData["upcoming"] = [];

    for (const m of meds) {
      if (!m.next_refill) continue;
      const d = daysUntilISO(m.next_refill);
      if (d < 0) {
        upcoming.push({
          kind: "refill",
          line: `Refill vencido: ${m.name} (debio hacerse el ${fmtDateISO(m.next_refill)})`,
        });
      } else if (d <= 7) {
        const cuando = d === 0 ? "hoy" : d === 1 ? "manana" : `en ${d} dias`;
        upcoming.push({
          kind: "refill",
          line: `Refill ${cuando}: ${m.name} (${fmtDateISO(m.next_refill)})`,
        });
      }
    }
    for (const c of citas) {
      const d = daysUntilISO(c.date);
      if (d < 0 || d > 7) continue;
      const cuando = d === 0 ? "Hoy" : d === 1 ? "Manana" : `En ${d} dias`;
      upcoming.push({
        kind: "appointment",
        line: `${cuando}: ${c.doctor ?? "cita medica"} (${fmtDateISO(c.date)})${c.location ? " · " + c.location : ""}`,
      });
    }
    const today = now.getDate();
    const paidMap: Record<string, boolean> = finance
      ? {
          compensar: finance.compensar_paid,
          enel: finance.enel_paid,
          gas: finance.gas_paid,
          agua: finance.agua_paid,
          internet: finance.internet_paid,
          celular: finance.celular_paid,
          alarma: finance.alarma_paid,
        }
      : {};
    function mapServiceKey(name: string): string | null {
      const n = name.toLowerCase();
      if (n.includes("compensar")) return "compensar";
      if (n.includes("enel") || n.includes("codensa")) return "enel";
      if (n.includes("vanti") || n.includes("gas")) return "gas";
      if (n.includes("eaab") || n.includes("acueducto") || n.includes("agua"))
        return "agua";
      if (n.includes("internet")) return "internet";
      if (n.includes("celular")) return "celular";
      if (n.includes("alarma")) return "alarma";
      return null;
    }
    for (const r of refs) {
      if (r.category !== "service" || !r.due_day || r.frequency !== "monthly")
        continue;
      const key = mapServiceKey(r.service_name);
      if (!key || paidMap[key]) continue;
      const diff = r.due_day - today;
      if (diff < 0) {
        upcoming.push({
          kind: "payment",
          line: `${r.service_name}: vencido (debio pagarse antes del ${r.due_day})`,
        });
      } else if (diff <= 7) {
        upcoming.push({
          kind: "payment",
          line: `${r.service_name}: vence en ${diff} dia${diff === 1 ? "" : "s"} (antes del ${r.due_day})`,
        });
      }
    }

    const recent: DigestData["recent"] = [];
    for (const m of meds) {
      if (m.updated_at < since || !m.updated_by) continue;
      const c = await ctx.db.get(m.updated_by);
      if (!c) continue;
      recent.push({ caregiver: c.name, verb: "actualizo", subject: m.name });
    }
    for (const c of citas) {
      if (c.updated_at < since || !c.updated_by) continue;
      const cg = await ctx.db.get(c.updated_by);
      if (!cg) continue;
      recent.push({
        caregiver: cg.name,
        verb: "actualizo",
        subject: `cita ${c.doctor ?? fmtDateISO(c.date)}`,
      });
    }
    const months = await ctx.db
      .query("finance_months")
      .withIndex("by_patient", (q) => q.eq("patient_id", args.patientId))
      .collect();
    for (const f of months) {
      if (f.updated_at < since || !f.updated_by) continue;
      const c = await ctx.db.get(f.updated_by);
      if (!c) continue;
      recent.push({
        caregiver: c.name,
        verb: "registro",
        subject: monthLabel(f.month_key),
      });
    }

    return { upcoming, recent };
  },
});

export const internalListAllCaregiversWithEmail = internalQuery({
  handler: async (ctx) => {
    const all = await ctx.db.query("caregivers").collect();
    return all
      .filter((c) => c.email && c.role !== "patient")
      .map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email as string,
        patientId: c.patient_id,
      }));
  },
});

export const sendDigestNow = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.email.sendWeeklyDigest, {});
    return { sent: true };
  },
});

export const sendWeeklyDigest = internalAction({
  handler: async (ctx) => {
    const caregivers = await ctx.runQuery(
      internal.email.internalListAllCaregiversWithEmail,
    );
    if (caregivers.length === 0) return;

    for (const c of caregivers) {
      const data = await ctx.runQuery(
        internal.email.internalCollectDigestForPatient,
        { patientId: c.patientId },
      );
      const upcomingHtml = data.upcoming.length
        ? `<ul style="margin:8px 0 16px;padding-left:18px;color:#1a1a1a;">${data.upcoming.map((u) => `<li style="margin:4px 0;">${u.line}</li>`).join("")}</ul>`
        : `<p style="margin:8px 0 16px;color:#6b6b6b;">Nada por venir esta semana.</p>`;
      const recentHtml = data.recent.length
        ? `<ul style="margin:8px 0 16px;padding-left:18px;color:#1a1a1a;">${data.recent.map((r) => `<li style="margin:4px 0;"><strong>${r.caregiver}</strong> ${r.verb} <strong>${r.subject}</strong></li>`).join("")}</ul>`
        : `<p style="margin:8px 0 16px;color:#6b6b6b;">Sin cambios registrados esta semana.</p>`;
      const cuerpo = `
        <p style="margin:0 0 4px;color:#1a1a1a;">Hola ${c.name},</p>
        <p style="margin:0 0 16px;color:#1a1a1a;">Este es el resumen semanal del cuidado.</p>
        <div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.07em;color:#9a9a9a;margin-top:8px;">Lo que viene esta semana</div>
        ${upcomingHtml}
        <div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.07em;color:#9a9a9a;">Lo que paso esta semana</div>
        ${recentHtml}
      `;
      const html = shell("Resumen semanal LosNuestros", cuerpo);
      try {
        await sendResendEmail({
          to: c.email,
          subject: "LosNuestros: resumen semanal",
          html,
        });
      } catch (e) {
        console.error("Digest fallo para", c.email, e);
      }
    }
  },
});
