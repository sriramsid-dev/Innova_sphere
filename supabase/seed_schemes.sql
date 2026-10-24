-- ============================================================================
-- Innova Sphere — Verified Scheme Seed Data
-- Target table: public.schemes
--
-- Supported Verified Schemes (4):
--   1. Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)
--   2. Pradhan Mantri Fasal Bima Yojana (PMFBY)
--   3. Kisan Credit Card (KCC) Scheme
--   4. Soil Health Card (SHC) Scheme
--
-- (Note: Telangana Rythu Bharosa is excluded pending gazette notification)
-- ============================================================================

INSERT INTO public.schemes (
  slug,
  name,
  name_te,
  category,
  summary,
  benefits,
  eligibility,
  required_documents,
  application_steps,
  official_url,
  source_url,
  last_verified_at,
  created_at,
  updated_at
) VALUES
-- 1. PM-KISAN
(
  'pm-kisan',
  'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
  'ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి (పీఎం-కిసాన్)',
  'income_support',
  'Central sector scheme providing ₹6,000 per year income support in three equal four-monthly installments to all landholding farmer families across India.',
  '[
    "Financial assistance of ₹6,000 per year disbursed directly to eligible farmer families.",
    "Paid in 3 equal installments of ₹2,000 each every four months (April-July, August-November, December-March).",
    "Transferred through Direct Benefit Transfer (DBT) directly into Aadhaar-seeded active bank accounts without intermediaries."
  ]'::jsonb,
  '[
    "All landholding farmer families who own cultivable land in their names as per state land records.",
    "Both small and marginal farmers as well as other landholding agricultural families are covered.",
    "Land Ownership Cut-off: Agricultural land acquired after 01-02-2019 is not eligible for benefits for a period of 5 years, except when transferred due to succession/inheritance upon the death of the landowner.",
    "Exclusions: Institutional landholders, farmer families where one or more members hold or held constitutional posts, current/retired ministers, MPs, MLAs, mayors, district panchayat chairpersons.",
    "Exclusions: Serving or retired government/PSU officers and employees (excluding Group D / Multi-Tasking Staff).",
    "Exclusions: All professionals (Doctors, Engineers, Lawyers, Chartered Accountants, Architects) registered with professional bodies and practicing.",
    "Exclusions: Individuals who paid Income Tax in the last assessment year, and pensioners whose monthly pension is ₹10,000 or more (excluding Group D/MTS)."
  ]'::jsonb,
  '[
    "Aadhaar Card (Mandatory for identity verification and eKYC authentication)",
    "Land ownership documentation (Record of Rights / Patta / 1-B / Land Passbook / RoR showing applicant ownership)",
    "Aadhaar-seeded Active Bank Account details (Bank Name, Account Number, and IFSC code)",
    "Active mobile number linked with Aadhaar for OTP verification and status alerts"
  ]'::jsonb,
  '[
    "Visit the official portal at pmkisan.gov.in and click New Farmer Registration under the Farmers Corner section.",
    "Select Rural Farmer Registration or Urban Farmer Registration and enter your 12-digit Aadhaar number and registered mobile number.",
    "Select your State, enter the OTP received on your mobile, and proceed to the detailed application form.",
    "Fill in district, sub-district/tehsil, block, village, personal details, category, and land identity details (Khata number, Survey/Khasra number, Dag number, and land area).",
    "Upload verified land record papers and submit the registration.",
    "Complete mandatory eKYC via OTP authentication on pmkisan.gov.in or biometric verification at a nearby Common Service Centre (CSC) or Village Agriculture Centre.",
    "Check application verification status anytime using the Know Your Status feature on the PM-KISAN portal."
  ]'::jsonb,
  'https://pmkisan.gov.in',
  'https://pmkisan.gov.in/Documents/OperationalGuidelines.pdf',
  '2026-10-21T00:00:00.000Z'::timestamptz,
  NOW(),
  NOW()
),

