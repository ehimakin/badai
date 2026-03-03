import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/auth";
import { createAuthenticatedResponse } from "@/lib/auth-session";
import { TWO_FA_CHALLENGE_COOKIE_NAME } from "@/lib/session";
import { decryptTwoFASecret, hashRecoveryCode, verifyTotpCode } from "@/lib/twofa";

const schema = z
  .object({
    code: z.string().trim().optional(),
    recoveryCode: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.code || data.recoveryCode), {
    message: "Code is required",
    path: ["code"],
  });

function clearChallengeCookie(res: NextResponse) {
  res.cookies.set(TWO_FA_CHALLENGE_COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const cookieStore = await cookies();
  const rawChallenge = cookieStore.get(TWO_FA_CHALLENGE_COOKIE_NAME)?.value;
  if (!rawChallenge) return NextResponse.json({ error: "2FA challenge expired" }, { status: 401 });

  const tokenHash = sha256(rawChallenge);
  const challenge = await prisma.twoFAChallenge.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          twoFAEnabled: true,
          twoFASecret: true,
        },
      },
    },
  });

  if (!challenge || challenge.expiresAt <= new Date()) {
    await prisma.twoFAChallenge.deleteMany({ where: { tokenHash } });
    return clearChallengeCookie(NextResponse.json({ error: "2FA challenge expired" }, { status: 401 }));
  }

  if (!challenge.user.twoFAEnabled || !challenge.user.twoFASecret) {
    await prisma.twoFAChallenge.deleteMany({ where: { tokenHash } });
    return clearChallengeCookie(NextResponse.json({ error: "2FA is not enabled for this user" }, { status: 400 }));
  }

  let verified = false;
  const code = parsed.data.code?.trim();
  const recoveryCode = parsed.data.recoveryCode?.trim();

  if (code) {
    const secret = decryptTwoFASecret(challenge.user.twoFASecret);
    verified = verifyTotpCode(secret, code);
  } else if (recoveryCode) {
    const codeHash = hashRecoveryCode(recoveryCode);
    const result = await prisma.twoFARecoveryCode.updateMany({
      where: {
        userId: challenge.user.id,
        codeHash,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    verified = result.count > 0;
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid two-factor code" }, { status: 401 });
  }

  await prisma.twoFAChallenge.deleteMany({ where: { userId: challenge.user.id } });

  const res = await createAuthenticatedResponse(challenge.user.id, { ok: true });
  return clearChallengeCookie(res);
}
