-- ============================================================
-- PHASE 17 — USER PROFILE PICTURE SUPPORT
-- Run this once in the Supabase SQL Editor (Dashboard → SQL).
--
-- Adds the smallest possible additions required for the
-- Dashboard "Edit Profile" feature:
--
--   1. profiles.avatar_url  (text) — public URL of the user's
--      uploaded profile picture. NULL = no picture (the UI
--      falls back to initials).
--
--   2. A public Storage bucket "profile-images" with RLS
--      policies so each authenticated user can only upload,
--      update and delete objects inside their own folder
--      (storage path: "<auth.uid()>/avatar-<timestamp>.<ext>").
--
-- No existing columns are renamed, no existing tables are
-- modified, no vehicle/auth/messaging structures are touched.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILE AVATAR COLUMN
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ------------------------------------------------------------
-- 2. STORAGE BUCKET (public read, per-user write)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. STORAGE RLS POLICIES (idempotent)
--    Folder rule: first path segment must equal auth.uid()
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "profile-images-public-read"
  ON storage.objects;
CREATE POLICY "profile-images-public-read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "profile-images-user-insert"
  ON storage.objects;
CREATE POLICY "profile-images-user-insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile-images-user-update"
  ON storage.objects;
CREATE POLICY "profile-images-user-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile-images-user-delete"
  ON storage.objects;
CREATE POLICY "profile-images-user-delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );