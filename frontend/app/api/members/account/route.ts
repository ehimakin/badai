import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/session";

const updateUsernameSchema = z.object({
  action: z.literal("update_username"),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only include letters, numbers, and underscore"),
  currentPassword: z.string().min(1),
});

const updatePasswordSchema = z
  .object({
    action: z.literal("update_password"),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password confirmation does not match",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different",
  });

const cancelMembershipSchema = z.object({
  action: z.literal("cancel_membership"),
  currentPassword: z.string().min(1),
  confirmation: z.literal("CANCEL"),
});

const deleteAccountSchema = z.object({
  action: z.literal("delete_account"),
  currentPassword: z.string().min(1),
  confirmation: z.literal("DELETE"),
});

const schema = z.discriminatedUnion("action", [
  updateUsernameSchema,
  updatePasswordSchema,
  cancelMembershipSchema,
  deleteAccountSchema,
]);

function normalizeMemberTag(username: string) {
  return `@${username.toLowerCase()}`;
}

function withLogoutCookie(body: Record<string, unknown>, status = 200) {
  const res = NextResponse.json(body, { status });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const passwordOk = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  if (data.action === "update_username") {
    const memberTag = normalizeMemberTag(data.username);
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          memberTag,
          displayName: data.username,
        },
        select: {
          memberTag: true,
        },
      });
      return NextResponse.json({ ok: true, memberTag: updated.memberTag });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json({ error: "Username already in use" }, { status: 409 });
      }
      return NextResponse.json({ error: "Unable to update username" }, { status: 500 });
    }
  }

  if (data.action === "update_password") {
    const passwordHash = await hashPassword(data.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return withLogoutCookie({
      ok: true,
      message: "Password changed. Please sign in again.",
      loggedOut: true,
    });
  }

  if (data.action === "cancel_membership") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { status: "CANCELLED" },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return withLogoutCookie({
      ok: true,
      message: "Membership cancelled.",
      loggedOut: true,
    });
  }

  await prisma.user.delete({ where: { id: user.id } });

  return withLogoutCookie({
    ok: true,
    message: "Account deleted.",
    loggedOut: true,
  });
}
