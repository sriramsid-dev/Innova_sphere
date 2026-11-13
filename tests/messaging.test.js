import test from "node:test";
import assert from "node:assert/strict";
import { translations } from "../src/translations/i18n.js";
import { queryAssistant } from "../src/services/searchService.js";

// Any specific scheme name or acronym in conversational copy would re-introduce
// the fixed shortlist the assistant must not claim.
const SCHEME_MENTIONS = [
  /pm[\s-]?kisan/i,
  /pmfby/i,
  /kisan credit/i,
  /soil health/i,
  /పీఎం[\s-]?కిసాన్/u,
  /పీఎంఎఫ్/u,
  /కిసాన్ క్రెడిట్/u,
  /సాయిల్/u,
];

// Claims that the catalogue is a fixed, small set ("four schemes", "నాలుగు").
const FIXED_CATALOGUE_CLAIMS = [/\bfour\b/i, /\bonly cover\b/i, /నాలుగు/u];

const CONVERSATIONAL_KEYS = [
  "chatWelcome",
  "assistantGreeting",
  "assistantIdentity",
  "assistantCapabilities",
  "assistantClarify",
  "assistantOffTopic",
];

const TELUGU = /[\u0C00-\u0C7F]/u;

// Route the API offline so the deterministic client paths are exercised.
const offline = () => {
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
};

function assertSchemeAgnostic(text, label) {
  assert.equal(typeof text, "string", `${label}: must be a string`);
  assert.ok(text.trim().length > 0, `${label}: must not be empty`);
  for (const re of SCHEME_MENTIONS) {
    assert.ok(!re.test(text), `${label}: must not name a specific scheme (${re})`);
  }
  for (const re of FIXED_CATALOGUE_CLAIMS) {
    assert.ok(!re.test(text), `${label}: must not claim a fixed catalogue size (${re})`);
  }
}

test("conversational copy names no scheme in English or Telugu", () => {
  for (const lang of ["en", "te"]) {
    for (const key of CONVERSATIONAL_KEYS) {
      assertSchemeAgnostic(translations[lang][key], `${lang}.${key}`);
    }
  }
});

test("conversational copy is written in the requested language", () => {
  for (const key of CONVERSATIONAL_KEYS) {
    assert.ok(!TELUGU.test(translations.en[key]), `en.${key}: must not contain Telugu script`);
    assert.ok(TELUGU.test(translations.te[key]), `te.${key}: must contain Telugu script`);
  }
});

test("English and Telugu define the same translation keys", () => {
  const en = Object.keys(translations.en).sort();
  const te = Object.keys(translations.te).sort();
  assert.deepEqual(te, en);
});

test("chit-chat replies are scheme-agnostic and carry no card", async () => {
  offline();
  const cases = [
    ["en", "hello"],
    ["en", "what is your name?"],
    ["en", "what can you do?"],
    ["te", "నమస్కారం"],
    ["te", "నీ పేరు ఏమిటి?"],
    ["te", "ఏం చేయగలవు?"],
  ];

  for (const [lang, text] of cases) {
    const r = await queryAssistant(text, lang, {});
    assert.equal(r.status, "conversational", `${lang}: ${text} → conversational`);
    assert.equal(r.primaryScheme ?? null, null, `${lang}: ${text} → no card`);
    assert.equal((r.matchedSchemes || []).length, 0, `${lang}: ${text} → no matched schemes`);
    assertSchemeAgnostic(r.message, `${lang}: ${text}`);
  }
});

test("clarify and off-topic replies stay scheme-agnostic", async () => {
  offline();
  const cases = [
    ["en", "which schemes are available?", "clarify"],
    ["en", "what is the capital of India?", "off_topic"],
    ["te", "ఏ పథకాలు అందుబాటులో ఉన్నాయి?", "off_topic"],
  ];

  for (const [lang, text, expectedStatus] of cases) {
    const r = await queryAssistant(text, lang, {});
    assert.equal(r.status, expectedStatus, `${lang}: ${text} → ${expectedStatus}`);
    assert.equal(r.primaryScheme ?? null, null, `${lang}: ${text} → no card`);
    assertSchemeAgnostic(r.message, `${lang}: ${text}`);
  }
});

test("example chips stay resolvable and are not PM-KISAN dominated", async () => {
  // Mirrors the chip lists in src/components/AssistantPanel.jsx.
  const chips = {
    en: [
      "Tell me about PM-KISAN",
      "What documents are required for crop insurance?",
      "What are the eligibility criteria for crop insurance?",
      "How do I get a crop loan from PACS?",
    ],
    te: [
      "పీఎం-కిసాన్ గురించి చెప్పండి",
      "పంట బీమాకు అవసరమైన పత్రాలు ఏమిటి?",
      "పంట బీమా అర్హత నిబంధనలు ఏమిటి?",
      "PACS నుండి పంట రుణం ఎలా పొందాలి?",
    ],
  };

  offline();
  for (const [lang, list] of Object.entries(chips)) {
    assert.equal(list.length, 4, `${lang}: four chips`);
    const pmKisan = list.filter((q) => /pm[\s-]?kisan|పీఎం[\s-]?కిసాన్/iu.test(q));
    assert.ok(pmKisan.length <= 1, `${lang}: at most one PM-KISAN chip`);

    for (const q of list) {
      const r = await queryAssistant(q, lang, {});
      assert.equal(r.status, "found", `${lang}: chip "${q}" should resolve to a verified scheme`);
      assert.ok(r.primaryScheme?.id, `${lang}: chip "${q}" should show a scheme card`);
      assert.ok(r.message.trim().length > 0, `${lang}: chip "${q}" should answer`);
    }
  }
});
