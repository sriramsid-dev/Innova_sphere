/**
 * Innova Sphere — Search & Query Service Layer
 *
 * Data strategy (transparent to UI components):
 *
 *   1. LIVE MODE   — both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 *                    are set → queries the public.schemes table via the
 *                    Supabase client. Row Level Security is respected; no
 *                    secret keys are used.
 *
 *   2. SAMPLE MODE — env vars absent → falls back to the verified local
 *                    reference dataset in src/data/schemes.js.
 *                    Results are tagged { _source: "sample" } so UI can
 *                    show an honest disclosure banner.
 *
 * All functions remain async so UI components never need to change when
 * the data source changes.
 *
 * The assistant (queryAssistant) always uses the local dataset because it
 * relies on the rich structured fields (benefits[], eligibility[], etc.)
 * that may not exist in the remote table. Live scheme listings are linked
 * from the scheme directory.
 */

import { SCHEMES_DATA, SAMPLE_DATA_METADATA } from "../data/schemes.js";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { TELUGU_SCHEMES_MAP } from "../data/schemesTelugu.js";
import {
  detectConversationalIntent,
  isContextualFollowUp,
  isLikelyFarmerTopic,
  shouldInheritScheme,
  classifyEligibilityAnswer,
  isEligibilityDecisionQuery,
  stripLeadingChitChat,
  INTENT,
} from "./intent.js";
import { translations } from "../translations/i18n.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [val];
  }
  return [];
}

const CATEGORY_LABELS = {
  income_support: { en: "Direct Income Support", te: "ప్రత్యక్ష ఆదాయ మద్దతు" },
  crop_insurance: { en: "Crop Insurance", te: "పంట బీమా పథకం" },
  cooperative_services: { en: "Credit & Cooperative Support", te: "రైతు రుణాలు & పరపతి సేవలు" },
  credit_facilities: { en: "Credit Facilities", te: "రైతు రుణాలు & పరపతి సేవలు" },
  soil_and_farming: { en: "Soil & Crop Guidance", te: "నేల ఆరోగ్యం & సాగు సూచనలు" },
};

function normaliseRow(row) {
  const slug = (row.slug || row.id || "").toLowerCase();
  const teOverride = TELUGU_SCHEMES_MAP[slug] || null;

  const code = (row.code || row.slug || row.id || "SCHEME").toUpperCase();
  const nameEn = row.name || row.name_en || code;
  const nameTe = row.name_te || teOverride?.name || nameEn;

  const summaryEn = row.summary || row.short_description || row.short_description_en || "";
  const summaryTe = row.summary_te || teOverride?.shortDescription || row.short_description_te || summaryEn;

  const officialUrl = row.official_url || row.verified_official_url || row.url || "";
  const category = row.category || "general";

  const catEn = row.category_label_en || CATEGORY_LABELS[category]?.en || category;
  const catTe = row.category_label_te || teOverride?.categoryLabel || CATEGORY_LABELS[category]?.te || catEn;

  const benefitsEn = toArray(row.benefits || row.benefits_en);
  const benefitsTe = toArray(
    row.benefits_te ||
    (teOverride?.benefits && teOverride.benefits.length > 0 ? teOverride.benefits : null) ||
    row.benefits ||
    row.benefits_en
  );

  const eligibilityEn = toArray(row.eligibility || row.eligibility_en);
  const eligibilityTe = toArray(
    row.eligibility_te ||
    (teOverride?.eligibility && teOverride.eligibility.length > 0 ? teOverride.eligibility : null) ||
    row.eligibility ||
    row.eligibility_en
  );

  const requiredDocumentsEn = toArray(row.required_documents || row.required_documents_en);
  const requiredDocumentsTe = toArray(
    row.required_documents_te ||
    (teOverride?.requiredDocuments && teOverride.requiredDocuments.length > 0 ? teOverride.requiredDocuments : null) ||
    row.required_documents ||
    row.required_documents_en
  );

  const applicationStepsEn = toArray(row.application_steps || row.application_steps_en);
  const applicationStepsTe = toArray(
    row.application_steps_te ||
    (teOverride?.applicationSteps && teOverride.applicationSteps.length > 0 ? teOverride.applicationSteps : null) ||
    row.application_steps ||
    row.application_steps_en
  );

  return {
    id: row.slug || String(row.id),
    dbId: row.id,
    code,
    category,
    verifiedOfficialUrl: officialUrl,
    authorityEn: row.authority || row.authority_en || "Government of India",
    authorityTe: row.authority_te || "భారత ప్రభుత్వం",
    tags: toArray(row.tags),
    _source: "live",

    en: {
      name: nameEn,
      shortDescription: summaryEn,
      categoryLabel: catEn,
      benefits: benefitsEn,
      eligibility: eligibilityEn,
      requiredDocuments: requiredDocumentsEn,
      applicationSteps: applicationStepsEn,
    },

    te: {
      name: nameTe,
      shortDescription: summaryTe,
      categoryLabel: catTe,
      benefits: benefitsTe,
      eligibility: eligibilityTe,
      requiredDocuments: requiredDocumentsTe,
      applicationSteps: applicationStepsTe,
    },
  };
}

/** Tag every item in the local sample dataset so the UI can identify them. */
function taggedSampleData() {
  return SCHEMES_DATA.map((s) => ({ ...s, _source: "sample" }));
}

// ─── Health / Connection Check ──────────────────────────────────────────────

/**
 * Perform a real lightweight query to test Supabase connection and row count.
 * Returns { status, configured, connected, recordCount, error }
 * where status is one of:
 *   - "connected"       : connected and public.schemes has rows (>0)
 *   - "connected_empty" : connected and public.schemes exists, but has 0 rows
 *   - "error"           : connection or query error
 *   - "not_configured"  : environment variables missing in .env.local
 */
