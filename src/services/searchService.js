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
    // Optional: only present when the table has an alias column. Never assumed.
    aliases: toArray(row.aliases || row.aliases_en || row.alias),
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

// ── Matching primitives ─────────────────────────────────────────────────────

/** Zero-width characters, e.g. the ZWNJ inside "కిసాన్‌కు". */
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

/**
 * Normalise text for matching: lowercase, strip zero-width characters, and
 * reduce every run of punctuation/symbols to a single space. Keeps Latin and
 * Telugu letters intact — \p{M} is required because Telugu vowel signs and
 * other combining marks are marks, not letters; dropping them would shatter
 * every Telugu word into single characters.
 */
function normaliseForMatch(value) {
  return String(value || "")
    .replace(ZERO_WIDTH_RE, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

/** Function / structural words that carry no scheme identity. */
const MATCH_STOPWORDS = new Set([
  // English
  "a", "an", "the", "of", "for", "and", "or", "to", "in", "on", "at", "by",
  "with", "from", "is", "are", "am", "was", "were", "be", "my", "our", "me",
  "i", "we", "you", "your", "it", "its", "this", "that", "these", "those",
  "what", "which", "who", "whom", "whose", "how", "why", "when", "where",
  "tell", "give", "show", "explain", "about", "please", "can", "could", "would",
  "should", "do", "does", "did", "want", "need", "know", "more", "details",
  "detail", "information", "info", "full", "complete", "scheme", "schemes",
  "yojana", "yojna", "government", "govt", "official",
  // Telugu
  "గురించి", "ఏమిటి", "ఏమి", "చెప్పండి", "చెప్పు", "దయచేసి", "కొరకు", "మరియు",
  "ఇంకా", "నేను", "మీ", "మీరు", "ఈ", "ఆ", "ఇది", "అది", "ఎలా", "లో", "ఏ", "ఏది",
  "వివరాలు", "వివరంగా", "పథకం", "పథకాలు", "ప్రభుత్వ", "అధికారిక",
]);

/**
 * Symmetric, tolerant token comparison: exact equality, or one token being a
 * prefix of the other with a comparable length. The prefix rule absorbs Telugu
 * case endings ("కిసాన్‌కు" → "కిసాన్") and English plurals ("farmers").
 */
function tokenMatches(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const [shortToken, longToken] = a.length <= b.length ? [a, b] : [b, a];
  return longToken.startsWith(shortToken) && shortToken.length / longToken.length >= 0.6;
}

/**
 * Romanised Telugu → Telugu script. A language resource (not scheme data): it
 * lets a spoken query such as "panta bima" reach records that only carry
 * Telugu names, and vice versa.
 */
const ROMANISED_TELUGU = {
  panta: "పంట",
  bima: "బీమా",
  bheema: "బీమా",
  beema: "బీమా",
  fasal: "ఫసల్",
  nela: "నేల",
  bhoomi: "భూమి",
  bhumi: "భూమి",
  pariksham: "పరీక్ష",
  arogyam: "ఆరోగ్యం",
  runam: "రుణం",
  runalu: "రుణాలు",
  rythu: "రైతు",
  raitu: "రైతు",
  raithu: "రైతు",
  sahakara: "సహకార",
  pattadar: "పట్టాదారు",
  pattadhar: "పట్టాదారు",
  kisan: "కిసాన్",
  kisaan: "కిసాన్",
  samman: "సమ్మాన్",
  nidhi: "నిధి",
  bharosa: "భరోసా",
};

/** Spoken abbreviations that stand for several words. */
const TELUGU_ABBREVIATIONS = {
  "పీఎం": ["ప్రధాన", "మంత్రి"],
};

/**
 * Concept lexicon — scheme-agnostic topic words, including Telugu and
 * transliterations. A concept only ever adds *weak* evidence, and only when a
 * record claims the same concept through its own name, slug, code or tags. No
 * scheme id, name or alias is listed here.
 */
const CONCEPTS = {
  income_support: ["income support", "direct benefit", "samman nidhi", "కిసాన్ సమ్మాన్", "సమ్మాన్ నిధి"],
  crop_insurance: ["insurance", "bima", "bheema", "fasal", "బీమా", "ఫసల్", "పంట బీమా", "crop loss", "drought", "flood", "నష్టం", "కరువు", "వరదలు"],
  credit_card: ["credit card", "kcc", "క్రెడిట్ కార్డు", "కిసాన్ క్రెడిట్"],
  credit: ["loan", "credit", "runam", "రుణం", "రుణ"],
  cooperative: ["cooperative", "pacs", "sahakara", "సహకార", "గిడ్డంగి", "warehouse", "storage"],
  soil: ["soil", "nela", "నేల", "సాయిల్", "pariksham", "అరోగ్యం", "ఆరోగ్యం"],
};

/** Concept id → set of its word tokens (built once). */
const CONCEPT_TOKENS = Object.fromEntries(
  Object.entries(CONCEPTS).map(([conceptId, phrases]) => [
    conceptId,
    new Set(phrases.flatMap((phrase) => normaliseForMatch(phrase).split(" ")).filter(Boolean)),
  ])
);

/**
 * Consumer-finance words. "credit", "card" and "loan" describe a bank product
 * before they describe a farm scheme, so on their own they must never select a
 * record — that is what the agriculture-context gate is for.
 */
const CONSUMER_FINANCE_TOKENS = new Set([
  ...CONCEPT_TOKENS.credit,
  ...CONCEPT_TOKENS.credit_card,
]);

// ── Query / record preparation ──────────────────────────────────────────────

/** True when a phrase from the concept lexicon appears in the query. */
function phraseInQuery(query, phrase) {
  const normalised = normaliseForMatch(phrase);
  if (!normalised) return false;
  if (normalised.includes(" ")) return query.text.includes(normalised);
  return query.tokens.some((token) => tokenMatches(token, normalised));
}

/**
 * Prepare the user's message once: normalised text, expanded token sequence
 * (transliterations and abbreviations), a compact form for code matching, and
 * the concepts the message asks about.
 */
function buildQuery(text) {
  const normalised = normaliseForMatch(text);
  const rawTokens = normalised ? normalised.split(" ") : [];

  // Two parallel token sequences, both keeping word order intact so that
  // consecutive name words can still be matched as a run:
  //   sequence      — original words, with spoken abbreviations expanded in place
  //   transliterated — Latin words mapped to Telugu script in place
  const sequence = [];
  const transliterated = [];
  for (const token of rawTokens) {
    const expansion = TELUGU_ABBREVIATIONS[token];
    if (expansion) {
      sequence.push(...expansion);
      transliterated.push(...expansion);
      continue;
    }
    sequence.push(token);
    transliterated.push(ROMANISED_TELUGU[token] || token);
  }

  const query = {
    text: normalised,
    sequence,
    transliterated,
    tokens: [...new Set([...sequence, ...transliterated])],
    compact: normalised.replace(/ /g, ""),
    askedConcepts: new Set(),
  };

  for (const [conceptId, phrases] of Object.entries(CONCEPTS)) {
    if (phrases.some((phrase) => phraseInQuery(query, phrase))) query.askedConcepts.add(conceptId);
  }

  return query;
}

/**
 * Longest run of consecutive query tokens that matches consecutive identity
 * tokens, plus the identity tokens it matched.
 */
function longestRun(identityTokens, queryTokens) {
  let best = { length: 0, tokens: [] };
  for (let i = 0; i < identityTokens.length; i++) {
    for (let j = 0; j < queryTokens.length; j++) {
      let k = 0;
      while (
        i + k < identityTokens.length &&
        j + k < queryTokens.length &&
        tokenMatches(queryTokens[j + k], identityTokens[i + k])
      ) {
        k += 1;
      }
      if (k > best.length) best = { length: k, tokens: identityTokens.slice(i, i + k) };
    }
  }
  return best;
}

/**
 * Build the searchable identity of one scheme from its own record fields: code,
 * slug, English/Telugu names, optional aliases and tags. Any field that is
 * absent is simply skipped — nothing is assumed about the schema.
 */
function buildSchemeIdentity(scheme, lang = "en") {
  const names = [];
  const pushName = (value) => {
    if (typeof value === "string" && value.trim()) names.push(value.trim());
  };

  // Prefer the active language, but always index both names for recall.
  for (const key of lang === "te" ? ["te", "en"] : ["en", "te"]) pushName(scheme?.[key]?.name);
  pushName(scheme?.name);
  pushName(scheme?.name_te);

  // Aliases are optional in the schema; use them only when the row provides them.
  const aliases = [];
  for (const source of [scheme?.aliases, scheme?.en?.aliases, scheme?.te?.aliases]) {
    if (!Array.isArray(source)) continue;
    for (const alias of source) {
      if (typeof alias !== "string" || !alias.trim()) continue;
      aliases.push(alias.trim());
      pushName(alias);
    }
  }

  // Codes, slug and aliases all behave as short identifiers ("kcc", "pmjay").
  const codes = [];
  for (const value of [scheme?.code, scheme?.slug, scheme?.id, ...aliases]) {
    const normalised = normaliseForMatch(value);
    if (normalised) codes.push(normalised);
  }

  const tagPhrases = (Array.isArray(scheme?.tags) ? scheme.tags : [])
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) => normaliseForMatch(tag.replace(/[_-]+/g, " ")));

  const slug = typeof scheme?.slug === "string" ? scheme.slug : typeof scheme?.id === "string" ? scheme.id : "";
  const slugPhrase = slug.includes("-") ? normaliseForMatch(slug.replace(/-+/g, " ")) : "";

  // Tags are deliberately NOT name phrases: a tag such as "income" must never
  // behave like a scheme name. Tags only contribute the weaker, gated tag score.
  const phrases = [
    ...new Set([...names, ...codes, slugPhrase].map(normaliseForMatch).filter(Boolean)),
  ];

  // Each name is indexed separately: an English query is compared with the
  // English name and a Telugu query with the Telugu name, so one script never
  // dilutes the other's overlap ratio.
  const nameTokenSets = names.map((name) => {
    const tokens = [...new Set(normaliseForMatch(name).split(" ").filter(Boolean))];
    const significant = tokens.filter((token) => !MATCH_STOPWORDS.has(token) && token.length >= 2);
    return {
      tokens,
      significant,
      // The head word of a name is the proper-noun-like part ("Ayushman" in
      // "Ayushman Bharat …"); only that may identify a scheme on its own.
      head: significant[0] || null,
    };
  });

  const allTokens = [...new Set(phrases.flatMap((phrase) => phrase.split(" ")).filter(Boolean))];

  return { scheme, phrases, codes, nameTokenSets, allTokens, tagPhrases };
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const NAME_EXACT_SCORE = 150;      // query is exactly the scheme name
const NAME_IN_QUERY_SCORE = 130;   // the full name appears inside the query
const RUN_BASE_SCORE = 90;         // consecutive name words (2+), +10 each
const CODE_SCORE = 110;            // code / slug / compact code ("pmkisan")
const NAME_FULL_TOKENS_SCORE = 85; // every significant name word present
const NAME_MOST_TOKENS_SCORE = 55; // ≥60% of significant name words present
const PARTIAL_TOKEN_SCORE = 25;    // weaker partial overlap
const TAG_SCORE = 35;              // a record tag appears in the query
const CONCEPT_SCORE = 25;          // topic concept claimed by the record
const HINT_BONUS = 5;

/** Ties below this score are treated as ambiguous and resolve to no scheme. */
const AMBIGUITY_FLOOR = NAME_FULL_TOKENS_SCORE;

/** True when the record claims a concept through its own identity text. */
function identityClaimsConcept(identity, conceptId) {
  const synonyms = CONCEPT_TOKENS[conceptId];
  if (!synonyms || synonyms.size === 0) return false;
  for (const token of identity.allTokens) {
    for (const synonym of synonyms) {
      if (tokenMatches(token, synonym)) return true;
    }
  }
  return false;
}

/** Score one scheme against one query. Returns 0 when there is no evidence. */
function scoreSchemeIdentity(query, identity, agriContext, documentFrequency, hintSlug) {
  let score = 0;

  // 1. Name / slug / tag phrases: exact name, name inside query, then runs.
  for (const phrase of identity.phrases) {
    if (query.text === phrase) {
      score = Math.max(score, NAME_EXACT_SCORE);
      continue;
    }
    if (phrase.length >= 6 && query.text.includes(phrase)) {
      score = Math.max(score, NAME_IN_QUERY_SCORE);
      continue;
    }

    const phraseTokens = phrase.split(" ");
    if (phraseTokens.length < 2) continue;

    const originalRun = longestRun(phraseTokens, query.sequence);
    const transliteratedRun = longestRun(phraseTokens, query.transliterated);
    const run = transliteratedRun.length > originalRun.length ? transliteratedRun : originalRun;
    if (run.length < 2) continue;

    // "credit card" alone describes a bank product, not a farm scheme.
    const genericOnly = run.tokens.every((token) => CONSUMER_FINANCE_TOKENS.has(token));
    if (genericOnly && !agriContext) continue;

    // "Pradhan Mantri" opens several unrelated schemes, so a run of only shared
    // words is not identifying unless it is long enough to be specific.
    const distinctiveRun = run.tokens.some((token) => documentFrequency.get(token) === 1);
    if (run.length < 3 && !distinctiveRun) continue;

    score = Math.max(score, Math.min(NAME_IN_QUERY_SCORE, RUN_BASE_SCORE + run.length * 10));
  }

  // 2. Codes and slugs: whole tokens, or a compact run ("pmkisan", "pmjay").
  for (const code of identity.codes) {
    const parts = code.split(" ");
    const compact = code.replace(/ /g, "");
    const genericOnly = parts.every((part) => CONSUMER_FINANCE_TOKENS.has(part));

    if (parts.every((part) => query.tokens.some((token) => tokenMatches(token, part)))) {
      if (agriContext || !genericOnly) score = Math.max(score, CODE_SCORE);
    } else if (compact.length >= 5 && query.compact.includes(compact)) {
      if (agriContext || !genericOnly) score = Math.max(score, CODE_SCORE);
    }
  }

  // 3. Name-token overlap, scored per name. Shared words ("kisan" in several
  //    records) are weak evidence; a word unique to one record is meaningful.
  for (const nameTokens of identity.nameTokenSets) {
    const significantTokens = nameTokens.significant;
    if (significantTokens.length < 2) continue;

    const matched = significantTokens.filter((token) =>
      query.tokens.some((queryToken) => tokenMatches(queryToken, token))
    );
    if (matched.length === 0) continue;

    const genericOnly = matched.every((token) => CONSUMER_FINANCE_TOKENS.has(token));
    if (genericOnly && !agriContext) continue;

    const ratio = matched.length / significantTokens.length;
    if (matched.length === significantTokens.length) {
      score = Math.max(score, NAME_FULL_TOKENS_SCORE);
    } else if (ratio >= 0.6) {
      score = Math.max(score, NAME_MOST_TOKENS_SCORE);
    } else if (
      // Weak overlap only counts when at least one matched word is unique to
      // this record; a word shared by several schemes proves nothing.
      matched.some((token) => documentFrequency.get(token) === 1) &&
      (matched.length >= 2 || matched.includes(nameTokens.head))
    ) {
      score = Math.max(score, PARTIAL_TOKEN_SCORE);
    }
  }

  // 4. Weak evidence that only counts with agriculture context: record tags and
  //    topic concepts the record itself claims.
  if (agriContext) {
    for (const tag of identity.tagPhrases) {
      if (phraseInQuery(query, tag)) {
        score = Math.max(score, TAG_SCORE);
        break;
      }
    }

    for (const conceptId of query.askedConcepts) {
      if (!identityClaimsConcept(identity, conceptId)) continue;
      score = Math.max(score, CONCEPT_SCORE);
      break;
    }
  }

  if (score > 0 && hintSlug && identity.scheme?.id === hintSlug) score += HINT_BONUS;

  return score;
}

/**
 * Rank every scheme that the message plausibly refers to, highest score first.
 * Data-driven: the index is built from each record, so a scheme with an id that
 * was never mentioned in code is matched like any other.
 *
 * Exported for tests; the conversational assistant still uses the single best
 * match, so UI behaviour is unchanged in this step.
 */
export function findSchemeMatches(text, schemes, lang = "en", hintSlug = null) {
  const list = Array.isArray(schemes) ? schemes.filter(Boolean) : [];
  const query = buildQuery(text);
  if (list.length === 0 || query.tokens.length === 0) return [];

  const agriContext = STRONG_AGRIC_RE.test(query.text);
  const identities = list.map((scheme) => buildSchemeIdentity(scheme, lang));

  // How many records each word identifies (counted across names, codes, slugs
  // and tags, so slug-only records take part too).
  const documentFrequency = new Map();
  for (const identity of identities) {
    for (const token of identity.allTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }

  // Tokens of the concepts this query asks about, for a cheap pre-filter.
  const askedConceptTokens = new Set();
  for (const conceptId of query.askedConcepts) {
    for (const token of CONCEPT_TOKENS[conceptId]) askedConceptTokens.add(token);
  }

  const scored = [];
  for (const identity of identities) {
    const sharesNameToken = identity.allTokens.some((token) =>
      query.tokens.some((queryToken) => tokenMatches(queryToken, token))
    );
    const sharesCode = identity.codes.some((code) => {
      const compact = code.replace(/ /g, "");
      return compact.length >= 5 && query.compact.includes(compact);
    });
    const sharesConceptToken =
      askedConceptTokens.size > 0 &&
      identity.allTokens.some((token) => {
        for (const synonym of askedConceptTokens) {
          if (tokenMatches(token, synonym)) return true;
        }
        return false;
      });

    if (!sharesNameToken && !sharesCode && !sharesConceptToken) continue;

    const score = scoreSchemeIdentity(query, identity, agriContext, documentFrequency, hintSlug);
    if (score > 0) scored.push({ scheme: identity.scheme, score });
  }

  // Stable sort: equal scores keep dataset order.
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Match a user message to the best scheme in the dataset.
 *
 * Evidence-gated: a scheme is returned only when the message carries real
 * evidence for it — its code, slug, name, name words or tags. Weak evidence
 * (topic concepts such as "insurance" or "loan") only counts with agriculture
 * context, so unrelated text returns null and the caller clarifies instead of
 * showing a random card.
 *
 * When two records are equally weak candidates the query is ambiguous and null
 * is returned.
 *
 * Accepts an optional hint slug to bias scoring when the caller already knows
 * the likely scheme (e.g. from conversation history). Exported for unit tests.
 */
export function findBestSchemeMatch(text, schemes, lang = "en", hintSlug = null) {
  const ranked = findSchemeMatches(text, schemes, lang, hintSlug);
  if (ranked.length === 0) return null;

  const [top, second] = ranked;
  if (second && top.score === second.score && top.score < AMBIGUITY_FLOOR) return null;

  return top.scheme;
}

/**
 * Schemes with a working deterministic screening flow.
 *
 * The interview encodes no scheme facts: every question, exclusion rule and
 * document list is rendered from the selected record. A scheme is enrolled here
 * only once its verified eligibility text is expressed as requirements a farmer
 * can self-check, because the flow re-asks ambiguous answers and must never
 * guess a rule.
 */
const ELIGIBILITY_SCREENING_SCHEME_IDS = new Set(["pm-kisan"]);

const PRELIMINARY_NOTE_EN =
  "*(Note: This application provides preliminary guidance from the verified record, not an official administrative ruling.)*";
const PRELIMINARY_NOTE_TE =
  "*(గమనిక: ఇది ధృవీకరించిన రికార్డు ఆధారంగా ప్రాథమిక మార్గదర్శకత్వం మాత్రమే, అధికారిక నిర్ణయం కాదు.)*";

/** Markers that identify an eligibility item as an exclusion rule. */
const EXCLUSION_HINT_RE =
  /\b(?:exclu\w*|excluded|ineligible|disqualif\w*|not eligible)\b|మినహాయింపు|అనర్హ/iu;

/** Record strings for one scheme, preferring the requested language. */
function recordStrings(scheme, lang) {
  const preferred = scheme?.[lang] || {};
  const fallback = scheme?.en || {};
  const list = (value) =>
    Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim()) : [];
  const pickList = (key) => {
    const localised = list(preferred[key]);
    return localised.length > 0 ? localised : list(fallback[key]);
  };
  return {
    name: preferred.name || fallback.name || scheme?.code || scheme?.id || "",
    description: preferred.shortDescription || fallback.shortDescription || "",
    eligibility: pickList("eligibility"),
    documents: pickList("requiredDocuments"),
    benefits: pickList("benefits"),
    url: scheme?.verifiedOfficialUrl || "",
  };
}

/** Strip a leading "Exclusions:" label so the record text reads as a rule. */
function cleanEligibilityItem(item) {
  return cleanText(item)
    .replace(/^\s*(?:exclusions?|excluded|exclusion criteria)\s*[:\-–]\s*/i, "")
    .replace(/^\s*మినహాయింపులు?\s*[:\-–]\s*/u, "")
    .trim();
}

/**
 * Split a record's eligibility text into the requirements a farmer can check
 * against their own situation and the exclusion rules that override them. The
 * split is driven only by the record's wording — no scheme is special-cased.
 */
function eligibilityFacts(scheme, lang = "en") {
  const data = recordStrings(scheme, lang);
  const requirements = [];
  const exclusions = [];
  for (const item of data.eligibility) {
    (EXCLUSION_HINT_RE.test(item) ? exclusions : requirements).push(cleanEligibilityItem(item));
  }
  return { ...data, requirements, exclusions };
}

/**
 * True when a scheme has a working deterministic screening flow AND its record
 * carries the criteria the interview asks about. Exported so callers and tests
 * can tell whether screening is genuinely available for a scheme.
 */
export function canScreenEligibility(scheme) {
  if (!scheme || !ELIGIBILITY_SCREENING_SCHEME_IDS.has(scheme.id)) return false;
  return eligibilityFacts(scheme, "en").requirements.length > 0;
}

/** Official portal lines, added only when the record actually carries a URL. */
function portalLines(facts, lang) {
  if (!facts.url) return [];
  return ["", lang === "te" ? `అధికారిక పోర్టల్: ${facts.url}` : `Official portal: ${facts.url}`];
}

/**
 * Build the general-overview answer purely from a scheme's verified record.
 * A missing summary is reported as unavailable — never replaced with a generic
 * description. Exported for unit tests.
 */
export function buildSchemeOverview(scheme, lang = "en") {
  const data = recordStrings(scheme, lang);
  const te = lang === "te";
  const benefits = data.benefits.slice(0, 3).map((b) => `• ${cleanText(b)}`).join("\n");
  const eligibility = data.eligibility.slice(0, 3).map((e) => `• ${cleanText(e)}`).join("\n");
  const missing = te
    ? "• ఈ వివరాలు ధృవీకరించిన రికార్డులో అందుబాటులో లేవు."
    : "• Information not available in the verified record.";

  const lines = te
    ? [
        `### ${data.name}`,
        "",
        cleanText(data.description) || "ఈ పథకం వివరణ ధృవీకరించిన రికార్డులో అందుబాటులో లేదు.",
        "",
        "### ముఖ్య ప్రయోజనాలు:",
        benefits || missing,
        "",
        "### ముఖ్య అర్హతలు:",
        eligibility || missing,
      ]
    : [
        `### ${data.name}`,
        "",
        cleanText(data.description) || "This scheme's description is not available in the verified record.",
        "",
        "### Core Benefits:",
        benefits || missing,
        "",
        "### Key Eligibility:",
        eligibility || missing,
      ];

  return lines.join("\n");
}

/** Result for a household the record's rules do not exclude. */
function positiveEligibilityResult(facts, lang, scheme) {
  const te = lang === "te";
  const documents = facts.documents.length
    ? facts.documents.map((doc, idx) => `${idx + 1}. ${cleanText(doc)}`).join("\n")
    : te
      ? "• అవసరమైన పత్రాల వివరాలు ధృవీకరించిన రికార్డులో అందుబాటులో లేవు. దయచేసి అధికారిక పోర్టల్‌ను చూడండి."
      : "• Required documents are not listed in the verified record. Please check the official portal.";
  const benefits = facts.benefits.slice(0, 3).map((b) => `• ${cleanText(b)}`).join("\n");

  const lines = te
    ? [
        `### ప్రాథమిక అర్హత అంచనా: ${facts.name}`,
        "",
        `మీరు అందించిన సమాచారం మరియు ధృవీకరించిన రికార్డు ప్రకారం, **${facts.name}** పథకానికి మీరు **ప్రాథమికంగా అర్హులు**గా కనిపిస్తున్నారు.`,
        "",
        "📋 **అవసరమైన పత్రాలు (ధృవీకరించిన రికార్డు నుండి):**",
        documents,
      ]
    : [
        `### Preliminary Eligibility Assessment: ${facts.name}`,
        "",
        `Based on the verified record and your answers, you appear **preliminarily eligible** for **${facts.name}**.`,
        "",
        "📋 **Required documents (from the verified record):**",
        documents,
      ];

  if (benefits) {
    lines.push(
      "",
      te ? "### ముఖ్య ప్రయోజనాలు (ధృవీకరించిన రికార్డు నుండి):" : "### Key benefits (from the verified record):",
      benefits
    );
  }

  lines.push("", te ? PRELIMINARY_NOTE_TE : PRELIMINARY_NOTE_EN, ...portalLines(facts, lang));

  return {
    status: "eligibility_result",
    message: lines.join("\n"),
    eligibilityState: null,
    primaryScheme: scheme,
  };
}

/** Result for a household that fails one of the record's stated rules. */
function negativeEligibilityResult(facts, lang, scheme, copy) {
  const te = lang === "te";
  const items = copy.items.map((item) => `• ${item}`);
  const lines = te
    ? [
        `### ${copy.headingTe}`,
        "",
        copy.bodyTe,
        "",
        ...items,
        "",
        `• **ప్రాథమిక మార్గదర్శకత్వం:** ఈ నిబంధన ప్రకారం మీరు **${facts.name}** పథకానికి అర్హులు కాకపోవచ్చు.`,
        "",
        PRELIMINARY_NOTE_TE,
      ]
    : [
        `### ${copy.headingEn}`,
        "",
        copy.bodyEn,
        "",
        ...items,
        "",
        `• **Preliminary Guidance:** Under this rule you are likely **not eligible** for **${facts.name}**.`,
        "",
        PRELIMINARY_NOTE_EN,
      ];

  lines.push(...portalLines(facts, lang));

  return {
    status: "eligibility_result",
    message: lines.join("\n"),
    eligibilityState: null,
    primaryScheme: scheme,
  };
}

/**
 * Run one turn of the deterministic eligibility screening.
 *
 * Sequencing and answer parsing live here (steps: land_ownership → exclusions),
 * while every official fact — requirement, exclusion list, documents, benefits,
 * portal — comes from the selected scheme record. A record without verified
 * criteria cannot be screened; the flow says so instead of guessing.
 * Answer parsing is delegated to `classifyEligibilityAnswer`, so ambiguous
 * replies re-ask rather than producing a false determination. Exported for
 * unit tests.
 */
export function handleEligibilityScreening(userMessage, step, lang = "en", scheme, preAnswer = null) {
  const norm = (userMessage || "").trim().toLowerCase();
  // Shared, ambiguity-aware answer classification (re-asks on unclear replies).
  const answer = preAnswer ?? classifyEligibilityAnswer(norm, step);
  const facts = eligibilityFacts(scheme, lang);
  const te = lang === "te";
  const primaryRequirement = facts.requirements[0] || "";

  // No verified criteria → nothing to screen against. Never substitute generic
  // or PM-KISAN rules for a record that does not state them.
  if (facts.requirements.length === 0) {
    const lines = te
      ? [
          `### అర్హత తనిఖీ అందుబాటులో లేదు: ${facts.name || "ఈ పథకం"}`,
          "",
          `**${facts.name || "ఈ పథకం"}** కొరకు అర్హత నిబంధనలు ధృవీకరించిన రికార్డులో లేవు, కాబట్టి దశలవారీ తనిఖీ చేయలేము.`,
          "",
          "దయచేసి అధికారిక పోర్టల్‌లో అధికారిక నిబంధనలను పరిశీలించండి.",
        ]
      : [
          `### Eligibility Screening Unavailable: ${facts.name || "this scheme"}`,
          "",
          `The verified record for **${facts.name || "this scheme"}** does not contain eligibility criteria this app can screen against, so a step-by-step check is not possible.`,
          "",
          "Please check the official portal for the authoritative requirements.",
        ];
    lines.push(...portalLines(facts, lang));

    return {
      status: "found",
      message: lines.join("\n"),
      eligibilityState: null,
      primaryScheme: scheme,
      matchedSchemes: scheme ? [scheme] : [],
    };
  }

  // Step 1 — self-check against the requirement the record states first.
  if (!step || step === "start") {
    const alsoNoted = facts.requirements.slice(1).map((item) => `• ${item}`);

    const lines = te
      ? [
          `### ప్రాథమిక అర్హత తనిఖీ: ${facts.name}`,
          "",
          "ఈ యాప్ **ప్రాథమిక మార్గదర్శకత్వాన్ని** మాత్రమే అందిస్తుంది; ఇది అధికారిక అర్హత నిర్ణయం కాదు. అధికారిక నమోదుకు సంబంధిత అధికారుల ధృవీకరణ అవసరం.",
          "",
          "ధృవీకరించిన రికార్డులో ఈ అర్హత నిబంధన ఉంది:",
          "",
          `• ${primaryRequirement}`,
          ...(alsoNoted.length ? ["", "ఇందులో ఇవి కూడా ఉన్నాయి:", ...alsoNoted] : []),
          "",
          "**1. ఈ నిబంధన మీ కుటుంబానికి వర్తిస్తుందా?**",
          "",
          "*(దయచేసి **అవును** లేదా **కాదు** అని తెలపండి)*",
        ]
      : [
          `### Preliminary Eligibility Check: ${facts.name}`,
          "",
          "This application provides **preliminary guidance only**, not an official eligibility determination. Official enrolment requires verification by the implementing authority.",
          "",
          "The verified record lists this eligibility requirement:",
          "",
          `• ${primaryRequirement}`,
          ...(alsoNoted.length ? ["", "It also notes:", ...alsoNoted] : []),
          "",
          "**1. Does this requirement apply to your household?**",
          "",
          "*(Please reply with **Yes** or **No**)*",
        ];

    return {
      status: "eligibility_question",
      message: lines.join("\n"),
      eligibilityState: { schemeId: scheme?.id || "", step: "land_ownership" },
      primaryScheme: scheme,
    };
  }

  // Step 2: Evaluating Land Ownership response
  if (step === "land_ownership") {
    if (answer === "no") {
      return negativeEligibilityResult(facts, lang, scheme, {
        headingEn: "Preliminary Assessment: Requirement Not Met",
        headingTe: "ప్రాథమిక అంచనా: నిబంధన నెరవేరలేదు",
        bodyEn: "You indicated that this requirement does not apply to your household:",
        bodyTe: "ఈ నిబంధన మీ కుటుంబానికి వర్తించదని మీరు తెలిపారు:",
        items: [primaryRequirement],
      });
    }

    if (answer === "yes") {
      // A record with no exclusion rules needs no second question: report the
      // record's own criteria as met and show its verified details.
      if (facts.exclusions.length === 0) {
        return positiveEligibilityResult(facts, lang, scheme);
      }

      const exclusionItems = facts.exclusions.map((item) => `• ${item}`);
      const lines = te
        ? [
            `### దశ 2: మినహాయింపు నిబంధనలు — ${facts.name}`,
            "",
            "ధన్యవాదాలు. ధృవీకరించిన రికార్డులో ఈ మినహాయింపు నిబంధనలు కూడా ఉన్నాయి:",
            "",
            ...exclusionItems,
            "",
            "**2. ఈ మినహాయింపు నిబంధనలలో ఏదైనా మీకు లేదా మీ కుటుంబానికి వర్తిస్తుందా?**",
            "",
            "*(దయచేసి **ఎవరూ లేరు / వర్తించదు** లేదా **అవును, వర్తిస్తుంది** అని తెలపండి)*",
          ]
        : [
            `### Step 2: Exclusion Rules — ${facts.name}`,
            "",
            "Thanks. The verified record also lists these exclusion rules:",
            "",
            ...exclusionItems,
            "",
            "**2. Do any of these exclusion rules apply to you or your immediate family?**",
            "",
            "*(Please reply with **None of these** or **Yes, an exclusion applies**)*",
          ];

      return {
        status: "eligibility_question",
        message: lines.join("\n"),
        eligibilityState: { schemeId: scheme?.id || "", step: "exclusions" },
        primaryScheme: scheme,
      };
    }

    // Ambiguous answer — re-ask the record's own requirement, infer nothing.
    const clarifyEn = [
      "I could not tell from your reply whether this requirement applies to you:",
      "",
      `• ${primaryRequirement}`,
      "",
      "Please reply clearly with **Yes** or **No**.",
    ].join("\n");

    const clarifyTe = [
      "మీ సమాధానం స్పష్టంగా లేదు. ఈ నిబంధన మీకు వర్తిస్తుందో లేదో తెలియడం లేదు:",
      "",
      `• ${primaryRequirement}`,
      "",
      "దయచేసి **అవును** లేదా **కాదు** అని స్పష్టంగా తెలపండి.",
    ].join("\n");

    return {
      status: "eligibility_question",
      message: lang === "te" ? clarifyTe : clarifyEn,
      eligibilityState: { schemeId: scheme?.id || "", step: "land_ownership" },
      primaryScheme: scheme,
    };
  }

  // Step 3: Evaluating Exclusions response
  if (step === "exclusions") {
    if (answer === "applies") {
      return negativeEligibilityResult(facts, lang, scheme, {
        headingEn: "Preliminary Assessment: Exclusion Rule Applies",
        headingTe: "ప్రాథమిక అంచనా: మినహాయింపు నిబంధన వర్తిస్తుంది",
        bodyEn: "You indicated that an exclusion rule applies. The verified record excludes applicants in these cases:",
        bodyTe: "మినహాయింపు నిబంధన వర్తిస్తుందని మీరు తెలిపారు. ధృవీకరించిన రికార్డు ఈ సందర్భాలలో అర్హతను మినహాయిస్తుంది:",
        items: facts.exclusions,
      });
    }

    if (answer === "none") {
      return positiveEligibilityResult(facts, lang, scheme);
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
      eligibilityState: { schemeId: scheme?.id || "", step: "exclusions" },
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
  // Any active flow is resolved by the scheme id stored in its own state. No
  // scheme is assumed here: the interview only runs while that record still
  // carries the criteria it asks about.
  const activeElig = keepState?.schemeId ? keepState : null;

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
    const flowScheme = allSchemes.find((s) => s.id === activeElig.schemeId) || null;

    // Every question is rendered from the flow's record; without it the flow
    // cannot continue and the message falls through to normal handling.
    if (flowScheme) {
      const answer = classifyEligibilityAnswer(stripped, activeElig.step);

      if (answer) {
        return handleEligibilityScreening(stripped, activeElig.step, lang, flowScheme, answer);
      }

      // Not a recognized answer. Chit-chat keeps the flow; a scheme/topic
      // question is answered and ends the flow (handled below); anything else is
      // an unrecognized reply to the current question → re-ask it.
      const isChat = detectConversationalIntent(text);
      const isSchemeQuestion =
        Boolean(findBestSchemeMatch(text, allSchemes, lang)) ||
        isContextualFollowUp(text) ||
        isEligibilityDecisionQuery(text);
      if (!isChat && !isSchemeQuestion) {
        return handleEligibilityScreening(text, activeElig.step, lang, flowScheme);
      }
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
  //    ("Am I eligible for PM-KISAN?", "nenu eligible aa?"). Only schemes with a
  //    working, record-backed screening flow qualify — the flow itself contains
  //    no scheme facts. Informational queries ("What are the eligibility
  //    criteria?", "can I apply?") fall through to the info paths instead.
  if (isEligibilityDecisionQuery(text) && canScreenEligibility(topMatch)) {
    return handleEligibilityScreening(text, "start", lang, topMatch);
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

    // Honest capability note: only schemes with a working screening flow can be
    // interviewed step by step; every other scheme gets its record's criteria.
    const screeningNote = canScreenEligibility(topMatch)
      ? ""
      : lang === "te"
        ? "\n\n*(దశలవారీ అర్హత తనిఖీ ప్రస్తుతం పీఎం-కిసాన్ కోసం మాత్రమే అందుబాటులో ఉంది. పై నిబంధనలు ఈ పథకం ధృవీకరించిన రికార్డు నుండి తీసుకోబడ్డాయి.)*"
        : "\n\n*(Step-by-step eligibility screening is currently available for PM-KISAN only. The criteria above come from this scheme's verified record.)*";

    return {
      status: "found",
      message: (lang === "te" ? eligMsgTe : eligMsgEn) + screeningNote,
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
  return {
    status: "found",
    message: buildSchemeOverview(topMatch, lang),
    primaryScheme: topMatch,
    matchedSchemes: [topMatch],
  };
}
