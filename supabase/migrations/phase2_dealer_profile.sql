-- ============================================================
-- PHASE 2 — DEALERSHIP / SELLER PROFILE INFORMATION
-- Run this once in the Supabase SQL Editor (Dashboard → SQL).
--
-- Expands the EXISTING public.profiles table (no new tables,
-- no renames, no removals — all existing data is preserved):
--
--   1. dealership_email   (text)  — dealership contact email
--                                    (the auth login `email`
--                                    column is never overwritten)
--   2. dealership_address (text)  — free-form address text
--   3. social_links       (jsonb) — one column for all social
--                                    platforms, keyed by platform:
--                                    { "whatsapp": "27821234567",
--                                      "facebook": "https://...",
--                                      "instagram": "https://...",
--                                      "tiktok": "https://...",
--                                      "other": "https://..." }
--
-- The following EXISTING columns are reused (no change):
--   - dealership_name  → Dealership Name (already in Edit Profile)
--   - phone            → Dealership Phone Number (already exists)
--   - account_type     → dealer / private seller logic (unchanged)
--
-- Idempotent: safe to run multiple times.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dealership_email text,
  ADD COLUMN IF NOT EXISTS dealership_address text,
  ADD COLUMN IF NOT EXISTS social_links jsonb
    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.social_links IS
'Phase 2 — per-platform social links keyed by platform id (whatsapp, facebook, instagram, tiktok, other). WhatsApp stores digits only (wa.me format); other platforms store full URLs. Empty/missing keys mean "not provided" and are never displayed publicly.';