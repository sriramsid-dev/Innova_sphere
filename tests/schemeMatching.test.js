import test from "node:test";
import assert from "node:assert/strict";
import { findBestSchemeMatch, findSchemeMatches } from "../src/services/searchService.js";

// The five schemes the app ships with. None of these ids is named in the
// matcher source any more — the index is built from each record's own fields.
const SCHEMES = [
  { id: "pm-kisan", code: "PM-KISAN", en: { name: "Pradhan Mantri Kisan Samman Nidhi" }, te: { name: "ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి" } },
  { id: "pmfby", code: "PMFBY", en: { name: "Pradhan Mantri Fasal Bima Yojana" }, te: { name: "ప్రధాన మంత్రి ఫసల్ బీమా యోజన" } },
  { id: "kisan-credit-card", code: "KCC", en: { name: "Kisan Credit Card" }, te: { name: "కిసాన్ క్రెడిట్ కార్డు" } },
  { id: "pacs-coop-credit", code: "PACS-COOP", en: { name: "PACS Cooperative Credit" }, te: { name: "పిఎసిఎస్ సహకార రుణం" } },
  { id: "soil-health-card", code: "SHC", en: { name: "Soil Health Card" }, te: { name: "నేల ఆరోగ్య కార్డు" } },
];

const match = (text, lang = "en", schemes = SCHEMES) => findBestSchemeMatch(text, schemes, lang)?.id || null;

test("explicit scheme identifiers always resolve", () => {
  const cases = [
    ["tell me about PM-KISAN", "pm-kisan"],
    ["explain PMFBY", "pmfby"],
    ["kisan credit card", "kisan-credit-card"],
    ["soil health card", "soil-health-card"],
    ["pm kisan samman nidhi", "pm-kisan"],
    ["crop insurance", "pmfby"],
    ["PACS cooperative loan", "pacs-coop-credit"],
    ["Pradhan Mantri Fasal Bima Yojana", "pmfby"],
  ];
  for (const [text, expected] of cases) {
    assert.equal(match(text), expected, `explicit: ${text}`);
  }
});

test("Telugu and transliteration scheme names resolve", () => {
  const cases = [
    ["పీఎం కిసాన్ గురించి", "pm-kisan", "te"],
    ["పంట బీమా ఏమిటి", "pmfby", "te"],
    ["పీఎం ఫసల్ బీమా", "pmfby", "te"],
    ["panta bima gurinchi", "pmfby", "en"],
    ["nela pariksham enti", "soil-health-card", "en"],
  ];
  for (const [text, expected, lang] of cases) {
    assert.equal(match(text, lang), expected, `translit: ${text}`);
  }
});

test("a generic word alone (no agriculture context) matches nothing", () => {
  for (const text of [
    "my car insurance expired",
    "I have a credit card bill",
    "what is income tax?",
    "tell me about insurance",
    "I need a loan for my shop",
  ]) {
    assert.equal(match(text), null, `false positive: ${text}`);
  }
});

test("a generic word WITH agriculture context resolves the scheme", () => {
  const cases = [
    ["my crop insurance claim", "pmfby"],
    ["soil test", "soil-health-card"],
    ["kisan insurance", "pmfby"],
  ];
  for (const [text, expected] of cases) {
    assert.equal(match(text), expected, `generic+agri: ${text}`);
  }
});

test("ambiguous generic finance words clarify instead of guessing", () => {
  // These used to be pinned to one scheme by hardcoded keyword lists. Without a
  // record-specific word they are genuinely ambiguous (KCC vs PACS both provide
  // credit), so no card should be shown.
  for (const text of [
    "farm loan",
    "kisan loan",
    "crop loan",
    "crop loan for kisan",
    "rythu runam", // farmer loan: could be KCC or PACS cooperative credit
    "fertilizer subsidy for farmers", // input supply, not a scheme identity
  ]) {
    assert.equal(match(text), null, `ambiguous: ${text}`);
  }
});

test("KCC and PACS do not tie on the same phrase", () => {
  assert.equal(match("kisan credit card"), "kisan-credit-card");
  // PACS wins only when its own identifiers are present.
  assert.equal(match("pacs loan"), "pacs-coop-credit");
  assert.equal(match("cooperative society credit"), "pacs-coop-credit");
});

test("record tags resolve a phrase that is otherwise ambiguous", () => {
  // Same corpus, but the KCC record now carries the tags a real row would have.
  const tagged = SCHEMES.map((scheme) =>
    scheme.id === "kisan-credit-card"
      ? { ...scheme, tags: ["kcc", "crop loan", "credit"] }
      : scheme
  );
  assert.equal(match("crop loan", "en", tagged), "kisan-credit-card");
  // Without those tags the same phrase stays ambiguous.
  assert.equal(match("crop loan"), null);
});

