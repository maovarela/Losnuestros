import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no esta definido en .env.local");
  return s;
}

export async function getSession(): Promise<{ caregiverId: string } | null> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE);
  if (!c) return null;
  const payload = await verifySession(c.value, getSecret());
  return payload ? { caregiverId: payload.caregiverId } : null;
}
