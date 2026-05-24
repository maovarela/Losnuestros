import { mutation } from "./_generated/server";
import { v } from "convex/values";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const create = mutation({
  args: { caregiverId: v.id("caregivers") },
  handler: async (ctx, args) => {
    const caregiver = await ctx.db.get(args.caregiverId);
    if (!caregiver) throw new Error("caregiver not found");

    const token = randomToken();
    await ctx.db.insert("invitations", {
      caregiver_id: args.caregiverId,
      token,
      expires_at: Date.now() + TOKEN_TTL_MS,
    });
    return { token, caregiverName: caregiver.name };
  },
});

export const consume = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!inv) return { ok: false as const, error: "invalid" as const };
    if (inv.expires_at < Date.now()) return { ok: false as const, error: "expired" as const };

    if (!inv.consumed_at) {
      await ctx.db.patch(inv._id, { consumed_at: Date.now() });
    }
    return { ok: true as const, caregiverId: inv.caregiver_id };
  },
});
