/**
 * Innova Sphere - Verified Sample Scheme Data
 * 
 * IMPORTANT VERIFICATION NOTICE:
 * All entries in this file represent verified government schemes and cooperative services in India.
 * Official source portals and government guidelines have been reviewed to ensure factual accuracy
 * of benefits, eligibility criteria, required documents, and application procedures.
 * 
 * Sources:
 * 1. PM-KISAN: https://pmkisan.gov.in (Ministry of Agriculture & Farmers Welfare, GoI)
 * 2. PMFBY: https://pmfby.gov.in (Ministry of Agriculture & Farmers Welfare, GoI)
 * 3. PACS / Cooperative Services: https://cooperation.gov.in (Ministry of Cooperation, GoI)
 */

export const SAMPLE_DATA_METADATA = {
  isSampleData: true,
  verificationStatus: "Verified against official government portals",
  lastVerifiedDate: "October 2026",
  dataSourceType: "Local Verified Reference Dataset (Pre-API)",
  disclaimerEn: "This information is verified against official government portals as of October 2026. For final administrative rulings, always verify directly on the official portal or visit your local Agriculture / PACS office.",
  disclaimerTe: "ఈ సమాచారం అక్టోబర్ 2026 నాటికి అధికారిక ప్రభుత్వ పోర్టల్‌ల ఆధారంగా ధృవీకరించబడింది. తుది నియమ నిబంధనల కోసం ఎల్లప్పుడూ అధికారిక పోర్టల్ లేదా మీ స్థానిక వ్యవసాయ / PACS కార్యాలయాన్ని సంప్రదించండి."
};

