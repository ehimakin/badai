import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/auth";

export const SESSION_COOKIE_NAME = "session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = sha256(raw);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  // Expired session → treat as logged out
  if (session.expiresAt <= new Date()) return null;

  return session.user;
}

type RoleUser = {
  role?: string | null;
} | null;

export function isAdmin(user: RoleUser) {
  return user?.role === "ADMIN";
}
