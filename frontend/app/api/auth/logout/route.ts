import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/auth";
import { SESSION_COOKIE_NAME, TWO_FA_CHALLENGE_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (raw) {
    try {
      const tokenHash = sha256(raw);
      await prisma.session.deleteMany({ where: { tokenHash } });
    } catch (e) {
      console.error("logout cleanup failed:", e);
    }
  }


  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  res.cookies.set(TWO_FA_CHALLENGE_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
}