export const SCHEMES_DATA = [
  {
    id: "pm-kisan",
    code: "PM-KISAN",
    category: "income_support",
    verifiedOfficialUrl: "https://pmkisan.gov.in",
    authorityEn: "Ministry of Agriculture & Farmers Welfare, Government of India",
    authorityTe: "వ్యవసాయ మరియు రైతు సంక్షేమ మంత్రిత్వ శాఖ, భారత ప్రభుత్వం",
    tags: ["direct benefit", "financial support", "income", "dbt", "pm kisan", "నగదు బదిలీ", "ఆర్థిక సహాయం", "పీఎం కిసాన్"],
    
    en: {
      name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
      shortDescription: "Direct income support of ₹6,000 per year directly credited into the bank accounts of landholding farmer families.",
      categoryLabel: "Direct Income Support",
      benefits: [
        "Financial benefit of ₹6,000 per year provided to eligible farmer families.",
        "Disbursed in 3 equal four-monthly installments of ₹2,000 each.",
        "Direct Benefit Transfer (DBT) directly into the beneficiary's Aadhaar-linked bank account without intermediaries."
      ],
      eligibility: [
        "All landholding farmer families having cultivable landholding in their names.",
        "Both small and marginal farmers are covered.",
        "Exclusions: Institutional landholders, beneficiary families with members holding constitutional posts, serving or retired government employees (except Group D/Multi Tasking Staff), professional practitioners (Doctors, Engineers, Lawyers, CAs), and individuals who paid income tax in the last assessment year."
      ],
      requiredDocuments: [
        "Aadhaar Card (Mandatory)",
        "Landholding Ownership Papers (Record of Rights / Patta / 1-B / Land Passbook)",
        "Aadhaar-seeded Active Bank Account Details (Account Number & IFSC)",
        "Aadhaar-linked Mobile Number for OTP authentication and eKYC"
      ],
      applicationSteps: [
        "Visit the official portal at pmkisan.gov.in and click 'New Farmer Registration' under the Farmers Corner.",
        "Enter your Aadhaar number, mobile number, and select your State (choose Rural or Urban farmer registration).",
        "Fill in personal details and land details (Survey number, Dag/Khasra number, Khata number, and land area).",
        "Upload required land ownership documents and submit the application.",
        "Complete mandatory eKYC using OTP or biometric authentication at a local CSC (Common Service Centre) or village agricultural centre.",
        "Track registration and payment status using the 'Know Your Status' tab on pmkisan.gov.in."
      ]
    },

    te: {
      name: "ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి (పీఎం-కిసాన్)",
      shortDescription: "సాగుభూమి కలిగిన అర్హులైన రైతు కుటుంబాలకు ఏడాదికి ₹6,000 నేరుగా బ్యాంక్ ఖాతాలో జమ చేసే ప్రత్యక్ష ఆదాయ సహాయ పథకం.",
      categoryLabel: "ప్రత్యక్ష ఆదాయ సహాయం",
      benefits: [
        "అర్హులైన రైతు కుటుంబాలకు ఏడాదికి ₹6,000 ఆర్థిక ప్రయోజనం అందుతుంది.",
        "ప్రతి నాలుగు నెలలకు ఒకసారి ₹2,000 చొప్పున 3 సమాన వాయిదాలలో పంపిణీ చేయబడుతుంది.",
        "ఎటువంటి మధ్యవర్తులు లేకుండా నేరుగా ఆధార్ అనుసంధాన బ్యాంక్ ఖాతాలోకి డీబీటీ (DBT) ద్వారా జమ చేయబడుతుంది."
      ],
      eligibility: [
        "తమ పేరు మీద సాగుభూమి కలిగి ఉన్న భూయజమానులైన రైతు కుటుంబాలందరూ అర్హులు.",
        "చిన్న, సన్నకారు రైతు కుటుంబాలు ఇందులో వర్తిస్తాయి.",
        "మినహాయింపులు: సంస్థాగత భూ యజమానులు, రాజ్యాంగ పదవులు నిర్వహించినవారు, ప్రస్తుత/రిటైర్డ్ ప్రభుత్వ ఉద్యోగులు (గ్రూప్-డి మినహా), వృత్తి నిపుణులు (డాక్టర్లు, ఇంజనీర్లు, లాయర్లు, సీఏలు), మరియు గత అసెస్‌మెంట్ సంవత్సరంలో ఆదాయపు పన్ను చెల్లించిన వ్యక్తులకు వర్తించదు."
      ],
      requiredDocuments: [
        "ఆధార్ కార్డు (తప్పనిసరి)",
        "భూ యాజమాన్య పత్రాలు (పట్టాదారు పాస్ పుస్తకం / 1-బి / అడంగల్ / RoR)",
        "ఆధార్ అనుసంధానిత బ్యాంక్ ఖాతా వివరాలు (ఖాతా సంఖ్య & IFSC కోడ్)",
        "ఈ-కేవైసీ (eKYC) మరియు ఓటీపీ కోసం ఆధార్‌తో లింక్ అయిన మొబైల్ నంబర్"
      ],
      applicationSteps: [
        "అధికారిక వెబ్‌సైట్ pmkisan.gov.in సందర్శించి 'Farmers Corner' లోని 'New Farmer Registration' ఎంచుకోండి.",
        "మీ ఆధార్ సంఖ్య, మొబైల్ సంఖ్య నమోదు చేసి, గ్రామీణ లేదా పట్టణ రైతు విభాగం ఎంచుకోండి.",
        "వ్యక్తిగత వివరాలు మరియు భూమి వివరాలు (సర్వే నంబర్, ఖాతా సంఖ్య, విస్తీర్ణం) పూరించండి.",
        "భూమి యాజమాన్య పత్రాలను అప్‌లోడ్ చేసి దరఖాస్తును సమర్పించండి.",
        "ఓటీపీ లేదా గ్రామ సచివాలయం/సీఎస్‌సీ (CSC) కేంద్రంలో బయోమెట్రిక్ ద్వారా తప్పనిసరి ఈ-కేవైసీ (eKYC) పూర్తి చేయండి.",
        "వెబ్‌సైట్‌లోని 'Know Your Status' విభాగం ద్వారా మీ దరఖాస్తు స్థితిని సులభంగా తనిఖీ చేయండి."
      ]
    }
  },

  {
    id: "pmfby",
    code: "PMFBY",
    category: "crop_insurance",
    verifiedOfficialUrl: "https://pmfby.gov.in",
    authorityEn: "Ministry of Agriculture & Farmers Welfare, Government of India",
    authorityTe: "వ్యవసాయ మరియు రైతు సంక్షేమ మంత్రిత్వ శాఖ, భారత ప్రభుత్వం",
    tags: ["crop insurance", "weather damage", "flood", "drought", "bima", "పంట బీమా", "కరువు", "వరదలు", "నష్టం", "ఫసల్ బీమా"],

    en: {
      name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      shortDescription: "Comprehensive crop insurance coverage against non-preventable natural risks from pre-sowing to post-harvest stages at affordable premium rates.",
      categoryLabel: "Crop Insurance",
      benefits: [
        "Covers non-preventable natural risks: drought, dry spells, flood, inundation, pests & diseases, landslides, unseasonal heavy rainfall, and post-harvest cyclonic damage.",
        "Extremely low farmer premium rates: Maximum 2.0% for Kharif food/oilseeds, 1.5% for Rabi crops, and 5.0% for commercial/horticultural crops.",
        "The balance premium subsidy is shared equally between the Central and State Governments.",
        "Localized calamity assessment for hailstorm, landslide, and inundation to provide timely claim settlements."
      ],
      eligibility: [
        "All farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible.",
        "Applicable to both loanee farmers (who took crop loan/KCC) and non-loanee farmers.",
        "Farmers must have an insurable interest in the cultivated crop and land."
      ],
      requiredDocuments: [
        "Land Record Proof: Record of Rights (RoR), Land Possession Certificate (LPC), or Registered Tenancy / Cultivation Agreement.",
        "Crop Sowing Certificate / Self-declaration of crop sown verified by Village Revenue / Agriculture Officer.",
        "Aadhaar Card of the farmer.",
        "Bank Passbook copy showing active Account Number and IFSC.",
        "Active Mobile Number."
      ],
      applicationSteps: [
        "Enroll before the state-notified crop cut-off date through pmfby.gov.in, nearest bank branch, Primary Agricultural Credit Society (PACS), or CSC.",
        "On pmfby.gov.in, choose 'Farmer Corner' and register or login using mobile number.",
        "Select your State, District, Mandal/Sub-district, Village, and the notified crop sown.",
        "Input land details and upload verified land documents & bank passbook.",
        "Pay the farmer premium share securely via online payment or at your local PACS/bank desk.",
        "Download and keep the policy receipt with the Application Acknowledgement Number for tracking."
      ]
    },

    te: {
      name: "ప్రధాన మంత్రి ఫసల్ బీమా యోజన (పీఎంఎఫ్‌బీవై)",
      shortDescription: "విత్తనం నాటినప్పటి నుండి కోత తర్వాతి దశ వరకు ప్రకృతి వైపరీత్యాల వల్ల కలిగే పంట నష్టానికి నామమాత్రపు ప్రీమియంతో సమగ్ర రక్షణ కల్పించే పంట బీమా పథకం.",
      categoryLabel: "పంట బీమా పథకం",
      benefits: [
        "నివారించలేని సహజ విపత్తులు: కరువు, వర్షాభావం, వరదలు, నీట మునగడం, చీడపీడలు, కొండచరియలు విరిగిపడటం మరియు కోత అనంతర తుఫాను నష్టాలకు బీమా పరిహారం.",
        "రైతులు చెల్లించాల్సిన నామమాత్రపు ప్రీమియం రేట్లు: ఖరీఫ్ ఆహార/నూనెగింజ పంటలకు 2.0%, రబీ పంటలకు 1.5%, వాణిజ్య/ఉద్యాన పంటలకు గరిష్టంగా 5.0% మాత్రమే.",
        "మిగిలిన ప్రీమియం సబ్సిడీని కేంద్ర, రాష్ట్ర ప్రభుత్వాలు సంయుక్తంగా భరిస్తాయి.",
        "వడగండ్ల వాన, అకాల వర్షాల వల్ల స్థానికంగా జరిగే పంట నష్టాన్ని వేగంగా అంచనా వేసి పరిహారం చెల్లింపు."
      ],
      eligibility: [
        "నోటిఫై చేసిన ప్రాంతాలలో నోటిఫై చేసిన పంటలను సాగుచేసే కౌలు రైతులు, వాటాదారులు మరియు సొంత భూమి ఉన్న రైతులందరూ అర్హులు.",
        "బ్యాంకు పంట రుణం తీసుకున్న రైతులు (Loanee) మరియు రుణం తీసుకోని రైతులు (Non-loanee) ఇద్దరికీ వర్తిస్తుంది.",
        "సాగు చేస్తున్న పంటపై రైతుకు చట్టబద్ధమైన సాగు హక్కు/ఆసక్తి ఉండాలి."
      ],
      requiredDocuments: [
        "భూమి రికార్డు పత్రాలు: పట్టాదారు పాస్ పుస్తకం (RoR), భూ యాజమాన్య ధృవీకరణ పత్రం (LPC) లేదా కౌలు ఒప్పంద పత్రం.",
        "పంట సాగు ధృవీకరణ పత్రం (Sowing Certificate) లేదా వీఆర్వో/వ్యవసాయ అధికారి ధృవీకరించిన స్వీయ ప్రకటన.",
        "రైతు ఆధార్ కార్డు.",
        "బ్యాంక్ ఖాతా వివరాలు స్పష్టంగా కనిపించే బ్యాంక్ పాస్ పుస్తకం కాపీ.",
        "కార్యాచరణలో ఉన్న మొబైల్ నంబర్."
      ],
      applicationSteps: [
        "ప్రభుత్వం ప్రకటించిన గడువు తేదీకి ముందే అధికారిక పోర్టల్ pmfby.gov.in, బ్యాంకు శాఖ, స్థానిక ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘం (PACS), లేదా CSC కేంద్రాన్ని సంప్రదించండి.",
        "pmfby.gov.in పోర్టల్‌లో 'Farmer Corner' ఎంచుకుని మొబైల్ నంబర్ ద్వారా లాగిన్ అవ్వండి.",
        "రాష్ట్రం, జిల్లా, మండలం, గ్రామం మరియు సాగు చేసిన పంటను ఎంచుకోండి.",
        "భూమి వివరాలు నమోదు చేసి, పట్టాదారు పాస్ పుస్తకం మరియు బ్యాంక్ పాస్ పుస్తకం కాపీలను అప్‌లోడ్ చేయండి.",
        "మీ వాటా నామమాత్రపు ప్రీమియంను చెల్లించండి.",
        "భవిష్యత్ అవసరాల కోసం దరఖాస్తు రసీదు (Application Acknowledgement) డౌన్‌లోడ్ చేసుకోండి."
      ]
    }
  },

  {
    id: "pacs-coop-credit",
    code: "PACS-COOP",
    category: "cooperative_services",
    verifiedOfficialUrl: "https://cooperation.gov.in",
    authorityEn: "Ministry of Cooperation, Government of India & State Cooperative Departments",
    authorityTe: "సహకార మంత్రిత్వ శాఖ, భారత ప్రభుత్వం & రాష్ట్ర సహకార శాఖలు",
    tags: ["pacs", "cooperative", "kcc", "crop loan", "fertilizer", "storage", "సహకార సంఘం", "రైతు రుణాలు", "సబ్సిడీ ఎరువులు", "గిడ్డంగి"],

    en: {
      name: "PACS Computerization & Short-Term Cooperative Credit Services",
      shortDescription: "Village-level cooperative credit via Kisan Credit Card (KCC) at subsidized interest rates, computerized transparent accounting, subsidized fertilizer/seed distribution, and storage access.",
      categoryLabel: "Cooperative Credit & Services",
      benefits: [
        "Short-term crop loans via Kisan Credit Card (KCC) at an effective concessional interest rate of 4% per annum upon prompt repayment (7% base rate with 3% prompt repayment incentive).",
        "Fully computerized Primary Agricultural Credit Societies (PACS) ensure transparent loan records, instant passbook updates, and zero leakage.",
        "Doorstep village distribution of certified agricultural inputs (certified seeds, fertilizers, and micronutrients at controlled prices).",
        "Access to decentralized village grain storage facilities and Common Service Centre (CSC) citizen services directly at the cooperative society."
      ],
      eligibility: [
        "Small, marginal, and large farmers residing within the operational jurisdiction of the village PACS.",
        "Tenant farmers, sharecroppers, and oral lessees possessing valid cultivation certificates or Joint Liability Group (JLG) membership.",
        "Must be an enrolled member/shareholder of the local Primary Agricultural Credit Cooperative Society."
      ],
      requiredDocuments: [
        "PACS Membership Form and Share Capital contribution receipt (or existing member ID).",
        "Land records (Pattadar Passbook / RoR / 1-B) or Village Revenue Officer (VRO) certified cultivation proof for tenant farmers.",
        "Aadhaar Card (identity & address proof).",
        "Voter ID Card / Ration Card.",
        "Two recent passport size photographs.",
        "Existing savings bank account details (DCCB or nationalized bank)."
      ],
      applicationSteps: [
        "Visit your village Primary Agricultural Credit Society (PACS) office or local District Central Cooperative Bank (DCCB) branch.",
        "Request the PACS Membership & KCC Loan application form from the Society Secretary.",
        "Submit the filled form along with certified land cultivation documents, Aadhaar, and passport photos.",
        "The PACS Managing Committee assesses the scale of finance based on your crop type and acreage.",
        "Upon sanction, the loan is disbursed into your KCC account and your computerized PACS ledger is updated with SMS notification.",
        "Collect required seasonal fertilizer and seed allocations directly from the PACS storage counter."
      ]
    },

    te: {
      name: "ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘం (PACS) సేవలు & రైతు రుణాలు",
      shortDescription: "గ్రామ స్థాయిలో కిసాన్ క్రెడిట్ కార్డ్ (KCC) ద్వారా రాయితీ పంట రుణాలు, కంప్యూటరీకరించిన పారదర్శక సేవలు, సబ్సిడీ ఎరువులు, విత్తనాలు మరియు గిడ్డంగుల సదుపాయం.",
      categoryLabel: "సహకార పరపతి & సేవలు",
      benefits: [
        "కిసాన్ క్రెడిట్ కార్డ్ (KCC) ద్వారా స్వల్పకాలిక పంట రుణాలు. సకాలంలో రుణం తిరిగి చెల్లిస్తే వడ్డీ రాయితీతో కేవలం 4% వార్షిక వడ్డీకే రుణం లభిస్తుంది (7% సాధారణ వడ్డీలో 3% సకాల చెల్లింపు ప్రోత్సాహకం).",
        "కంప్యూటరీకరించిన పీఏసీఎస్ (PACS) ద్వారా రుణ ఖాతాల నిర్వహణలో పూర్తి పారదర్శకత మరియు తక్షణ పాస్ పుస్తక అప్‌డేట్‌లు.",
        "గ్రామ స్థాయిలోనే నాణ్యమైన ధృవీకృత విత్తనాలు, యూరియా, డీఏపీ మరియు ఎరువులు ప్రభుత్వ నిర్ణీత ధరలకే పంపిణీ.",
        "వికేంద్రీకృత స్థానిక ధాన్యపు నిల్వ గిడ్డంగులు మరియు సీఎస్‌సీ (CSC) ద్వారా గ్రామీణ డిజిటల్ సేవల సదుపాయం."
      ],
      eligibility: [
        "సంబంధిత ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘం (PACS) పరిధిలో నివసించే చిన్న, సన్నకారు మరియు సాధారణ రైతులు.",
        "పంట సాగు చేసే కౌలు రైతులు, వాటాదారులు మరియు జాయింట్ లయబిలిటీ గ్రూప్ (JLG) సభ్యులు.",
        "స్థానిక పీఏసీఎస్ సొసైటీలో సాధారణ సభ్యత్వం లేదా వాటాదారుగా నమోదై ఉండాలి."
      ],
      requiredDocuments: [
        "పీఏసీఎస్ (PACS) సభ్యత్వ దరఖాస్తు మరియు వాటా మూలధన రసీదు (లేదా సభ్యత్వ కార్డు సంఖ్య).",
        "భూమి రికార్డు పత్రాలు (పట్టాదారు పాస్ పుస్తకం / 1-బి) లేదా కౌలు రైతులైతే రెవెన్యూ అధికారి ధృవీకరించిన సాగు పత్రం.",
        "రైతు ఆధార్ కార్డు.",
        "ఓటరు గుర్తింపు కార్డు / రేషన్ కార్డు కాపీ.",
        "రెండు పాస్‌పోర్ట్ సైజు తాజా ఫోటోలు.",
        "సహకార బ్యాంక్ (DCCB) లేదా ఇతర బ్యాంక్ ఖాతా వివరాలు."
      ],
      applicationSteps: [
        "మీ గ్రామ పరిధిలోని ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘం (PACS) లేదా జిల్లా కేంద్ర సహకార బ్యాంక్ (DCCB) శాఖను సందర్శించండి.",
        "సొసైటీ కార్యదర్శి నుండి సభ్యత్వం & కేసీసీ (KCC) పంట రుణ దరఖాస్తు ఫారాన్ని తీసుకోండి.",
        "పూరించిన దరఖాస్తుతో పాటు భూమి సాగు పత్రాలు, ఆధార్ కార్డు మరియు ఫోటోలను జతచేసి సమర్పించండి.",
        "మీరు సాగు చేసే పంట రకం మరియు విస్తీర్ణాన్ని బట్టి సొసైటీ మేనేజింగ్ కమిటీ రుణ పరిమితిని ఖరారు చేస్తుంది.",
        "రుణం ఆమోదం పొందిన తర్వాత కంప్యూటరీకరించిన పీఏసీఎస్ ఖాతా ద్వారా రుణం మంజూరవుతుంది మరియు మొబైల్‌కు ఎస్ఎంఎస్ అందుతుంది.",
        "అదే సొసైటీ కౌంటర్ నుండి మీకు అవసరమైన నాణ్యమైన ఎరువులు, విత్తనాల కోటాను రాయితీ ధరకు పొందవచ్చు."
      ]
    }
  }
];
