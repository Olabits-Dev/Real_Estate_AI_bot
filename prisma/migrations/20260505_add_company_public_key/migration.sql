ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "publicKey" TEXT;

UPDATE "Company"
SET "publicKey" = 'pk_live_' || md5(random()::text || ':' || clock_timestamp()::text || ':' || "id")
WHERE "publicKey" IS NULL OR "publicKey" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "Company_publicKey_key" ON "Company"("publicKey");

ALTER TABLE "Company"
ALTER COLUMN "publicKey" SET NOT NULL;

