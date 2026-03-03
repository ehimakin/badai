import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newToken, sha256 } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function createAuthenticatedResponse(userId: string, body: Record<string, unknown> = { ok: true }) {
  const rawSessionToken = newToken();
  const tokenHash = sha256(rawSessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const res = NextResponse.json(body);
  res.cookies.set(SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
