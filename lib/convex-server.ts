import "server-only";
import { ConvexHttpClient } from "convex/browser";

let client: ConvexHttpClient | null = null;

export function convex(): ConvexHttpClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL no esta definido (corre `npx convex dev` primero)");
  client = new ConvexHttpClient(url);
  return client;
}