export async function checkSupabaseHealth() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      status: "not_configured",
      configured: false,
      connected: false,
      recordCount: 0,
      error: null,
    };
  }

  try {
    const { count, error } = await supabase
      .from("schemes")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[Innova Sphere] Supabase health check error:", error.message);
      return {
        status: "error",
        configured: true,
        connected: false,
        recordCount: 0,
        error: error.message,
      };
    }

    const totalCount = count ?? 0;
    if (totalCount === 0) {
      return {
        status: "connected_empty",
        configured: true,
        connected: true,
        recordCount: 0,
        error: null,
      };
    }

    return {
      status: "connected",
      configured: true,
      connected: true,
      recordCount: totalCount,
      error: null,
    };
  } catch (err) {
    console.error("[Innova Sphere] Unexpected error during Supabase health check:", err);
    return {
      status: "error",
      configured: true,
      connected: false,
      recordCount: 0,
      error: err?.message || String(err),
    };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch all schemes.
 * Returns { schemes, source: "live" | "sample", dbStatus, recordCount, metadata?, error? }
 */
export async function fetchAllSchemes() {
  if (isSupabaseConfigured) {
    const { data, count, error } = await supabase
      .from("schemes")
      .select("*", { count: "exact" });

    if (error) {
      console.error("[Innova Sphere] Supabase fetchAllSchemes error:", error.message);
      return {
        schemes: taggedSampleData(),
        source: "sample",
        dbStatus: "error",
        recordCount: 0,
        error: error.message,
      };
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return {
        schemes: taggedSampleData(),
        source: "sample",
        dbStatus: "connected_empty",
        recordCount: 0,
        note: "public.schemes has 0 records; displaying verified local sample data as preview.",
      };
    }

    return {
      schemes: rows.map(normaliseRow),
      source: "live",
      dbStatus: "connected",
      recordCount: rows.length,
    };
  }

  return {
    schemes: taggedSampleData(),
    source: "sample",
    dbStatus: "not_configured",
    recordCount: 0,
    metadata: SAMPLE_DATA_METADATA,
  };
}

/**
 * Fetch a single scheme by its id column.
 */
export async function fetchSchemeById(schemeId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("schemes")
      .select("*")
      .eq("id", schemeId)
      .maybeSingle();

    if (error) {
      console.error("[Innova Sphere] Supabase fetchSchemeById error:", error.message);
      const local = SCHEMES_DATA.find((s) => s.id === schemeId);
      return local ? { ...local, _source: "sample" } : null;
    }

    return data ? normaliseRow(data) : null;
  }

  const scheme = SCHEMES_DATA.find((s) => s.id === schemeId);
  return scheme ? { ...scheme, _source: "sample" } : null;
}

/**
 * Search / filter schemes.
 * Returns { schemes, source: "live" | "sample", dbStatus, recordCount, error? }
 */
export async function searchSchemes({ query = "", category = "all", lang = "en" }) {
  const normalizedQuery = (query || "").trim().toLowerCase();

  let dbError = null;

  if (isSupabaseConfigured) {
    try {
      // First check if table has any records at all
      const { count: totalTableCount, error: countErr } = await supabase
        .from("schemes")
        .select("id", { count: "exact", head: true });

      if (countErr) {
        dbError = countErr.message;
      } else if ((totalTableCount ?? 0) === 0) {
        // Table exists and RLS allows querying, but has 0 records.
        // Fall back to sample schemes tagged as sample for UI preview.
        const filteredSample = SCHEMES_DATA.filter((scheme) => {
          if (category !== "all" && scheme.category !== category) return false;
          if (!normalizedQuery) return true;
          const langData = scheme[lang] || scheme.en;
          return (
            langData.name.toLowerCase().includes(normalizedQuery) ||
            langData.shortDescription.toLowerCase().includes(normalizedQuery) ||
            scheme.code.toLowerCase().includes(normalizedQuery) ||
            scheme.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
          );
        });

        return {
          schemes: filteredSample.map((s) => ({ ...s, _source: "sample" })),
          source: "sample",
          dbStatus: "connected_empty",
          recordCount: 0,
        };
      } else {
        // Table has live records! Query Supabase directly
        let q = supabase.from("schemes").select("*");

        if (category !== "all") {
          q = q.eq("category", category);
        }

        if (normalizedQuery) {
          q = q.or(
            [
              `name.ilike.%${normalizedQuery}%`,
              `name_te.ilike.%${normalizedQuery}%`,
              `summary.ilike.%${normalizedQuery}%`,
              `slug.ilike.%${normalizedQuery}%`,
            ].join(",")
          );
        }

        q = q.order("name", { ascending: true });

        const { data, error } = await q;

        if (error) {
          console.error("[Innova Sphere] Supabase searchSchemes error:", error.message);
          dbError = error.message;
        } else {
          return {
            schemes: (data ?? []).map(normaliseRow),
            source: "live",
            dbStatus: "connected",
            recordCount: data?.length ?? 0,
          };
        }
      }
    } catch (err) {
      console.error("[Innova Sphere] Unexpected error during Supabase search:", err);
      dbError = err?.message || String(err);
    }
  }

  // ── Local sample fallback (when not configured or query error) ──
  const results = SCHEMES_DATA.filter((scheme) => {
    if (category !== "all" && scheme.category !== category) return false;
    if (!normalizedQuery) return true;

    const langData = scheme[lang] || scheme.en;
    return (
      langData.name.toLowerCase().includes(normalizedQuery) ||
      langData.shortDescription.toLowerCase().includes(normalizedQuery) ||
      scheme.code.toLowerCase().includes(normalizedQuery) ||
      scheme.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
      langData.benefits.some((b) => b.toLowerCase().includes(normalizedQuery)) ||
      langData.eligibility.some((e) => e.toLowerCase().includes(normalizedQuery)) ||
      langData.requiredDocuments.some((d) => d.toLowerCase().includes(normalizedQuery))
    );
  });

  return {
    schemes: results.map((s) => ({ ...s, _source: "sample" })),
    source: "sample",
    dbStatus: dbError ? "error" : "not_configured",
    recordCount: 0,
    ...(dbError ? { error: dbError } : {}),
  };
}

