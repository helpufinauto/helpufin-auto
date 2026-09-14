-- =========================================================
-- VEHICLE INTEREST — duplicate protection + RLS
-- Smallest necessary change to support the Vehicle Details
-- "Interested" action feeding the existing CRM Leads system.
--
--   buyer (auth.uid()) --interest--> vehicle --> seller/dealer
--        --> existing CRM Leads "Interested" tab/count
--
-- Idempotent: safe to run multiple times.
-- =========================================================

-- 1. DUPLICATE PROTECTION ---------------------------------
-- One interest per (buyer, vehicle). Repeated clicks by the
-- same user must never create a second record / count.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicle_interest_unique_buyer_vehicle'
      AND conrelid = 'public.vehicle_interest'::regclass
  ) THEN
    ALTER TABLE public.vehicle_interest
      ADD CONSTRAINT vehicle_interest_unique_buyer_vehicle
      UNIQUE (vehicle_id, buyer_id);
  END IF;
END $$;

-- 2. RLS ---------------------------------------------------
ALTER TABLE public.vehicle_interest ENABLE ROW LEVEL SECURITY;

-- Buyers may create interests only as themselves.
-- (The application always inserts buyer_id = auth.uid().)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_interest'
      AND policyname = 'vehicle_interest_insert_own'
  ) THEN
    CREATE POLICY vehicle_interest_insert_own
      ON public.vehicle_interest
      FOR INSERT
      WITH CHECK (buyer_id = auth.uid());
  END IF;
END $$;

-- Buyers see their own interests; sellers/dealers see the
-- interests on THEIR vehicles only (dashboard counts + CRM).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_interest'
      AND policyname = 'vehicle_interest_select_own_or_seller'
  ) THEN
    CREATE POLICY vehicle_interest_select_own_or_seller
      ON public.vehicle_interest
      FOR SELECT
      USING (
        buyer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.vehicles v
          WHERE v.id = vehicle_interest.vehicle_id
            AND v.seller_id = auth.uid()
        )
      );
  END IF;
END $$;
