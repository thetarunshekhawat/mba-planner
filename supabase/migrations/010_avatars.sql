-- Add avatar_url column to profiles for cohort headshots
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