// ─── Assistant (Database-Backed & Conversational) ───────────────────────────

/**
 * Clean and unescape markdown formatting from strings.
 */
function cleanText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\(\*|_|#|\.|-|\[|\])/g, "$1")
    .trim();
}

// ── Scheme matching (evidence-gated) ────────────────────────────────────────────────────

/**
 * Strong agriculture context. A generic scheme word ("insurance", "credit
 * card", "loan", "soil", …) only resolves to a scheme when one of these is
 * also present — this stops unrelated text like "my car insurance expired" or
 * "I have a credit card bill" from confidently matching a farmer scheme.
 */
const STRONG_AGRIC_RE =
  /\bkisan\b|\bfarmer\w*\b|\bfarming\b|\bagricultur\w*\b|\bcultivat\w*\b|\bcrop\w*\b|\bharvest\w*\b|\bsow\w*\b|\bsoil\b|\bfertili[sz]\w*\b|\bpesticide\w*\b|\bpatta\b|\bland[\s-]?record\w*\b|\blandhold\w*\b|\brainfall\b|\brythu\b|\braitu\b|\bnela\b|\bpanta\b|రైతు|పంట|వ్యవసాయ|భూమి|నేల|ఎరువు|సాగు/iu;

/**
 * Per-scheme matchers. `strong` (explicit scheme identifiers) is sufficient on
 * its own. `generic` (broad topic words) only counts when STRONG_AGRIC_RE is
 * also present; `translit` (Romanised Telugu spellings) counts with agriculture
 * context. KCC and PACS have separate keyword sets so they no longer tie on the
 * same phrase ("credit card" previously matched both and PACS won by order).
 */
const SCHEME_MATCHERS = {
  "pm-kisan": {
    strong: /pm[\s-]?kisan|pmkisan|kisan[\s-]?samman|samman[\s-]?nidhi|\b6[\s,]?000\b|పీఎం[\s-]?కిసాన్|పీఎంఎఫ్|కిసాన్[\s-]?సమ్మాన్/iu,
    generic: /income[\s-]?support|direct[\s-]?benefit|rythu[\s-]?bharos\w*|pattadar|రైతు[\s-]?బంధు|పట్టాదారు|ఆదాయ[\s-]?మద్దతు/iu,
  },
  pmfby: {
    strong: /pmfby|fasal[\s-]?bima|crop[\s-]?insurance|panta[\s-]?(?:bima|bheema)|bheema|ఫసల్[\s-]?బీమా|పంట[\s-]?బీమా/iu,
    generic: /\binsurance\b|\bbima\b|weather[\s-]?damage|drought|flood|crop[\s-]?loss|నష్టం|కరువు|వరదలు|వరి[\s-]?బీమా/iu,
    translit: /\bbheema\b/iu,
  },
  "kisan-credit-card": {
    strong: /\bkcc\b|kisan[\s-]?credit[\s-]?card|క్రెడిట్[\s-]?కార్డు|కిసాన్[\s-]?క్రెడిట్/iu,
    generic: /\bcrop[\s-]?loan\b|\bcredit[\s-]?card\b|\brunam\b|రుణం|పంట[\s-]?రుణం/iu,
    translit: /\b(?:rythu|raitu|raithu)[\s-]?runam\b|\brunam\b/iu,
  },
  "pacs-coop-credit": {
    strong: /\bpacs\b|cooperative[\s-]?(?:credit|loan|bank|society)|సహకార/iu,
    generic: /cooperative|storage|fertiliz|fertili[sz]|గిడ్డంగి|ఎరువు|సహకారి/iu,
    translit: /\bsahakara\b/iu,
  },
  "soil-health-card": {
    strong: /soil[\s-]?health[\s-]?card|soil[\s-]?card|నేల[\s-]?ఆరోగ్య|సాయిల్[\s-]?హెల్త్/iu,
    generic: /\bsoil\b|soil[\s-]?test|fertilizer[\s-]?test|నేల|సాయిల్/iu,
    translit: /\bnela[\s-]?pariksham\b|\bnela[\s-]?arogyam\b|\bbhoomi[\s-]?pariksham\b/iu,
  },
};

/**
 * Match a user message to the best scheme in the dataset.
 *
 * Evidence-gated: a scheme is returned only when its explicit identifier (name,
 * code, strong phrase) is present, OR when a generic topic word is present
 * together with strong agriculture context. Unrelated text that merely shares a
 * generic word ("insurance", "credit card", "income") returns null so the
 * caller can clarify or answer off-topic instead of showing a random card.
 *
 * Accepts an optional hint slug to bias scoring when the caller already knows
 * the likely scheme (e.g. from conversation history). Exported for unit tests.
 */
export function findBestSchemeMatch(text, schemes, lang = "en", hintSlug = null) {
  const t = String(text || "").toLowerCase();
  const agriContext = STRONG_AGRIC_RE.test(t);

  let best = null;
  let bestScore = 0;

  for (const scheme of schemes) {
    const id = (scheme.id || "").toLowerCase();
    const matcher = SCHEME_MATCHERS[id];
    if (!matcher) continue;

    const langData = scheme[lang] || scheme.en;
    let score = 0;

    if (hintSlug && id === hintSlug) score += 5;
    if (matcher.strong.test(t)) score += 100;
    if (matcher.translit && agriContext && matcher.translit.test(t)) score += 80;

    // Exact code / full-name mention is strong evidence.
    const code = (scheme.code || "").toLowerCase();
    if (code && t.includes(code)) score += 95;
    if (langData?.name && langData.name.length > 6 && t.includes(langData.name.toLowerCase())) score += 95;

    // Generic topic words only count with agriculture context (evidence gate).
    if (agriContext && matcher.generic.test(t)) score += 25;

    if (score > bestScore) {
      bestScore = score;
      best = scheme;
    }
  }

  return bestScore > 0 ? best : null;
}

