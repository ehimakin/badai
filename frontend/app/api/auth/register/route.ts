import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  mobile: z.string().trim().max(30).nullable().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

function normalizeMemberTag(rawUsername: string) {
  return `@${rawUsername.toLowerCase()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { fullName, username, mobile, email, password } = parsed.data;
    const memberTag = normalizeMemberTag(username);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { memberTag }],
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Email or username already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        fullName,
        email,
        displayName: username,
        memberTag,
        mobile: mobile || null,
        passwordHash,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error during registration";
    console.error("REGISTER ERROR:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
