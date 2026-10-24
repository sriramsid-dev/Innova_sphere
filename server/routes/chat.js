/**
 * Innova Sphere — POST /api/chat route
 *
 * Request body:
 *   {
 *     query:              string   — user's question (max 500 chars)
 *     lang:               'en' | 'te'
 *     eligibilityState:   object | null  — current multi-turn state
 *     conversationHistory: [{ role: 'user'|'assistant', text: string }]
 *   }
 *
 * Response:
 *   {
 *     message:          string   — Gemini response (Markdown)
 *     status:           string   — 'ok' | 'error'
 *     usedGemini:       boolean
 *     primaryScheme:    { id, code, verifiedOfficialUrl } | null
 *     eligibilityState: object | null  — updated state (passthrough; eligibility is rule-based)
 *   }
 *
 * Error responses:
 *   400 — invalid input
 *   429 — rate limited (from middleware)
 *   503 — Gemini unavailable (client should fall back to rule-based responses)
 */

import { Router } from "express";
import { callGemini, isGeminiConfigured } from "../lib/gemini.js";
import { fetchSchemesBySlug, fetchAllVerifiedSchemes } from "../lib/supabaseAdmin.js";

const router = Router();

// Slug keywords map: detects which scheme(s) the user is asking about.
// Each entry includes Telugu script, Romanised-Telugu transliterations, and
// common colloquial phrases so queries like "nenu eligible aa?" resolve correctly.
const SCHEME_KEYWORDS = {
  "pm-kisan": [
    // English / acronym
    "pm-kisan", "pm kisan", "pmkisan", "kisan samman", "samman nidhi",
    "6000", "2000", "pattadar",
    // Telugu script
    "కిసాన్", "పీఎం కిసాన్", "పీఎం-కిసాన్", "కిసాన్ సమ్మాన్", "సమ్మాన్ నిధి",
    // Romanised Telugu transliterations
    "kisan", "rythu", "raitu", "raithu", "nenu eligible", "eligible aa",
    "arthudu", "arthulu", "arthulaa", "arthuralaa", "avutaana", "avutanu",
  ],
  pmfby: [
    // English / acronym
    "pmfby", "fasal bima", "crop insurance", "bima yojana", "fasal",
    "crop loss", "flood insurance", "drought insurance",
    // Telugu script
    "బీమా", "పంట బీమా", "ఫసల్", "పంట నష్టం", "ఫసల్ బీమా",
    // Romanised Telugu transliterations
    "panta bima", "panta bheema", "panta bheemaa", "panta nshtam", "bheema",
  ],
  "kisan-credit-card": [
    // English / acronym
    "kisan credit", "kcc", "credit card", "crop loan", "pacs", "cooperative",
    // Telugu script
    "కిసాన్ క్రెడిట్", "రుణం", "రుణ", "సహకార",
    // Romanised Telugu transliterations
    "runam", "runam card", "rythu runam", "raitu runam", "sahakara",
  ],
  "soil-health-card": [
    // English / acronym
    "soil health", "shc", "soil card", "soil test", "fertilizer test",
    // Telugu script
    "నేల ఆరోగ్యం", "సాయిల్", "నేల పరీక్ష", "భూమి పరీక్ష",
    // Romanised Telugu transliterations
    "nela pariksham", "bhoomi pariksham", "nela arogyam", "soil helthu",
  ],
};

// Name-fragment patterns used as a secondary fallback when zero slugs are matched.
// Ordered by specificity — first match wins for each fragment group.
const SLUG_FRAGMENT_PATTERNS = [
  { slug: "pm-kisan",          re: /kisan|కిసాన్|samman|rythu|raitu|raithu|arthudu|eligible/i },
  { slug: "pmfby",             re: /fasal|bima|bheema|insurance|పంట బీమా|panta bima|crop loss/i },
  { slug: "kisan-credit-card", re: /kcc|credit|runam|రుణం|cooperative|sahakara/i },
  { slug: "soil-health-card",  re: /soil|nela|bhoomi|నేల|soil test/i },
];

/**
 * Detect which scheme slugs are relevant to the query.
 *
 * Pass 1 — exact keyword match from SCHEME_KEYWORDS.
 * Pass 2 — name-fragment fallback: only runs when Pass 1 returns nothing,
 *           so it never overrides an explicit keyword match.
 *
 * @param {string} query
 * @returns {string[]}
 */
