import "server-only";
import { cookies } from "next/headers";
import { ONE_YEAR_MS, SESSION_COOKIE, signSession, verifySession } from "./session";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no esta definido en .env.local");
  return s;
}

export async function setSession(caregiverId: string): Promise<void> {
  const exp = Date.now() + ONE_YEAR_MS;
  const value = await signSession({ caregiverId, exp }, getSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ONE_YEAR_MS / 1000),
  });
}

export async function getSession(): Promise<{ caregiverId: string } | null> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE);
  if (!c) return null;
  const payload = await verifySession(c.value, getSecret());
  return payload ? { caregiverId: payload.caregiverId } : null;
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