test("unrelated text and unknown schemes match nothing", () => {
  for (const text of [
    "what is the capital of India?",
    "tell me a joke",
    "the weather is nice",
    "stock market tips",
    "explain Ayushman Bharat", // no such record in this corpus
    "who won the world cup",
  ]) {
    assert.equal(match(text), null, `no match: ${text}`);
  }
});

test("bare 'kisan' with no scheme context matches nothing (clarify path)", () => {
  assert.equal(match("kisan"), null);
});

// ── Data-driven matching: scheme ids that never appeared in source ───────────
// This is the regression that made the assistant PM-KISAN-centric: previously
// any record whose id was not in a hardcoded table was skipped entirely.

const SYNTHETIC = [
  ...SCHEMES,
  {
    id: "ayushman-bharat",
    code: "PM-JAY",
    en: { name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana" },
    te: { name: "ఆయుష్మాన్ భారత్" },
    tags: ["health insurance"],
  },
  {
    id: "kisan-samridhi-yojana",
    code: "KSY",
    // No names at all: the slug alone must still be searchable.
    en: { name: "" },
    te: { name: "" },
  },
  {
    id: "rythu-bharosa",
    code: "RB",
    en: { name: "Rythu Bharosa" },
    te: { name: "రైతు భరోసా" },
  },
];

test("a scheme with an id the old matcher never knew is matched by name", () => {
  assert.equal(match("explain Ayushman Bharat", "en", SYNTHETIC), "ayushman-bharat");
  assert.equal(
    match("Ayushman Bharat Pradhan Mantri Jan Arogya Yojana", "en", SYNTHETIC),
    "ayushman-bharat"
  );
});

test("a partial name resolves through the head word of the record", () => {
  assert.equal(match("tell me about ayushman", "en", SYNTHETIC), "ayushman-bharat");
  // A record with no names is still reachable through its slug.
  assert.equal(match("tell me about kisan samridhi", "en", SYNTHETIC), "kisan-samridhi-yojana");
});

test("aliases on a record are matched without any code change", () => {
  const withAlias = SYNTHETIC.map((scheme) =>
    scheme.id === "ayushman-bharat" ? { ...scheme, aliases: ["PMJAY", "Ayushman card"] } : scheme
  );
  assert.equal(match("explain pmjay", "en", withAlias), "ayushman-bharat");
  assert.equal(match("ayushman card details", "en", withAlias), "ayushman-bharat");
});

test("Rythu Bharosa is not PM-KISAN", () => {
  // Regression: "rythu bharos*" lived in PM-KISAN's generic keyword list, so an
  // unrelated scheme name produced a PM-KISAN card.
  assert.equal(match("Tell me about Rythu Bharosa scheme"), null);
  assert.equal(match("rythu bharosa"), null);

  // When the record exists it is matched as itself.
  assert.equal(match("Tell me about Rythu Bharosa scheme", "en", SYNTHETIC), "rythu-bharosa");

  // And it still never resolves to PM-KISAN.
  const other = SYNTHETIC.filter((scheme) => scheme.id !== "rythu-bharosa");
  assert.equal(match("rythu bharosa", "en", other), null);
});

test("a Telugu-only record is matched from a Telugu query", () => {
  assert.equal(match("ఆయుష్మాన్ గురించి చెప్పండి", "te", SYNTHETIC), "ayushman-bharat");
});

test("schemes unknown to the corpus stay unmatched (no invented card)", () => {
  for (const text of [
    "explain Pradhan Mantri Awas Yojana",
    "what is the capital of India?",
    "tell me about some other scheme",
  ]) {
    assert.equal(match(text, "en", SYNTHETIC), null, `unknown: ${text}`);
  }
});

test("the ranked helper returns every plausible scheme, best first", () => {
  const ranked = findSchemeMatches("difference between pm kisan and pmfby", SCHEMES, "en");
  const ids = ranked.map((entry) => entry.scheme.id);

  assert.ok(ids.includes("pm-kisan"), "pm-kisan should be ranked");
  assert.ok(ids.includes("pmfby"), "pmfby should be ranked");
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i - 1].score >= ranked[i].score, "scores must be descending");
  }

  // Single best match keeps the previous contract (one scheme, or null).
  assert.equal(match("difference between pm kisan and pmfby"), "pm-kisan");
});

test("English and Telugu names do not dilute each other's overlap", () => {
  // Two of three English name words present must count as a strong partial even
  // though the record also carries a Telugu name.
  assert.equal(match("cooperative society credit"), "pacs-coop-credit");
});