function detectRelevantSlugs(query) {
  const lower = query.toLowerCase();
  const slugScores = [];

  // Pass 1: explicit keyword list scored by longest matching keyword length
  for (const [slug, keywords] of Object.entries(SCHEME_KEYWORDS)) {
    let maxLen = 0;
    for (const kw of keywords) {
      if (lower.includes(kw) && kw.length > maxLen) {
        maxLen = kw.length;
      }
    }
    if (maxLen > 0) {
      slugScores.push({ slug, score: maxLen });
    }
  }

  // Sort descending by match score so the most specific scheme match is primary
  slugScores.sort((a, b) => b.score - a.score);
  const matched = slugScores.map((s) => s.slug);

  // Pass 2: name-fragment fallback (only when Pass 1 produced nothing)
  if (matched.length === 0) {
    for (const { slug, re } of SLUG_FRAGMENT_PATTERNS) {
      if (re.test(lower)) {
        matched.push(slug);
        break; // one fragment match is enough as a focused hint
      }
    }
  }

  return matched;
}

/**
 * Input validation.
 * Returns an error string or null if valid.
 */
function validateBody(body) {
  if (!body || typeof body !== "object") return "Request body must be JSON.";

  const { query, lang } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return "query must be a non-empty string.";
  }
  if (query.length > 500) {
    return "query must be 500 characters or fewer.";
  }
  if (lang !== undefined && lang !== "en" && lang !== "te") {
    return "lang must be 'en' or 'te'.";
  }

  return null;
}

// POST /api/chat
router.post("/", async (req, res) => {
  // Validate input
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    query,
    lang = "en",
    eligibilityState = null,
    conversationHistory = [],
  } = req.body;

  // If Gemini is not configured, return 503 immediately so the client falls back
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: "AI service not configured on this server.",
      usedGemini: false,
    });
  }

  try {
    // 1. Detect relevant schemes from the query
    let slugs = detectRelevantSlugs(query);

    // Contextual follow-up: if query doesn't mention a scheme (e.g. "What documents do I need?",
    // "Tell me more"), infer the scheme from recent conversation history.
    if (slugs.length === 0 && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const histText = conversationHistory[i]?.text || "";
        const histSlugs = detectRelevantSlugs(histText);
        if (histSlugs.length > 0) {
          slugs = histSlugs;
          break;
        }
      }
    }

    // 2. Fetch scheme data from Supabase for grounding
    let schemeRows;
    if (slugs.length > 0) {
      schemeRows = await fetchSchemesBySlug(slugs);
      // Preserve ranking order determined by detectRelevantSlugs
      schemeRows.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
    } else {
      // General query — pass all verified schemes for broad context
      schemeRows = await fetchAllVerifiedSchemes();
    }

    // 3. Identify primary scheme for action buttons
    let primaryScheme = null;
    if (schemeRows.length > 0) {
      const primarySlug = slugs[0];
      const primary = (primarySlug && schemeRows.find((r) => r.slug === primarySlug)) || schemeRows[0];
      primaryScheme = {
        id: primary.slug,
        code: (primary.slug || "").toUpperCase().replace(/-/g, " "),
        verifiedOfficialUrl: primary.official_url || null,
      };
    }

    // 4. Call Gemini with grounded data
    const geminiResponse = await callGemini({
      query: query.trim(),
      lang,
      schemeRows,
      eligibilityState,
      conversationHistory,
    });

    // 5. Return structured response
    // eligibilityState is passed through unchanged — eligibility logic stays rule-based in the client
    return res.json({
      message: geminiResponse.message,
      status: "ok",
      usedGemini: true,
      primaryScheme,
      eligibilityState,
    });
  } catch (err) {
    // Log error category but never log query content or keys
    const isRateLimit =
      err.message?.includes("429") ||
      err.status === 429 ||
      err.message?.toLowerCase().includes("quota");

    const isOverload =
      err.message?.includes("503") ||
      err.status === 503 ||
      err.message?.toLowerCase().includes("overload");

    if (isRateLimit || isOverload) {
      console.warn("[chat] Gemini quota/overload — client will fall back");
      return res.status(503).json({
        error: "AI service temporarily unavailable. Please try again shortly.",
        usedGemini: false,
      });
    }

    console.error("[chat] Unexpected error:", err.message || "unknown");
    return res.status(503).json({
      error: "AI service error. Falling back to standard responses.",
      usedGemini: false,
    });
  }
});

export default router;