/**
 * Handle PM-KISAN interactive eligibility screening one question at a time.
 *
 * Answer parsing is delegated to the shared `classifyEligibilityAnswer` guard so
 * ambiguous replies ("I don't know", "maybe") re-ask instead of producing a
 * false determination. `preAnswer` may carry a caller-classified answer.
 */
function handlePmkisanEligibility(userMessage, step, lang = "en", scheme, preAnswer = null) {
  const norm = (userMessage || "").trim().toLowerCase();
  // Shared, ambiguity-aware answer classification (re-asks on unclear replies).
  const answer = preAnswer ?? classifyEligibilityAnswer(norm, step);

  // Step 1: Initial invocation -> Ask Question 1 (Land Ownership)
  if (!step || step === "start") {
    const msgEn = [
      "### Preliminary Eligibility Check: PM-KISAN",
      "",
      "This application provides **preliminary guidance only**, not an official eligibility determination. Official enrollment requires revenue verification and eKYC authentication.",
      "",
      "To check your eligibility step-by-step, please answer the first question:",
      "",
      "**1. Do you or your immediate family own cultivable agricultural land** with land records (Patta / 1-B / RoR) in your name?",
      "",
      "*(Please reply with **Yes** or **No**)*",
    ].join("\n");

    const msgTe = [
      "### ప్రాథమిక అర్హత తనిఖీ: పీఎం-కిసాన్",
      "",
      "ఈ అప్లికేషన్ **ప్రాథమిక సమాచార మార్గదర్శకత్వాన్ని మాత్రమే** అందిస్తుంది, ఇది తుది అధికారిక నిర్ణయం కాదు. అధికారిక నమోదుకు రెవెన్యూ పరిశీలన మరియు eKYC తప్పనిసరి.",
      "",
      "మీ అర్హతను పరిశీలించడానికి మొదటి ప్రశ్నకు సమాధానం ఇవ్వండి:",
      "",
      "**1. మీ పేరిట లేదా మీ కుటుంబ సభ్యుల పేరిట పట్టాదారు పాస్ పుస్తకం / 1-B / RoR కలిగిన సాగు భూమి ఉందా?**",
      "",
      "*(దయచేసి **అవును** లేదా **కాదు** అని తెలపండి)*",
    ].join("\n");

    return {
      status: "eligibility_question",
      message: lang === "te" ? msgTe : msgEn,
      eligibilityState: { schemeId: "pm-kisan", step: "land_ownership" },
      primaryScheme: scheme,
    };
  }

  // Step 2: Evaluating Land Ownership response
  if (step === "land_ownership") {
    if (answer === "no") {
      const msgEn = [
        "### Preliminary Assessment: Land Ownership Criterion",
        "",
        "Thank you for clarifying. According to official PM-KISAN operational guidelines, **ownership of cultivable agricultural land** in the farmer's name is a mandatory eligibility requirement.",
        "",
        "• **Preliminary Guidance:** You are likely not eligible for PM-KISAN direct cash assistance because landholding title in your name is required.",
        "• **Alternative Options:** Tenant cultivators may explore **Kisan Credit Card (KCC)** or **PMFBY (Crop Insurance)**, which provide credit and crop loss coverage to tenant and sharecropper farmers.",
        "",
        "*(Note: This application provides preliminary guidance based on official scheme rules, not an official administrative ruling.)*",
      ].join("\n");

      const msgTe = [
        "### ప్రాథమిక అంచనా: భూ యాజమాన్య నిబంధన",
        "",
        "సమాచారం అందించినందుకు ధన్యవాదాలు. అధికారిక పీఎం-కిసాన్ మార్గదర్శకాల ప్రకారం, దరఖాస్తుదారుడి పేరిట **సాగు భూమి యాజమాన్య హక్కులు** ఉండటం తప్పనిసరి.",
        "",
        "• **ప్రాథమిక మార్గదర్శకత్వం:** భూమి యాజమాన్యం లేకపోవడం వల్ల మీరు పీఎం-కిసాన్ పథకానికి అర్హులు కాకపోవచ్చు.",
        "• **ఇతర అవకాశాలు:** కౌలు రైతులు పంట రుణాలు మరియు బీమా కోసం **కిసాన్ క్రెడిట్ కార్డు (KCC)** లేదా **పీఎం ఫసల్ బీమా యోజన (PMFBY)** పథకాలను పరిశీలించవచ్చు.",
        "",
        "*(గమనిక: ఇది ప్రాథమిక సమాచార మార్గదర్శకత్వం మాత్రమే, అధికారిక నిర్ణయం కాదు.)*",
      ].join("\n");

      return {
        status: "eligibility_result",
        message: lang === "te" ? msgTe : msgEn,
        eligibilityState: null,
        primaryScheme: scheme,
      };
    }

    if (answer === "yes") {
      const msgEn = [
        "### Step 2: PM-KISAN Exclusion Criteria",
        "",
        "Understood. Since you have cultivable landholding, we must check if any statutory exclusion rules apply to you or your immediate family.",
        "",
        "**2. Do you or any member of your immediate family fall into any of these exclusion categories?**",
        "• Current or former constitutional post holders (Ministers, MPs, MLAs, Mayors, District Panchayat Chairpersons)",
        "• Serving or retired Government / PSU employees (excluding Group D / Multi-Tasking Staff)",
        "• Practicing professionals (Doctors, Engineers, Lawyers, Chartered Accountants, Architects)",
        "• Paid Income Tax in the last assessment year, or receiving a monthly pension of ₹10,000 or more (excluding Group D/MTS)",
        "",
        "*(Please reply with **None of these** or **Yes, an exclusion applies**)*",
      ].join("\n");

      const msgTe = [
        "### దశ 2: పీఎం-కిసాన్ మినహాయింపు నిబంధనలు",
        "",
        "సాగు భూమి ఉన్నట్లు నిర్ధారించినందుకు ధన్యవాదాలు. ఇప్పుడు కుటుంబానికి వర్తించే మినహాయింపు నిబంధనలను పరిశీలిద్దాం.",
        "",
        "**2. మీరు లేదా మీ కుటుంబంలో ఎవరైనా క్రింది వర్గాలలో ఉన్నారా?**",
        "• రాజ్యాంగ పదవులు నిర్వహించిన వారు (మంత్రులు, ఎంపీలు, ఎమ్మెల్యేలు మొదలైనవారు)",
        "• ప్రభుత్వ లేదా ప్రభుత్వ రంగ సంస్థల ఉద్యోగులు/పెన్షనర్లు (గ్రూప్-D / MTS మినహా)",
        "• ప్రాక్టీస్ చేస్తున్న నిపుణులు (డాక్టర్లు, ఇంజనీర్లు, లాయర్లు, చార్టర్డ్ అకౌంటెంట్లు)",
        "• గత ఆర్థిక సంవత్సరంలో ఆదాయపు పన్ను (Income Tax) చెల్లించిన వారు, లేదా నెలకు ₹10,000 పైగా పెన్షన్ పొందుతున్నవారు",
        "",
        "*(దయచేసి **ఎవరూ లేరు / వర్తించదు** లేదా **అవును, వర్తిస్తుంది** అని తెలపండి)*",
      ].join("\n");

      return {
        status: "eligibility_question",
        message: lang === "te" ? msgTe : msgEn,
        eligibilityState: { schemeId: "pm-kisan", step: "exclusions" },
        primaryScheme: scheme,
      };
    }

    // Ambiguous answer — ask without inferring
    const clarifyEn = [
      "I could not determine your answer from your response. To provide accurate guidance without making assumptions:",
      "",
      "**Do you or your immediate family own cultivable agricultural land?**",
      "",
      "Please reply clearly with **Yes** or **No**.",
    ].join("\n");

    const clarifyTe = [
      "మీ సమాధానం స్పష్టంగా లేదు. ఎలాంటి ఊహాగానాలు లేకుండా సరైన సమాచారం ఇవ్వడానికి:",
      "",
      "**మీ పేరిట లేదా మీ కుటుంబ సభ్యుల పేరిట సాగు భూమి ఉందా?**",
      "",
      "దయచేసి **అవును** లేదా **కాదు** అని స్పష్టంగా తెలపండి.",
    ].join("\n");

    return {
      status: "eligibility_question",
      message: lang === "te" ? clarifyTe : clarifyEn,
      eligibilityState: { schemeId: "pm-kisan", step: "land_ownership" },
      primaryScheme: scheme,
    };
  }

  // Step 3: Evaluating Exclusions response
  if (step === "exclusions") {
    if (answer === "applies") {
      const msgEn = [
        "### Preliminary Assessment: PM-KISAN Statutory Exclusion",
        "",
        "Thank you for providing this detail. Under official PM-KISAN guidelines, individuals or families meeting any of the exclusion criteria (such as income tax payers, serving/retired government officers, or constitutional post holders) are **statutorily excluded** from the scheme benefits.",
        "",
        "• **Preliminary Guidance:** You are likely not eligible for PM-KISAN financial assistance due to this statutory exclusion rule.",
        "",
        "*(Note: This application provides preliminary guidance based on official scheme rules, not an official administrative ruling.)*",
      ].join("\n");

      const msgTe = [
        "### ప్రాథమిక అంచనా: పీఎం-కిసాన్ మినహాయింపు నిబంధన",
        "",
        "వివరాలు తెలిపినందుకు ధన్యవాదాలు. పీఎం-కిసాన్ మార్గదర్శకాల ప్రకారం, ఆదాయపు పన్ను చెల్లింపుదారులు లేదా ప్రభుత్వ ఉద్యోగులు ఉన్న కుటుంబాలు ఈ పథకానికి **అనర్హులు**గా పరిగణించబడతాయి.",
        "",
        "• **ప్రాథమిక మార్గదర్శకత్వం:** మినహాయింపు నిబంధనల ప్రకారం మీరు పీఎం-కిసాన్ పథకానికి అర్హులు కాకపోవచ్చు.",
        "",
        "*(గమనిక: ఇది ప్రాథమిక సమాచార మార్గదర్శకత్వం మాత్రమే, అధికారిక నిర్ణయం కాదు.)*",
      ].join("\n");

      return {
        status: "eligibility_result",
        message: lang === "te" ? msgTe : msgEn,
        eligibilityState: null,
        primaryScheme: scheme,
      };
    }

    if (answer === "none") {
      const msgEn = [
        "### Preliminary Eligibility Assessment: PM-KISAN",
        "",
        "Based on the facts you supplied:",
        "1. You own cultivable agricultural land.",
        "2. None of the statutory exclusion criteria apply to your family.",
        "",
        "✅ **Preliminary Guidance:** You appear **preliminarily eligible** to register for PM-KISAN.",
        "",
        "📋 **Required Documents for Official Registration:**",
        "1. **Aadhaar Card** (Mandatory for biometric/OTP eKYC verification)",
        "2. **Land Ownership Records** (Patta / 1-B / RoR showing applicant name)",
        "3. **Aadhaar-seeded Active Bank Account** details (Bank IFSC & Account Number)",
        "4. **Aadhaar-linked Mobile Number** for OTP authentication",
        "",
        "⚠️ **Important Disclaimer:** This application provides preliminary guidance, not an official eligibility determination. Official sanction requires land record verification by your local Agriculture/Revenue authority and completion of mandatory eKYC on the official portal.",
      ].join("\n");

      const msgTe = [
        "### ప్రాథమిక అర్హత అంచనా: పీఎం-కిసాన్",
        "",
        "మీరు అందించిన సమాచారం ప్రకారం:",
        "1. మీకు సాగు భూమి యాజమాన్యం ఉంది.",
        "2. ఎటువంటి మినహాయింపు నిబంధనలు మీకు వర్తించవు.",
        "",
        "✅ **ప్రాథమిక మార్గదర్శకత్వం:** మీరు పీఎం-కిసాన్ పథకానికి **ప్రాథమికంగా అర్హులు**గా కనిపిస్తున్నారు.",
        "",
        "📋 **అవసరమైన పత్రాలు:**",
        "1. **ఆధార్ కార్డు** (eKYC కోసం తప్పనిసరి)",
        "2. **భూమి యాజమాన్య పత్రాలు** (పట్టాదారు పాస్ పుస్తకం / 1-B / RoR)",
        "3. **ఆధార్‌తో లింక్ అయిన బ్యాంక్ ఖాతా** వివరాలు",
        "4. **ఆధార్‌తో లింక్ అయిన మొబైల్ నంబర్**",
        "",
        "⚠️ **ముఖ్య గమనిక:** ఇది ప్రాథమిక సమాచార మార్గదర్శకత్వం మాత్రమే. తుది ఆమోదం మీ స్థానిక వ్యవసాయ/రెవెన్యూ అధికారుల రికార్డుల పరిశీలన మరియు అధికారిక పోర్టల్‌లో eKYC పూర్తి చేయడంపై ఆధారపడి ఉంటుంది.",
      ].join("\n");

      return {
        status: "eligibility_result",
        message: lang === "te" ? msgTe : msgEn,
        eligibilityState: null,
        primaryScheme: scheme,
      };
    }

    // Clarification needed
    const clarifyEn = [
      "Please clarify whether any of the listed exclusion criteria apply to your family.",
      "",
      "Reply with **None of these** if no exclusions apply, or **Yes** if an exclusion applies.",
    ].join("\n");

    const clarifyTe = [
      "దయచేసి పై మినహాయింపు నిబంధనలలో ఏదైనా మీకు వర్తిస్తుందో లేదో స్పష్టంగా తెలపండి.",
      "",
      "ఎవరూ లేకపోతే **ఎవరూ లేరు / వర్తించదు** అని, లేదా వర్తిస్తే **అవును** అని తెలపండి.",
    ].join("\n");

    return {
      status: "eligibility_question",
      message: lang === "te" ? clarifyTe : clarifyEn,
      eligibilityState: { schemeId: "pm-kisan", step: "exclusions" },
      primaryScheme: scheme,
    };
  }

  return null;
}

