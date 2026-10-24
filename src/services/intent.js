/**
 * Innova Sphere — conversational intent guard (pure, dependency-free).
 *
 * The assistant only answers about four verified schemes. Before this module
 * existed, *every* message was scored as a scheme query and any unmatched text
 * inherited the last discussed scheme from conversation history — so "hello"
 * after a PMFBY answer returned the PMFBY card.
 *
 * This module classifies messages into two families:
 *   1. Chit-chat intents (greeting, identity, thanks, …) that must never reach
 *      scheme matching and never inherit a previous scheme.
 *   2. Eligibility answers (yes / no / none / applies) for the deterministic
 *      PM-KISAN screening flow.
 *
 * It also decides when a message may legitimately inherit the previously
 * discussed scheme (a genuine follow-up like "what documents do I need?").
 *
 * It is intentionally free of React/Supabase imports so it can be unit-tested
 * with Node's built-in test runner.
 */

export const INTENT = {
  GREETING: "greeting",
  IDENTITY: "identity",
  THANKS: "thanks",
  FAREWELL: "farewell",
  ACKNOWLEDGEMENT: "acknowledgement",
  CAPABILITIES: "capabilities",
  HELP: "help",
};

/** Normalise for matching: lowercase, trim, collapse whitespace. */
function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ── Pattern sources (kept as strings so they can be reused for global stripping) ──

/** Strong, unambiguous scheme identifiers. These always win over chit-chat. */
const SCHEME_NAME_SRC =
  "pm[\\s-]?kisan|pmkisan|pmfby|kcc|fasal[\\s-]?bima|crop insurance|kisan credit|credit card|soil health|soil card|సాయిల్|నేల ఆరోగ్య|కిసాన్ క్రెడిట్|పంట బీమా|ఫసల్|కిసాన్ సమ్మాన్|పీఎం[\\s-]?కిసాన్|పీఎంఎఫ్";

/** Scheme-topic asks. A greeting carrying one of these is really a question. */
const TOPIC_SRC =
  "documents?|papers?|proof|eligib\\w*|benefits?|apply|application|steps?|criteria|premium|last date|amount" +
  "|పత్రా\\w*|అర్హత\\w*|ప్రయోజన\\w*|దరఖాస్తు\\w*|నిబంధన\\w*|మొత్తం" +
  // Common Telugu transliterations of the same topic words
  "|patra(?:lu|m)|arhat[a-z]*|prayojan(?:alu|u)|darakhast(?:u|h)|nibandhan(?:alu|u)";

/** Anaphora / elliptical references that legitimately depend on prior context. */
const ANAPHORA_SRC =
  "\\b(?:it|its|that|this|these|those|same|more|further|details|explain more)\\b" +
  "|అది|దాని|అవి|ఇది|ఈ పథకం|ఆ పథకం|మరిన్ని|వివరాలు|వివరంగా";

const SCHEME_NAME_RE = new RegExp(SCHEME_NAME_SRC, "iu");
const TOPIC_RE = new RegExp(TOPIC_SRC, "iu");
const ANAPHORA_RE = new RegExp(ANAPHORA_SRC, "iu");

const IDENTITY_RE =
  /(what(?:'s| is)? your name|whats your name|who are you|who r u|introduce yourself|about yourself|మీ పేరు|నీ పేరు|మీరు ఎవరు|నువ్వు ఎవరు|మీ గురించి చెప్పండి)/iu;

const THANKS_RE =
  /(\bthanks?\b|\bthank you\b|\bthx\b|\bthanx\b|ధన్యవాద|థాంక్స్|థ్యాంక్స్|థాంక్ యూ)/iu;

const FAREWELL_RE =
  /^(?:bye+|goodbye|good bye|see you|see ya|take care|good night|night|వీడ్కోలు|బై|శుభ రాత్రి)(?=$|[\s,.!?])/iu;

const ACK_RE =
  /^(?:ok|okay|okey|k|kk|fine|got it|alright|sure|hmm+|mm+|సరే|ఓకే|అలాగే)[\s,.!?]*$/iu;

const CAPABILITIES_RE =
  /(what can you do|what do you do|how can you help|what can you help with|who can you help|ఏం చేయగలవు|ఏమి చేయగలవు|ఎలా సహాయం చేయగలవు|మీరు ఏం చేస్తారు)/iu;

const HELP_RE = /^(?:i need help|need help|help me|help|సహాయం కావాలి|సహాయం చేయండి|సహాయం)(?=$|[\s,.!?])/iu;

const GREETING_RE =
  /^(?:hi+|hey+|hello+|helo|hai|namaste|namaskar(?:am)?|namaskaaram|namaskaramu|good (?:morning|afternoon|evening)|greetings|నమస్తే|నమస్కారం|నమస్కారము|హాయ్|హలో|శుభోదయం|శుభ సాయంత్రం)(?=$|[\s,.!?])/iu;

/** Harmless words that may follow a greeting without turning it into a question. */
const PLEASANTRY_RE =
  /^(?:there|sir|madam|friend|buddy|how (?:are|r) (?:you|u)\b|how do you do\b|how'?s it going\b|hope you'?re well\b|what'?s up\b|sup\b)/iu;

/** Leading fillers / pleasantry that can precede a real answer or question. */
const LEADING_CHIT_SRC =
  "(?:(?:um+|uh+|er+|erm+|hmm+|mm+|well|so|ok(?:ay)?|hey+|hi+|hello+|hai|namaste|namaskar(?:am)?|thanks?|thank\\s+you|గుడ్?[\\s-]?మార్నింగ్?)[\\s,.!?]+)+";
const LEADING_CHIT_RE = new RegExp("^" + LEADING_CHIT_SRC, "iu");

/** Agriculture vocabulary — used to choose clarify vs. off-topic wording. */
const FARMER_TOPIC_RE =
  /(kisan|farmer|farming|agricultur|crop|harvest|sowing|soil|fertil\w*|loan|credit|insurance|subsid|scheme|yojana|land record|patta|grievance|రైతు|పంట|వ్యవసాయ|భూమి|నేల|ఎరువు|రుణ|బీమా|పథకం|ఫిర్యాదు|శికాయత|గ్రీవెన్స్)/iu;

// ── Whole-utterance chit-chat detection ────────────────────────────────────

/**
 * Classify conversational messages. Returns an INTENT value or null when the
 * message should be handled as a scheme question.
 *
 * A greeting only counts when it is (essentially) the whole utterance, or when
 * the remainder is another chit-chat intent. "hello, what is the capital of
 * India?" is therefore NOT a greeting — it is substantive content that must
 * fall through to off-topic handling.
 */
export function detectConversationalIntent(rawText) {
  const text = normalise(rawText);
  if (!text) return null;

  // An explicit scheme name always means the user is asking about a scheme.
  if (SCHEME_NAME_RE.test(text)) return null;

  // "hello, what documents do I need?" is a documents question, not a greeting.
  if (TOPIC_RE.test(text)) return null;

  if (IDENTITY_RE.test(text)) return INTENT.IDENTITY;
  if (THANKS_RE.test(text)) return INTENT.THANKS;
  if (FAREWELL_RE.test(text)) return INTENT.FAREWELL;
  if (CAPABILITIES_RE.test(text)) return INTENT.CAPABILITIES;
  if (HELP_RE.test(text)) return INTENT.HELP;
  if (ACK_RE.test(text)) return INTENT.ACKNOWLEDGEMENT;

  // Retry anchored intents with leading voice fillers removed ("um hello",
  // "um, bye", "hi, I need help").
  const stripped = stripLeadingChitChat(text);
  if (stripped && stripped !== text) {
    if (FAREWELL_RE.test(stripped)) return INTENT.FAREWELL;
    if (CAPABILITIES_RE.test(stripped)) return INTENT.CAPABILITIES;
    if (HELP_RE.test(stripped)) return INTENT.HELP;
    if (ACK_RE.test(stripped)) return INTENT.ACKNOWLEDGEMENT;
  }

  const greetingMatch = GREETING_RE.exec(text) || GREETING_RE.exec(stripped);
  if (greetingMatch) {
    // Slice the remainder from whichever string actually matched the greeting.
    const src = GREETING_RE.test(text) ? text : stripped;
    const m = GREETING_RE.exec(src);
    const rest = src.slice(m[0].length).replace(/^[\s,.!?]+/, "").trim();
    if (!rest || PLEASANTRY_RE.test(rest)) return INTENT.GREETING;
    // "hello, thank you" / "hi, I need help" — classify the remainder.
    const sub = detectConversationalIntent(rest);
    if (sub) return sub;
    // A greeting followed by real content is substantive, not chit-chat.
    return null;
  }

  return null;
}

// ── Contextual follow-up detection ──────────────────────────────────────────

/** English function / request words that carry no new subject. */
const EN_FUNCTION_RE =
  /^(?:the|a|an|is|are|was|were|be|been|being|am|do|does|did|can|could|will|would|shall|should|may|might|must|have|has|had|i|me|my|mine|we|our|us|you|your|it|its|this|that|these|those|and|or|but|if|then|than|so|very|really|just|also|too|any|some|more|most|much|many|about|tell|tells|told|give|gives|given|show|shows|shown|explain|explains|explained|detail|details|information|info|please|what|which|who|whom|whose|where|when|how|why|of|on|in|at|to|for|from|with|by|as|there|here|got|get|like|need|want|know|full|complete|scheme|card)$/iu;

/** Telugu function words that carry no new subject. */
const TE_FUNCTION_RE =
  /^(?:మరిన్ని|వివరాలు|వివరంగా|వివరము|గురించి|చెప్పండి|చెప్పు|దయచేసి|ఇంకా|ఏమిటి|ఏమి|ఎంత|ఈ|ఆ|ఇవి|అవి|కొరకు|లో|మరియు)$/iu;

/**
 * True when the message introduces a new subject (proper noun / entity) after
 * stripping scheme names, topic words, anaphora and function words. Used to
 * stop vague anaphora ("tell me more about <new scheme>") from inheriting the
 * previous scheme.
 */
function hasNewEntity(rawText) {
  let t = ` ${normalise(rawText)} `;
  t = t.replace(new RegExp(SCHEME_NAME_SRC, "giu"), " ");
  t = t.replace(new RegExp(TOPIC_SRC, "giu"), " ");
  t = t.replace(new RegExp(ANAPHORA_SRC, "giu"), " ");
  t = t.replace(/[\u0C00-\u0C7F]+/gu, (m) => (TE_FUNCTION_RE.test(m) ? " " : m));
  t = t.replace(/[a-zA-Z0-9]+/gu, (m) => (EN_FUNCTION_RE.test(m) ? " " : m));
  t = t.replace(/[^0-9\u0C00-\u0C7Fa-zA-Z\s]/gu, " ");
  return t.trim().length > 0;
}

/**
 * True when the message is a genuine follow-up that depends on the previously
 * discussed scheme ("what documents do I need?", "tell me more", "పత్రాలు ఏమిటి?").
 */
export function isContextualFollowUp(rawText) {
  const text = normalise(rawText);
  if (!text) return false;
  if (detectConversationalIntent(text)) return false;
  if (SCHEME_NAME_RE.test(text)) return false;

  // Explicit topic asks ("documents", "benefits", "apply") always qualify.
  if (TOPIC_RE.test(text)) return true;

  if (!ANAPHORA_RE.test(text)) return false;

  // Vague anaphora ("tell me more") only refers back to the scheme when it
  // introduces no new subject; "tell me more about ayushman bharat" brings in a
  // new topic and must be clarified instead of inheriting the old scheme.
  return !hasNewEntity(text);
}

/** True when the message is broadly about farming/scheme topics (needs clarification). */
export function isLikelyFarmerTopic(rawText) {
  const text = normalise(rawText);
  if (!text) return false;
  return FARMER_TOPIC_RE.test(text);
}

/**
 * Decide whether the previous scheme may be applied to the current message.
 * Never when the message already resolved to a scheme, never for chit-chat,
 * never without a prior scheme.
 */
export function shouldInheritScheme({ text, hasSchemeMatch = false, lastSchemeId = null }) {
  if (hasSchemeMatch || !lastSchemeId) return false;
  return isContextualFollowUp(text);
}

/** Remove leading fillers / pleasantry so "hello yes" is recognised as "yes". */
export function stripLeadingChitChat(rawText) {
  let t = String(rawText || "").trim();
  let prev = null;
  while (t !== prev) {
    prev = t;
    t = t.replace(LEADING_CHIT_RE, "");
  }
  return t.trim();
}

// ── Eligibility answer classification (PM-KISAN screening) ──────────────────

/** Ambiguous replies that must never be read as a Yes/No answer. */
const AMBIGUOUS_ANSWER_RE =
  /\b(i don'?t know|dont know|do not know|not sure|no idea|unsure|uncertain|maybe|perhaps|possibly|can'?t say|cannot say|not certain|i guess)\b|తెలియదు|బహుశా|ఏమో/iu;

// Ownership step: an explicit negation of ownership reads as NO, otherwise an
// ownership/affirmative marker reads as YES. Checked in that order so "I do not
// own land" is NO and "I own 2 acres" is YES.
const LAND_NO_RE =
  /\b(no|nope|nah|not|never|don'?t|dont|do not|cannot|can'?t|tenant|landless|without land|no land|have no|don'?t own|do not own|not own|don'?t have|do not have|not have)\b|లేదు|కాదు|కౌలు|లేని|భూమి లేదు/iu;
const LAND_YES_RE =
  /\b(yes|yeah|yep|yup|correct|right|i own|we own|own land|own agricultural|have land|have agricultural|i have|we have|have got|acres?|landholding)\b|అవును|ఉంది|భూమి ఉంది|ఉన్నాయి|ఉన్నది/iu;

// Exclusion step: "None of these" / plain "no" means no exclusion applies (→
// eligible path); an exclusion marker or an affirmative + exclusion detail
// means an exclusion applies (→ not eligible).
const EXCL_NONE_RE =
  /\b(none|none of these|neither|nothing|no exclusions?|no one|nobody|no)\b|ఎవరూ లేరు|వర్తించదు|కాదు|లేదు/iu;
const EXCL_APPLIES_RE =
  /\b(yes|applies|one applies|an exclusion applies|tax|minister|mp|mla|mayor|pension|government|govt|employee|officer|doctor|engineer|lawyer|chartered|architect|paid)\b|వర్తిస్తుంది|అవును|ఉద్యోగి|పెన్షన్|పన్ను/iu;

/**
 * Classify an eligibility answer for a screening step.
 * Returns "yes" | "no" (land_ownership) or "none" | "applies" (exclusions),
 * or null when the message is not a valid answer for that step (ambiguous,
 * out-of-order, or unrelated) — the caller should then re-ask the question.
 */
export function classifyEligibilityAnswer(rawText, step) {
  const text = normalise(rawText);
  if (!text) return null;

  // Ambiguity wins: never turn "I don't know" into a Yes/No determination.
  if (AMBIGUOUS_ANSWER_RE.test(text)) return null;

  if (step === "land_ownership") {
    if (LAND_NO_RE.test(text)) return "no";
    if (LAND_YES_RE.test(text)) return "yes";
    return null;
  }

  if (step === "exclusions") {
    // An affirmative + exclusion detail means an exclusion applies; otherwise a
    // "none of these" / "no" marker means no exclusion applies.
    if (EXCL_APPLIES_RE.test(text) && !/\bnone of these\b/iu.test(text)) return "applies";
    if (EXCL_NONE_RE.test(text)) return "none";
    return null;
  }

  return null;
}

/**
 * True when the message explicitly asks to check the user's own eligibility
 * (the trigger for starting the PM-KISAN screening flow). Deliberately excludes
 * bare pronouns ("nenu …") and application questions ("can I apply …"), which
 * are informational instead.
 */
export function isEligibilityDecisionQuery(rawText) {
  const text = normalise(rawText);
  if (!text) return false;
  return (
    /\b(am i eligible|am i qualify|do i qualify|can i qualify|i qualify|check my eligibility|my eligibility|eligible for me|eligibility for me)\b/iu.test(
      text
    ) ||
    /నేను అర్హ|అర్హుడినా|అర్హుడనా|అర్హురాలినా|నాకు అర్హత|నాకు వస్తుందా/u.test(text) ||
    /\b(nenu eligible|eligible aa|avutaana|avutanu|arthudu|arthulaa|arthuralaa)\b/iu.test(text)
  );
}

/** True when the message names one of the verified schemes (for router decisions). */
export function hasSchemeName(rawText) {
  return SCHEME_NAME_RE.test(normalise(rawText));
}