-- 2. PMFBY
(
  'pmfby',
  'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
  'ప్రధాన మంత్రి ఫసల్ బీమా యోజన (పీఎంఎఫ్‌బీవై)',
  'crop_insurance',
  'Comprehensive national crop insurance scheme providing financial support and risk coverage against non-preventable natural crop loss from pre-sowing to post-harvest.',
  '[
    "Comprehensive yield risk coverage for natural disasters, drought, dry spells, flood, inundation, pests & diseases, landslides, natural fire, and lightning.",
    "Localized calamities coverage for hailstorm, landslide, and cloudburst.",
    "Post-harvest loss coverage for unseasonal and cyclonic rains for crops dried in the field up to a maximum period of two weeks.",
    "Extremely affordable premium rates for farmers: maximum 2.0% for Kharif foodgrain and oilseeds, 1.5% for Rabi foodgrain and oilseeds, and 5.0% for annual commercial and horticultural crops.",
    "Balance of actuarial premium is heavily subsidized and shared equally between Central and State Governments."
  ]'::jsonb,
  '[
    "All farmers growing notified crops in notified insurance areas during the designated season.",
    "Covers both loanee farmers (farmers with seasonal crop loans) and non-loanee farmers.",
    "Sharecroppers and tenant farmers growing notified crops in notified areas are fully eligible.",
    "Participation is voluntary for all farmers (loanee farmers can opt out up to 7 days before seasonal cut-off date)."
  ]'::jsonb,
  '[
    "Aadhaar Card (Mandatory photo identity)",
    "Land ownership record / Patta / RoR / Land Possession Certificate (LPC)",
    "Tenancy agreement or self-declaration of crop sowing (for tenant/sharecropper farmers)",
    "Crop Sowing Certificate issued by local Revenue Department / Village Agricultural Assistant / Patwari",
    "Active Bank Passbook copy showing clear account number and IFSC code"
  ]'::jsonb,
  '[
    "Verify that your crop and gram panchayat/mandal is in the notified list for the current cropping season.",
    "Apply through the official PMFBY National Crop Insurance Portal at pmfby.gov.in, nearest bank branch, Primary Agricultural Credit Society (PACS), or Common Service Centre (CSC).",
    "Submit land survey details, crop sown, area, and upload land record and sowing certificate.",
    "Pay the nominal farmer share of the premium and collect the official insurance acknowledgement receipt with policy/application number.",
    "In the event of localized calamity or post-harvest loss, report crop damage within 72 hours via the Crop Insurance Mobile App, toll-free helpline 14447, or local agriculture office."
  ]'::jsonb,
  'https://pmfby.gov.in',
  'https://pmfby.gov.in/pdf/Revised_Operational_Guidelines.pdf',
  '2026-10-21T00:00:00.000Z'::timestamptz,
  NOW(),
  NOW()
),

