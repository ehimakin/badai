import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).nullable().optional(),
  memberTag: z.string().trim().min(2).max(32).nullable().optional(),
  forename: z.string().trim().max(80).nullable().optional(),
  surname: z.string().trim().max(80).nullable().optional(),
  email: z.string().email().optional(),
  mobile: z.string().trim().max(30).nullable().optional(),
  avatarDataUrl: z.string().max(1_500_000).nullable().optional(),
});

function normalizeMemberTag(raw: string | null | undefined) {
  if (!raw) return null;
  const base = raw.startsWith("@") ? raw.slice(1) : raw;
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(base)) return null;
  return `@${base.toLowerCase()}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  return NextResponse.json({
    profile: {
      id: user.id,
      fullName: user.fullName,
      displayName: user.displayName,
      memberTag: user.memberTag,
      forename: user.forename,
      surname: user.surname,
      email: user.email,
      mobile: user.mobile,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const normalizedTag = data.memberTag === undefined ? undefined : normalizeMemberTag(data.memberTag);
  if (data.memberTag !== undefined && data.memberTag !== null && !normalizedTag) {
    return NextResponse.json(
      { error: "Member tag must be 3-24 chars and only letters, numbers, underscore" },
      { status: 400 }
    );
  }

  if (data.avatarDataUrl !== undefined && data.avatarDataUrl !== null && !data.avatarDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Avatar must be an image file" }, { status: 400 });
  }

  const forename = data.forename !== undefined ? data.forename || null : user.forename;
  const surname = data.surname !== undefined ? data.surname || null : user.surname;
  const displayName = data.displayName !== undefined ? data.displayName || null : user.displayName;

  const computedFullName =
    [forename, surname].filter(Boolean).join(" ").trim() || displayName || user.fullName;

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        memberTag: normalizedTag,
        forename,
        surname,
        email: data.email,
        mobile: data.mobile !== undefined ? data.mobile || null : user.mobile,
        avatarUrl: data.avatarDataUrl !== undefined ? data.avatarDataUrl || null : user.avatarUrl,
        fullName: computedFullName,
      },
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        fullName: updated.fullName,
        displayName: updated.displayName,
        memberTag: updated.memberTag,
        forename: updated.forename,
        surname: updated.surname,
        email: updated.email,
        mobile: updated.mobile,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Database unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email or member tag already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}
