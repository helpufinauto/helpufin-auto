-- =============================================================
-- PHASE 7 — SIGNUP PROFILE CARD FIELDS
-- =============================================================
-- Adds the optional Profile-card columns captured on /signup
-- (bio, location, city, province, website) plus the optional
-- Contact-card columns (mobile_number, whatsapp_number,
-- alternative_contact) that Phase 6 persists through the same
-- metadata → profiles fallback path.
--
-- All columns are nullable text — nothing existing changes,
-- no defaults, no not-null constraints. Safe to re-run.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS alternative_contact text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS website text;
