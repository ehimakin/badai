import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { newToken, sha256, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const schema = z.object({
  email: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  password: z.string().min(1),
}).refine((data) => Boolean(data.identifier || data.email), {
  message: "Email or username is required",
  path: ["identifier"],
});

function normalizeMemberTag(raw: string) {
  const value = raw.startsWith("@") ? raw : `@${raw}`;
  return value.toLowerCase();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const identifier = (parsed.data.identifier ?? parsed.data.email ?? "").trim();
  const password = parsed.data.password;
  const byEmail = identifier.includes("@") && !identifier.startsWith("@");
  const memberTag = byEmail ? null : normalizeMemberTag(identifier);

  const user = await prisma.user.findFirst({
    where: byEmail
      ? { email: identifier }
      : { OR: [{ memberTag }, { displayName: identifier }] },
  });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // For now: allow login if ACTIVE (skip email verify until you wire email)
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Membership not active yet" }, { status: 403 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const rawSessionToken = newToken();
  const tokenHash = sha256(rawSessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return res;
}
