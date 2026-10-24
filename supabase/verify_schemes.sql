-- ============================================================================
-- Innova Sphere — Mark Verified Scheme Records in Supabase
-- Target table: public.schemes
--
-- Context:
--   The public.schemes table enforces Row Level Security (RLS) allowing SELECT
--   only for records where verification_status = 'verified'.
--
-- Target Records for Verification (4):
--   1. pm-kisan            (Operational Guidelines: pmkisan.gov.in/Documents/OperationalGuidelines.pdf)
--   2. pmfby               (Revised Guidelines: pmfby.gov.in/pdf/Revised_Operational_Guidelines.pdf)
--   3. kisan-credit-card   (KCC Guidelines: agricoop.gov.in/Documents/KCC_Guidelines.pdf)
--   4. soil-health-card    (SHC Portal: soilhealth.dac.gov.in/soilhealthcard/about)
--
-- Excluded Records:
--   • telangana-rythu-bharosa remains unverified / excluded pending gazette notification.
--
-- Safety:
--   • Minimal UPDATE scoped strictly by explicit slugs.
--   • Does not modify or drop any RLS policies.
--   • Leaves all unverified records untouched.
-- ============================================================================

UPDATE public.schemes
SET
  verification_status = 'verified',
  updated_at = NOW()
WHERE slug IN (
  'pm-kisan',
  'pmfby',
  'kisan-credit-card',
  'soil-health-card'
);

-- Verification Query (Run this to confirm the status of records in SQL Editor):
SELECT
  id,
  slug,
  name,
  verification_status,
  official_url,
  source_url,
  last_verified_at
FROM public.schemes
ORDER BY id;
