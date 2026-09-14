-- =============================================
-- SERVER-SIDE ENFORCEMENT:
-- LAUNCH PROMOTION FEATURED VEHICLE LIMITS
--   Private Seller → maximum  2 featured
--   Dealership     → maximum 15 featured
-- Keyed by seller account_type so the single
-- Launch Promotion package applies correctly to
-- both private sellers and dealerships.
-- Complements the frontend check; cannot be
-- bypassed via multiple tabs / stale UI / bulk
-- actions. Does not modify RLS or ownership
-- policies.
-- =============================================

CREATE OR REPLACE FUNCTION enforce_featured_limit()
RETURNS trigger AS $$
DECLARE
  featured_count integer;
  max_featured integer;
  acct_type text;
BEGIN
  IF NEW.is_featured IS TRUE THEN

    SELECT p.account_type INTO acct_type
    FROM profiles p
    WHERE p.id = NEW.seller_id;

    IF acct_type = 'dealer' THEN
      max_featured := 15;
    ELSE
      max_featured := 2;
    END IF;

    SELECT count(*) INTO featured_count
    FROM vehicles
    WHERE seller_id = NEW.seller_id
      AND is_featured IS TRUE
      AND id <> NEW.id;

    IF featured_count >= max_featured THEN
      RAISE EXCEPTION 'Your package allows up to % featured vehicles. Unfeature another vehicle to feature this one.', max_featured;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS featured_vehicle_limit_trigger ON vehicles;

CREATE TRIGGER featured_vehicle_limit_trigger
BEFORE INSERT OR UPDATE OF is_featured ON vehicles
FOR EACH ROW
EXECUTE FUNCTION enforce_featured_limit();