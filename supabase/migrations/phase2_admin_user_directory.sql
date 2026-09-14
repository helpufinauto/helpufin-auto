-- ============================================================
-- PHASE 2 — ADMIN USER DIRECTORY (READ-ONLY SIGN-UP TRACKING)
-- Run this once in the Supabase SQL Editor (Dashboard → SQL).
--
-- Purpose:
--   Gives authenticated administrators a READ-ONLY view of every
--   registered Supabase Auth user (existing and future signups)
--   directly from the existing auth architecture. No second
--   user/account system is created and no auth data is modified.
--
--   • UID, email and provider come from auth.users / auth.identities
--     (the actual Supabase Auth provider — never guessed from email).
--   • Display name comes from the existing public.profiles row.
--   • New signups appear automatically because auth.users is read
--     live at call time.
--
-- Security:
--   • SECURITY DEFINER is required because auth.users is not
--     readable through PostgREST with the anon key.
--   • The function verifies the caller has profiles.role = 'admin'
--     and otherwise raises — non-admins (including anon) get no data.
--   • Execute is revoked from anon/public and granted to
--     authenticated only.
--   • No credentials (passwords, tokens) are ever returned.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_auth_users()
RETURNS TABLE (
  uid uuid,
  email text,
  provider text,
  display_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
BEGIN

  /* --------------------------------------------------------
     ADMIN GUARD — only authenticated administrators pass.
     -------------------------------------------------------- */
  SELECT p.role
    INTO caller_role
    FROM public.profiles p
   WHERE p.id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  /* --------------------------------------------------------
     DIRECTORY — one row per registered auth user.
     Provider is taken from the user's actual linked auth
     identities (auth.identities), falling back to the
     provider recorded in the user's metadata. Display name
     comes from the existing profiles row when present.
     -------------------------------------------------------- */
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(
      NULLIF(identity_list.providers, ''),
      NULLIF(u.raw_user_meta_data ->> 'provider', ''),
      'email'
    ) AS provider,
    COALESCE(
      NULLIF(pr.dealership_name, ''),
      NULLIF(trim(COALESCE(pr.name, '') || ' ' || COALESCE(pr.surname, '')), ''),
      NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(u.raw_user_meta_data ->> 'name', ''),
      '—'
    ) AS display_name,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles pr
    ON pr.id = u.id
  LEFT JOIN (
    SELECT
      i.user_id,
      string_agg(DISTINCT i.provider, ', ' ORDER BY i.provider) AS providers
    FROM auth.identities i
    GROUP BY i.user_id
  ) identity_list
    ON identity_list.user_id = u.id
  ORDER BY u.created_at DESC;

END;
$$;

-- ------------------------------------------------------------
-- LOCK DOWN EXECUTION (defence in depth on top of the guard)
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.admin_list_auth_users()
  FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_list_auth_users()
  TO authenticated;