const CONVERSATIONAL_REPLY_KEYS = {
  [INTENT.GREETING]: "assistantGreeting",
  [INTENT.IDENTITY]: "assistantIdentity",
  [INTENT.THANKS]: "assistantThanks",
  [INTENT.FAREWELL]: "assistantFarewell",
  [INTENT.ACKNOWLEDGEMENT]: "assistantAck",
  [INTENT.CAPABILITIES]: "assistantCapabilities",
  [INTENT.HELP]: "assistantCapabilities",
};

/** Localised UI string with an English safety net. */
function localised(key, lang) {
  const dictionary = translations[lang] || translations.en;
  return dictionary[key] || translations.en[key] || "";
}

/**
 * Localised, scheme-free reply for greetings, identity, thanks, farewells and
 * acknowledgements. Deliberately carries no primaryScheme/matchedSchemes.
 */
function conversationalReply(intent, lang, eligibilityState = null) {
  return {
    status: "conversational",
    message: localised(CONVERSATIONAL_REPLY_KEYS[intent], lang),
    matchedSchemes: [],
    // Chit-chat keeps an active screening flow alive (Yes/No chips stay put).
    eligibilityState,
  };
}

/** Load all schemes once (live Supabase, else verified sample dataset). */
async function getAllSchemes() {
  let schemes = [];
  try {
    const res = await fetchAllSchemes();
    schemes = res.schemes || [];
  } catch (err) {
    console.error("[Innova Sphere] Error retrieving schemes for assistant:", err);
    schemes = [];
  }
  return schemes.length > 0 ? schemes : taggedSampleData();
}

