import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import {
  createOtpAuthUrl,
  createTwoFASecret,
  decryptTwoFASecret,
  encryptTwoFASecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/twofa";

const beginSetupSchema = z.object({
  action: z.literal("begin_setup"),
  currentPassword: z.string().min(1),
});

const confirmSetupSchema = z.object({
  action: z.literal("confirm_setup"),
  code: z.string().trim().min(6).max(8),
});

const disableSchema = z.object({
  action: z.literal("disable"),
  currentPassword: z.string().min(1),
  code: z.string().trim().min(6).max(32),
});

const regenerateSchema = z.object({
  action: z.literal("regenerate_recovery_codes"),
  currentPassword: z.string().min(1),
  code: z.string().trim().min(6).max(32),
});

const schema = z.discriminatedUnion("action", [
  beginSetupSchema,
  confirmSetupSchema,
  disableSchema,
  regenerateSchema,
]);

async function verifyTotpForUser(user: { twoFASecret: string | null }, code: string) {
  if (!user.twoFASecret) return false;
  const secret = decryptTwoFASecret(user.twoFASecret);
  return verifyTotpCode(secret, code);
}

async function verifyCodeOrRecovery(userId: string, user: { twoFASecret: string | null }, code: string) {
  const totpValid = await verifyTotpForUser(user, code);
  if (totpValid) return true;

  const recoveryHash = hashRecoveryCode(code);
  const consumed = await prisma.twoFARecoveryCode.updateMany({
    where: {
      userId,
      codeHash: recoveryHash,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
  return consumed.count > 0;
}

async function replaceRecoveryCodes(userId: string) {
  const codes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.twoFARecoveryCode.deleteMany({ where: { userId } }),
    prisma.twoFARecoveryCode.createMany({
      data: codes.map((code) => ({
        userId,
        codeHash: hashRecoveryCode(code),
      })),
    }),
  ]);
  return codes;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const remaining = await prisma.twoFARecoveryCode.count({
    where: { userId: user.id, usedAt: null },
  });

  return NextResponse.json({
    twoFAEnabled: user.twoFAEnabled,
    recoveryCodesRemaining: remaining,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "begin_setup") {
    const ok = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    if (user.twoFAEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }

    const secret = createTwoFASecret();
    const encrypted = encryptTwoFASecret(secret);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

    await prisma.twoFASetupRequest.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        secretEncrypted: encrypted,
        expiresAt,
      },
      update: {
        secretEncrypted: encrypted,
        expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      secret,
      otpAuthUrl: createOtpAuthUrl(secret, user.email),
      expiresAt: expiresAt.toISOString(),
    });
  }

  if (data.action === "confirm_setup") {
    const setup = await prisma.twoFASetupRequest.findUnique({
      where: { userId: user.id },
    });
    if (!setup || setup.expiresAt <= new Date()) {
      return NextResponse.json({ error: "2FA setup session expired. Start setup again." }, { status: 400 });
    }

    const secret = decryptTwoFASecret(setup.secretEncrypted);
    const valid = verifyTotpCode(secret, data.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
    }

    const encryptedSecret = encryptTwoFASecret(secret);
    const recoveryCodes = generateRecoveryCodes();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFAEnabled: true,
          twoFASecret: encryptedSecret,
        },
      }),
      prisma.twoFASetupRequest.deleteMany({ where: { userId: user.id } }),
      prisma.twoFARecoveryCode.deleteMany({ where: { userId: user.id } }),
      prisma.twoFARecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          userId: user.id,
          codeHash: hashRecoveryCode(code),
        })),
      }),
    ]);

    return NextResponse.json({ ok: true, recoveryCodes, twoFAEnabled: true });
  }

  const passwordOk = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!passwordOk) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  if (!user.twoFAEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const codeValid = await verifyCodeOrRecovery(user.id, user, data.code);
  if (!codeValid) {
    return NextResponse.json({ error: "Invalid authenticator or recovery code" }, { status: 401 });
  }

  if (data.action === "disable") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          twoFAEnabled: false,
          twoFASecret: null,
        },
      }),
      prisma.twoFARecoveryCode.deleteMany({ where: { userId: user.id } }),
      prisma.twoFASetupRequest.deleteMany({ where: { userId: user.id } }),
      prisma.twoFAChallenge.deleteMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ ok: true, twoFAEnabled: false });
  }

  const recoveryCodes = await replaceRecoveryCodes(user.id);
  return NextResponse.json({ ok: true, recoveryCodes, twoFAEnabled: true });
}
