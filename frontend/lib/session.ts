import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/auth";

export const SESSION_COOKIE_NAME = "session";
export const TWO_FA_CHALLENGE_COOKIE_NAME = "two_fa_challenge";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = sha256(raw);

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;

    // Expired session → treat as logged out
    if (session.expiresAt <= new Date()) return null;

    return session.user;
  } catch (error) {
    if (isPrismaConnectionIssue(error)) {
      console.error(
        "Session lookup skipped because database connectivity is unavailable.",
        error
      );
      return null;
    }
    throw error;
  }
}

function isPrismaConnectionIssue(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2024"
  ) {
    return true;
  }
  return false;
}

type RoleUser = {
  role?: string | null;
} | null;

export function isAdmin(user: RoleUser) {
  return user?.role === "ADMIN";
}
