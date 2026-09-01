-- Add a stable, simple voice profile for each user.
ALTER TABLE "User"
ADD COLUMN "voicePreference" TEXT NOT NULL DEFAULT 'female';
