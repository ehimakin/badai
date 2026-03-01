import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

async function clearSessionAndCookie(req: Request) {
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

  const res = NextResponse.redirect(new URL("/members/login", req.url));
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
}

export async function GET(req: Request) {
  return clearSessionAndCookie(req);
}

export async function POST(req: Request) {
  return clearSessionAndCookie(req);
}
