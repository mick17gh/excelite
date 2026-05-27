-- Add optional hashed PIN for PIN-only login
ALTER TABLE "user"
ADD COLUMN "pinHash" TEXT;
