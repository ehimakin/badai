-- AlterTable
ALTER TABLE "User"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "memberTag" TEXT,
ADD COLUMN "forename" TEXT,
ADD COLUMN "surname" TEXT,
ADD COLUMN "mobile" TEXT,
ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_memberTag_key" ON "User"("memberTag");
