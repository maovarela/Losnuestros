import { query } from "./_generated/server";

export const getDefault = query({
  handler: async (ctx) => {
    return await ctx.db.query("patients").first();
  },
});
