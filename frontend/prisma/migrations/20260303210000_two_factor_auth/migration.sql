-- CreateTable
CREATE TABLE "TwoFARecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFARecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFAChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFAChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFASetupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFASetupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoFARecoveryCode_userId_codeHash_key" ON "TwoFARecoveryCode"("userId", "codeHash");

-- CreateIndex
CREATE INDEX "TwoFARecoveryCode_userId_usedAt_idx" ON "TwoFARecoveryCode"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFAChallenge_tokenHash_key" ON "TwoFAChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "TwoFAChallenge_userId_expiresAt_idx" ON "TwoFAChallenge"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFASetupRequest_userId_key" ON "TwoFASetupRequest"("userId");

-- CreateIndex
CREATE INDEX "TwoFASetupRequest_expiresAt_idx" ON "TwoFASetupRequest"("expiresAt");

-- AddForeignKey
ALTER TABLE "TwoFARecoveryCode" ADD CONSTRAINT "TwoFARecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFAChallenge" ADD CONSTRAINT "TwoFAChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFASetupRequest" ADD CONSTRAINT "TwoFASetupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