/**
 * Query the verified scheme dataset via the conversational assistant.
 *
 * Parameters:
 *   - userMessage: the farmer's question
 *   - lang: "en" | "te"
 *   - context: optional conversational context { eligibilityState }
 */
export async function queryAssistant(userMessage, lang = "en", context = {}) {
  const text = cleanText(userMessage).toLowerCase();

  // Flow state is preserved across chit-chat and advanced/cleared otherwise.
  const keepState = context?.eligibilityState || null;
  const activeElig =
    context?.eligibilityState && context.eligibilityState.schemeId === "pm-kisan"
      ? context.eligibilityState
      : null;

  if (!text) {
    return {
      status: "empty",
      message:
        lang === "te"
          ? "దయచేసి మీ ప్రశ్నను నమోదు చేయండి."
          : "Please enter your question about government schemes.",
      matchedSchemes: [],
      eligibilityState: keepState,
    };
  }

  // 1. Fetch schemes once — needed by eligibility, resolution and fallback paths.
  const allSchemes = await getAllSchemes();

  // 2. DETERMINISTIC ELIGIBILITY ANSWER (highest priority while a flow is active).
  //    Handled rule-based, never by Gemini.
  if (activeElig) {
    const stripped = stripLeadingChitChat(text); // "hello yes" -> "yes"
    const answer = classifyEligibilityAnswer(stripped, activeElig.step);
    const pmKisanScheme = allSchemes.find((s) => s.id === "pm-kisan");

    if (answer) {
      return handlePmkisanEligibility(stripped, activeElig.step, lang, pmKisanScheme, answer);
    }

    // Not a recognized answer. Chit-chat keeps the flow; a scheme/topic question
    // is answered and ends the flow (handled below); anything else is an
    // unrecognized reply to the current question → re-ask it.
    const isChat = detectConversationalIntent(text);
    const isSchemeQuestion =
      Boolean(findBestSchemeMatch(text, allSchemes, lang)) ||
      isContextualFollowUp(text) ||
      isEligibilityDecisionQuery(text);
    if (!isChat && !isSchemeQuestion) {
      return handlePmkisanEligibility(text, activeElig.step, lang, pmKisanScheme);
    }
  }

  // 3. Chit-chat gate — greetings, identity, thanks, farewells and
  //    acknowledgements are answered here, never scheme-matched, and carry the
  //    active flow state forward (so the Yes/No chips stay available).
  const conversationalIntent = detectConversationalIntent(text);
  if (conversationalIntent) {
    return conversationalReply(conversationalIntent, lang, keepState);
  }

  // 4. Resolve the scheme for THIS message: explicit keywords, or a genuine
  //    contextual follow-up that carries the previous scheme forward. During an
  //    active flow, the flow's scheme is the fallback context so a mid-flow
  //    follow-up ("what documents do I need?") resolves to PM-KISAN.
  const followUp = isContextualFollowUp(text);
  const contextSchemeId = context?.lastSchemeId || (activeElig ? activeElig.schemeId : null);
  let topMatch = findBestSchemeMatch(text, allSchemes, lang);
  if (
    shouldInheritScheme({
      text,
      hasSchemeMatch: Boolean(topMatch),
      lastSchemeId: contextSchemeId,
    })
  ) {
    topMatch = allSchemes.find((s) => s.id === contextSchemeId) || null;
  }

  // 5. Start the eligibility flow on an explicit first-person decision query
  //    ("Am I eligible for PM-KISAN?", "nenu eligible aa?"). Informational
  //    queries ("What are the eligibility criteria?", "can I apply?") fall
  //    through to the info paths instead.
  if (isEligibilityDecisionQuery(text) && topMatch && topMatch.id === "pm-kisan") {
    return handlePmkisanEligibility(text, "start", lang, topMatch);
  }

  // 3. TRY GEMINI via /api/chat — primary path
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessage.trim().slice(0, 500),
        lang,
        eligibilityState: context?.eligibilityState || null,
        conversationHistory: (context?.conversationHistory || []).slice(-6),
      }),
    });

    if (response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null; // invalid JSON → fall through to rule-based
      }
      const serverMessage = typeof data?.message === "string" ? data.message.trim() : "";
      if (serverMessage) {
        // The card always comes from the scheme THIS message resolved to. A
        // server card for a different scheme (or none) is ignored, so an
        // unrelated query can never display a mismatched card.
        const serverScheme =
          topMatch && data.primaryScheme && data.primaryScheme.id === topMatch.id
            ? data.primaryScheme
            : topMatch;
        return {
          status: data.status || "ok",
          message: serverMessage,
          usedGemini: true,
          primaryScheme: serverScheme || null,
          // Any resolved answer ends an active screening flow.
          eligibilityState: null,
          matchedSchemes: serverScheme ? [serverScheme] : [],
        };
      }
      // Empty / non-string message → treat as unavailable, use rule-based fallback.
    }

    // 503 = Gemini unavailable (rate limit, key not set, overload) — fall through to rule-based
    if (response.status !== 503) {
      console.warn("[Innova Sphere] /api/chat returned unexpected status:", response.status);
    }
  } catch {
    // Network error (server not running) — fall through silently to rule-based
  }

  // RULE-BASED FALLBACK — runs when Gemini returns 503 or is unavailable

  // Detect intent (Documents and eligibility have higher specificity than benefits)
  const isAskingDocs = /document|documents|paper|papers|aadhaar|passbook|proof|patra(?:lu|m)|dokument|పత్రం|పత్రాలు|కాగితం|కాగితాలు|ఆధార్|పాస్ పుస్తకం/i.test(text);
  const isAskingElig = /eligible|eligibility|who can|qualify|rules|criteria|arhat\w*|అర్హత|అర్హులు|అర్హుడినా|అర్హుడనా|అర్హురాలినా|నిబంధన/i.test(text);
  const isAskingApply = /apply|step|steps|how to|registration|register|portal|website|darakhast(?:u|h)|దరఖాస్తు|ఎలా|నమోదు|పోర్టల్/i.test(text);
  const isAskingBenefit = /(benefit|benefits|money|amount|cash|subsidy|prayojan(?:alu|u)|వడ్డీ|రూపాయలు|డబ్బులు|ప్రయోజనం|ప్రయోజనాలు|లాభం)/i.test(text);

  // 6. Nothing resolved to a scheme. Ask a clarifying question for farmer
  //    topics; otherwise answer transparently without inventing a match.
  if (!topMatch) {
    const wantsFarmerHelp = followUp || isLikelyFarmerTopic(text);
    return {
      status: wantsFarmerHelp ? "clarify" : "off_topic",
      message: wantsFarmerHelp
        ? localised("assistantClarify", lang)
        : localised("assistantOffTopic", lang),
      matchedSchemes: [],
      // A topic change (clarify / off-topic) ends an active screening flow.
      eligibilityState: null,
    };
  }

  // 7. Generate verified, accurate source-based response
  const langData = topMatch[lang] || topMatch.en;

  // Query: What documents are required?
  if (isAskingDocs) {
    const docs = langData.requiredDocuments || [];
    if (docs.length === 0) {
      return {
        status: "found",
        message:
          lang === "te"
            ? `**${langData.name}** కొరకు అవసరమైన పత్రాల వివరాలు ధృవీకరించిన రికార్డులో నమోదు కాలేదు. దయచేసి అధికారిక పోర్టల్‌ను చూడండి.`
            : `Required document information for **${langData.name}** is not specified in the verified record. Please consult the official portal.`,
        primaryScheme: topMatch,
        matchedSchemes: [topMatch],
      };
    }

    const docItems = docs.map((doc, idx) => `${idx + 1}. ${cleanText(doc)}`).join("\n");

    const docsMsgEn = [
      `### Required Documents for ${langData.name}`,
      "",
      `To apply or register for **${langData.name}**, the following verified documents are required:`,
      "",
      docItems,
    ].join("\n");

    const docsMsgTe = [
      `### ${langData.name} కొరకు అవసరమైన పత్రాలు`,
      "",
      `**${langData.name}** కింద దరఖాస్తు చేసుకోవడానికి క్రింది ధృవీకరించిన పత్రాలు అవసరం:`,
      "",
      docItems,
    ].join("\n");

    return {
      status: "found",
      message: lang === "te" ? docsMsgTe : docsMsgEn,
      primaryScheme: topMatch,
      matchedSchemes: [topMatch],
    };
  }

  // Query: General Eligibility criteria (for schemes other than PM-KISAN interactive flow)
  if (isAskingElig) {
    const eligList = langData.eligibility || [];
    if (eligList.length === 0) {
      return {
        status: "found",
        message:
          lang === "te"
            ? `**${langData.name}** కొరకు అర్హత వివరాలు ధృవీకరించిన రికార్డులో అందుబాటులో లేవు.`
            : `Eligibility criteria for **${langData.name}** are not available in the verified record.`,
        primaryScheme: topMatch,
        matchedSchemes: [topMatch],
      };
    }

    const eligItems = eligList.map((e) => `• ${cleanText(e)}`).join("\n");

    const eligMsgEn = [
      `### Eligibility Guidelines for ${langData.name}`,
      "",
      `Official eligibility criteria based on government guidelines:`,
      "",
      eligItems,
      "",
      "*(Note: Preliminary advisory guidance only. Official determination requires departmental review.)*",
    ].join("\n");

    const eligMsgTe = [
      `### ${langData.name} అర్హత నిబంధనలు`,
      "",
      `ప్రభుత్వ మార్గదర్శకాల ప్రకారం అధికారిక అర్హత నిబంధనలు:`,
      "",
      eligItems,
      "",
      "*(గమనిక: ఇది ప్రాథమిక సమాచారం మాత్రమే. అధికారిక నిర్ణయం కోసం సంబంధిత విభాగాన్ని సంప్రదించండి.)*",
    ].join("\n");

    return {
      status: "found",
      message: lang === "te" ? eligMsgTe : eligMsgEn,
      primaryScheme: topMatch,
      matchedSchemes: [topMatch],
    };
  }

  // Query: Application Steps
  if (isAskingApply) {
    const steps = langData.applicationSteps || [];
    if (steps.length === 0) {
      return {
        status: "found",
        message:
          lang === "te"
            ? `**${langData.name}** దరఖాస్తు విధానం వివరాలు ధృవీకరించిన రికార్డులో అందుబాటులో లేవు.`
            : `Application steps for **${langData.name}** are not available in the verified record.`,
        primaryScheme: topMatch,
        matchedSchemes: [topMatch],
      };
    }

    const stepItems = steps.map((s, idx) => `${idx + 1}. ${cleanText(s)}`).join("\n");

    const applyMsgEn = [
      `### How to Apply: ${langData.name}`,
      "",
      stepItems,
    ].join("\n");

    const applyMsgTe = [
      `### దరఖాస్తు విధానం: ${langData.name}`,
      "",
      stepItems,
    ].join("\n");

    return {
      status: "found",
      message: lang === "te" ? applyMsgTe : applyMsgEn,
      primaryScheme: topMatch,
      matchedSchemes: [topMatch],
    };
  }

  // Query: Benefits
  if (isAskingBenefit) {
    const benefits = langData.benefits || [];
    if (benefits.length === 0) {
      return {
        status: "found",
        message:
          lang === "te"
            ? `**${langData.name}** ప్రయోజనాల వివరాలు ధృవీకరించిన రికార్డులో నమోదు కాలేదు.`
            : `Benefit details for **${langData.name}** are not available in the verified record.`,
        primaryScheme: topMatch,
        matchedSchemes: [topMatch],
      };
    }

    const benefitItems = benefits.map((b) => `• ${cleanText(b)}`).join("\n");

    const benefitMsgEn = [
      `### Benefits of ${langData.name}`,
      "",
      benefitItems,
    ].join("\n");

    const benefitMsgTe = [
      `### ${langData.name} యొక్క ప్రయోజనాలు`,
      "",
      benefitItems,
    ].join("\n");

    return {
      status: "found",
      message: lang === "te" ? benefitMsgTe : benefitMsgEn,
      primaryScheme: topMatch,
      matchedSchemes: [topMatch],
    };
  }

  // Query: General Overview (e.g. "Tell me about PM-KISAN")
  const benefitsList = (langData.benefits || []).slice(0, 3).map((b) => `• ${cleanText(b)}`).join("\n");
  const eligSummary = (langData.eligibility || []).slice(0, 3).map((e) => `• ${cleanText(e)}`).join("\n");

  const overviewEn = [
    `### ${langData.name}`,
    "",
    cleanText(langData.shortDescription) || "Verified government welfare scheme for farmers.",
    "",
    "### Core Benefits:",
    benefitsList || "• Information not available in verified record.",
    "",
    "### Key Eligibility:",
    eligSummary || "• Information not available in verified record.",
  ].join("\n");

  const overviewTe = [
    `### ${langData.name}`,
    "",
    cleanText(langData.shortDescription) || "రైతుల సంక్షేమం కోసం ప్రభుత్వం అందించే పథకం.",
    "",
    "### ముఖ్య ప్రయోజనాలు:",
    benefitsList || "• వివరాలు అందుబాటులో లేవు.",
    "",
    "### ముఖ్య అర్హతలు:",
    eligSummary || "• వివరాలు అందుబాటులో లేవు.",
  ].join("\n");

  return {
    status: "found",
    message: lang === "te" ? overviewTe : overviewEn,
    primaryScheme: topMatch,
    matchedSchemes: [topMatch],
  };
}