-- 3. Kisan Credit Card (KCC)
(
  'kisan-credit-card',
  'Kisan Credit Card (KCC) Scheme',
  'కిసాన్ క్రెడిట్ కార్డు పథకం (కేసీసీ)',
  'credit_facilities',
  'Institutional credit scheme providing adequate and timely short-term credit to farmers for crop cultivation, farm maintenance, post-harvest needs, and allied activities.',
  '[
    "Flexible revolving credit card facility covering short-term crop production credit and post-harvest expenses.",
    "Concessional interest rate: Base interest subvention of 2% brings interest to 7% per annum; prompt repayment incentive of 3% brings effective rate down to just 4% per annum for loans up to ₹3,00,000.",
    "Collateral-free loan limit up to ₹1,60,000 without requiring land mortgage or third-party guarantee.",
    "Extended to cover animal husbandry, dairy farming, poultry, and fisheries farmers.",
    "ATM-enabled RuPay debit card issued for easy cash withdrawal from ATMs and point-of-sale transactions for seeds and fertilizers."
  ]'::jsonb,
  '[
    "All farmers who are owner-cultivators owning cultivable land.",
    "Tenant farmers, oral lessees, and sharecroppers cultivating agricultural land.",
    "Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers, including tenant farmers.",
    "Animal husbandry, dairy, and fisheries farmers (both individual and group) operating livestock or fisheries units."
  ]'::jsonb,
  '[
    "Duly completed KCC Application Form",
    "Identity Proof (Aadhaar Card, Voter ID, PAN Card, or Driving License)",
    "Address Proof (Aadhaar Card, Electricity Bill, or Ration Card)",
    "Land Ownership Documents: Copy of Patta / RoR / Land Passbook / Title Deed",
    "Crop cropping pattern / sowing certificate issued by village revenue or agriculture officer",
    "Tenancy agreement or cultivation affidavit (for tenant farmers and sharecroppers)"
  ]'::jsonb,
  '[
    "Collect the standardized one-page KCC application form from any commercial bank branch, Regional Rural Bank (RRB), Cooperative Bank, PACS, or download from agricoop.gov.in / jansamarth.in.",
    "Fill in personal details, landholding details, cropping plan for the season, and attach land records and Aadhaar.",
    "Submit the application to the local bank branch or PACS where the land is located.",
    "Bank processes the application within the mandated 14-day turnaround time under the KCC saturation drive.",
    "Upon credit appraisal and sanction, receive the KCC credit passbook and ATM-enabled KCC RuPay card."
  ]'::jsonb,
  'https://www.myscheme.gov.in/schemes/kcc',
  'https://www.myscheme.gov.in/schemes/kcc',
  '2026-10-21T00:00:00.000Z'::timestamptz,
  NOW(),
  NOW()
),

-- 4. Soil Health Card (SHC)
(
  'soil-health-card',
  'Soil Health Card (SHC) Scheme',
  'సాయిల్ హెల్త్ కార్డు పథకం (నేల ఆరోగ్య కార్డు)',
  'soil_and_farming',
  'National scheme providing farmers with customized soil test reports and nutrient recommendations every 3 years to improve soil health, productivity, and fertilizer efficiency.',
  '[
    "Comprehensive test report of 12 critical soil parameters: Primary nutrients (N, P, K), Secondary nutrient (S), Micronutrients (Zn, Fe, Cu, Mn, Bo), and Physical parameters (pH, Electrical Conductivity, Organic Carbon).",
    "Field-specific fertilizer and organic manure recommendations based on soil health status and chosen crops.",
    "Reduces wasteful over-application of chemical fertilizers (especially Urea/Nitrogen), cutting input costs by 15-20% while sustaining long-term soil fertility.",
    "Soil sampling and laboratory analysis are completely free of charge for participating farmers."
  ]'::jsonb,
  '[
    "All farmers possessing agricultural land across all states and Union Territories in India.",
    "Individual farmer plots as well as composite grid samples in irrigated and rainfed areas.",
    "Covers all types of cultivable soils and crops."
  ]'::jsonb,
  '[
    "Aadhaar Card or Farmer ID for beneficiary linkage",
    "Land Revenue Details: Survey Number, Khata/Patta number, and Village/Mandal name",
    "Soil sample collected from the agricultural field as per standard grid sampling protocol (2.5 ha for irrigated, 10 ha for rainfed)"
  ]'::jsonb,
  '[
    "Soil samples are systematically collected from agricultural fields by trained Agriculture Department extension staff or Village Agricultural Assistants using GPS coordinates.",
    "Samples are coded, registered, and sent to authorized Government or Mobile Soil Testing Laboratories.",
    "Laboratory performs analysis across 12 physical and chemical soil parameters.",
    "A printed Soil Health Card with crop-specific fertilizer recommendations is issued to the farmer by the Agriculture Department.",
    "Farmers can also view and download their Soil Health Card digitally anytime by visiting soilhealth.dac.gov.in and searching by State, District, Mandal, and Farmer Name or Survey Number."
  ]'::jsonb,
  'https://soilhealth.dac.gov.in',
  'https://soilhealth.dac.gov.in/soilhealthcard/about',
  '2026-10-21T00:00:00.000Z'::timestamptz,
  NOW(),
  NOW()
);
