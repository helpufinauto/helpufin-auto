-- =========================================================
-- VEHICLE INTEREST — contact detail columns
-- Extends the "Interested" popup on the Vehicle Details page
-- so the buyer's Surname and Message / Details are persisted
-- for the dealer, alongside the existing name/email/phone.
--
-- Idempotent: safe to run multiple times.
-- The application falls back gracefully if these columns
-- are not yet present, so this migration is optional.
-- =========================================================

ALTER TABLE public.vehicle_interest
  ADD COLUMN IF NOT EXISTS buyer_surname TEXT,
  ADD COLUMN IF NOT EXISTS buyer_message TEXT;
