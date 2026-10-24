import test from "node:test";
import assert from "node:assert/strict";
import { findBestSchemeMatch } from "../src/services/searchService.js";

// A fixture mirroring the live verified dataset (the local sample data only
// ships 3 schemes and omits Soil Health Card, so soil behaviour is tested here
// at the matcher level). KCC and PACS are separate to verify they no longer tie
// on the same phrase.
const SCHEMES = [
  { id: "pm-kisan", code: "PM-KISAN", en: { name: "Pradhan Mantri Kisan Samman Nidhi" }, te: { name: "ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి" } },
  { id: "pmfby", code: "PMFBY", en: { name: "Pradhan Mantri Fasal Bima Yojana" }, te: { name: "ప్రధాన మంత్రి ఫసల్ బీమా యోజన" } },
  { id: "kisan-credit-card", code: "KCC", en: { name: "Kisan Credit Card" }, te: { name: "కిసాన్ క్రెడిట్ కార్డు" } },
  { id: "pacs-coop-credit", code: "PACS-COOP", en: { name: "PACS Cooperative Credit" }, te: { name: "పిఎసిఎస్ సహకార రుణం" } },
  { id: "soil-health-card", code: "SHC", en: { name: "Soil Health Card" }, te: { name: "నేల ఆరోగ్య కార్డు" } },
];

const match = (text, lang = "en") => findBestSchemeMatch(text, SCHEMES, lang)?.id || null;

test("explicit scheme identifiers always resolve", () => {
  const cases = [
    ["tell me about PM-KISAN", "pm-kisan"],
    ["explain PMFBY", "pmfby"],
    ["kisan credit card", "kisan-credit-card"],
    ["soil health card", "soil-health-card"],
    ["pm kisan samman nidhi", "pm-kisan"],
    ["crop insurance", "pmfby"],
    ["crop loan", "kisan-credit-card"],
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
    ["rythu runam", "kisan-credit-card", "en"],
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
    ["crop loan for kisan", "kisan-credit-card"],
    ["fertilizer subsidy for farmers", "pacs-coop-credit"],
    ["kisan insurance", "pmfby"],
  ];
  for (const [text, expected] of cases) {
    assert.equal(match(text), expected, `generic+agri: ${text}`);
  }
});

test("an ambiguous bare finance word with agriculture context clarifies instead of guessing", () => {
  // "loan" alone could be KCC or PACS — no card should be shown.
  assert.equal(match("farm loan"), null);
  assert.equal(match("kisan loan"), null);
});

test("KCC and PACS do not tie on the same phrase", () => {
  // "credit card" used to match both and PACS won by array order.
  assert.equal(match("kisan credit card"), "kisan-credit-card");
  assert.equal(match("crop loan for kisan"), "kisan-credit-card");
  // PACS wins only when its own identifiers are present.
  assert.equal(match("pacs loan"), "pacs-coop-credit");
  assert.equal(match("cooperative society credit"), "pacs-coop-credit");
});

test("unrelated text and unknown schemes match nothing", () => {
  for (const text of [
    "what is the capital of India?",
    "tell me a joke",
    "the weather is nice",
    "stock market tips",
    "explain Ayushman Bharat",
    "who won the world cup",
  ]) {
    assert.equal(match(text), null, `no match: ${text}`);
  }
});

test("bare 'kisan' with no scheme context matches nothing (clarify path)", () => {
  assert.equal(match("kisan"), null);
});
