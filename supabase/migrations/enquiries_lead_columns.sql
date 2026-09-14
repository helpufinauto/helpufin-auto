-- =========================================================
-- ENQUIRIES — CRM lead contact + vehicle columns
-- The "Interested" action on the Vehicle Details page writes a
-- lead into the existing CRM `enquiries` table (the same table
-- the Contact Seller flow and the CRM dashboard use).
--
-- These columns let that lead carry the buyer's surname and a
-- human-readable vehicle title alongside the existing
-- name / email / phone / message / vehicle_id / seller_id.
--
-- Idempotent: safe to run multiple times.
-- The application falls back gracefully if the columns are not
-- yet present, so applying this migration is optional but
-- recommended to capture surname + vehicle title.
-- =========================================================

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS surname TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_title TEXT,
  ADD COLUMN IF NOT EXISTS lead_source TEXT;
