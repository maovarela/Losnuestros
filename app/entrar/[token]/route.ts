import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-server";
import { ONE_YEAR_MS, SESSION_COOKIE, signSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const baseUrl = new URL(req.url).origin;

  const result = await convex().mutation(api.invitations.consume, { token });

  if (!result.ok) {
    return NextResponse.redirect(`${baseUrl}/?error=${result.error}`);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${baseUrl}/?error=server`);
  }

  const caregiver = await convex().query(api.caregivers.getById, {
    id: result.caregiverId as Id<"caregivers">,
  });
  const destination = caregiver?.role === "patient" ? "/abuela" : "/app";

  const exp = Date.now() + ONE_YEAR_MS;
  const value = await signSession({ caregiverId: result.caregiverId, exp }, secret);

  const response = NextResponse.redirect(`${baseUrl}${destination}`);
  response.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ONE_YEAR_MS / 1000),
  });
  return response;
}
