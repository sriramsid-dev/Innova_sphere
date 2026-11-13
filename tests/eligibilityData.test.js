import test from "node:test";
import assert from "node:assert/strict";
import {
  queryAssistant,
  handleEligibilityScreening,
  canScreenEligibility,
  buildSchemeOverview,
} from "../src/services/searchService.js";
import { SCHEMES_DATA } from "../src/data/schemes.js";

const offline = () => {
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
};

const PM_KISAN = SCHEMES_DATA.find((s) => s.id === "pm-kisan");

// Synthetic records — test-only, never added to production data.
const AYUSHMAN = {
  id: "ayushman-bharat",
  code: "AB-PMJAY",
  verifiedOfficialUrl: "https://pmjay.gov.in",
  en: {
    name: "Ayushman Bharat PM-JAY",
    shortDescription: "",
    eligibility: [
      "Families identified by the SECC 2011 deprivation and occupational criteria.",
      "Exclusions: households with a government employee or an income-tax payer.",
    ],
    requiredDocuments: ["Aadhaar card", "Ration card"],
    benefits: ["₹5 lakh per family per year for secondary and tertiary hospitalisation."],
    applicationSteps: [],
  },
  te: {
    name: "ఆయుష్మాన్ భారత్",
    shortDescription: "",
    eligibility: ["SECC 2011 ప్రాతిపదికన గుర్తించిన కుటుంబాలు."],
    requiredDocuments: ["ఆధార్ కార్డు"],
    benefits: [],
    applicationSteps: [],
  },
};

const NO_ELIGIBILITY = {
  id: "no-criteria-scheme",
  en: { name: "Scheme Without Criteria", eligibility: [], requiredDocuments: ["Some document"], benefits: [] },
  te: { name: "నిబంధనలు లేని పథకం", eligibility: [], requiredDocuments: [], benefits: [] },
};

const NO_DOCUMENTS = {
  id: "no-docs-scheme",
  en: {
    name: "Scheme Without Document List",
    eligibility: ["Registered cultivators in the notified district."],
    requiredDocuments: [],
    benefits: ["Input subsidy per hectare."],
  },
  te: {
    name: "పత్రాల జాబితా లేని పథకం",
    eligibility: ["నోటిఫైడ్ జిల్లాలో నమోదైన రైతులు."],
    requiredDocuments: [],
    benefits: [],
  },
};

// ── PM-KISAN regression (through the public entry point) ────────────────────

test("PM-KISAN screening still runs and reads its facts from the record", async () => {
  offline();
  const start = await queryAssistant("am I eligible for PM-KISAN?", "en", {});
  assert.equal(start.status, "eligibility_question");
  assert.equal(start.primaryScheme?.id, "pm-kisan");
  assert.equal(start.eligibilityState?.step, "land_ownership");
  // Requirement text comes from the record, not from a hardcoded sentence.
  assert.ok(start.message.includes("All landholding farmer families having cultivable landholding in their names."));
  assert.ok(start.message.includes(PM_KISAN.en.name));

  const exclusions = await queryAssistant("yes", "en", start);
  assert.equal(exclusions.status, "eligibility_question");
  assert.equal(exclusions.eligibilityState?.step, "exclusions");
  assert.ok(exclusions.message.includes("income tax in the last assessment year"));
  // The unverified ₹10,000 pension threshold is gone: the record never states it.
  assert.ok(!exclusions.message.includes("₹10,000"));

  const eligible = await queryAssistant("none of these", "en", exclusions);
  assert.equal(eligible.status, "eligibility_result");
  assert.equal(eligible.eligibilityState, null);
  for (const doc of PM_KISAN.en.requiredDocuments) {
    assert.ok(eligible.message.includes(doc), `document from record: ${doc}`);
  }
  assert.ok(eligible.message.includes("₹6,000"), "benefit from record");
  assert.ok(eligible.message.includes("https://pmkisan.gov.in"), "portal from record");
});

test("PM-KISAN 'not met' result no longer suggests other schemes", async () => {
  offline();
  const start = await queryAssistant("am I eligible for PM-KISAN?", "en", {});
  const notEligible = await queryAssistant("I do not own land", "en", start);

  assert.equal(notEligible.status, "eligibility_result");
  assert.equal(notEligible.eligibilityState, null);
  assert.ok(notEligible.message.includes("All landholding farmer families"));
  assert.ok(!notEligible.message.includes("Kisan Credit Card"));
  assert.ok(!notEligible.message.includes("PMFBY (Crop Insurance)"));
  assert.ok(!notEligible.message.includes("₹10,000"));
});

// ── Another scheme with its own eligibility data ────────────────────────────

test("eligibility renders another scheme's own criteria, exclusions and documents", () => {
  const start = handleEligibilityScreening("start", "start", "en", AYUSHMAN);
  assert.equal(start.status, "eligibility_question");
  assert.equal(start.eligibilityState?.schemeId, "ayushman-bharat", "state carries this scheme's id");
  assert.ok(start.message.includes("Families identified by the SECC 2011 deprivation and occupational criteria."));

  const exclusions = handleEligibilityScreening("yes", "land_ownership", "en", AYUSHMAN);
  assert.equal(exclusions.eligibilityState?.step, "exclusions");
  assert.ok(exclusions.message.includes("government employee or an income-tax payer"));

  const eligible = handleEligibilityScreening("none of these", "exclusions", "en", AYUSHMAN);
  assert.equal(eligible.status, "eligibility_result");
  assert.ok(eligible.message.includes("Aadhaar card"));
  assert.ok(eligible.message.includes("₹5 lakh"));

  // No PM-KISAN facts or thresholds leak into another scheme's flow.
  for (const message of [start.message, exclusions.message, eligible.message]) {
    assert.ok(!/PM-KISAN|PM Kisan/.test(message), "no PM-KISAN reference");
    assert.ok(!/landholding|cultivable/.test(message), "no PM-KISAN land rule");
    assert.ok(!/₹10,000|Group D|eKYC/.test(message), "no PM-KISAN thresholds or documents");
  }
});

test("only schemes with a working flow are reported as screenable", () => {
  assert.equal(canScreenEligibility(PM_KISAN), true);
  // The renderer is generic, but production only offers screening for enrolled
  // schemes — a record cannot be advertised as supported just by having data.
  assert.equal(canScreenEligibility(AYUSHMAN), false);
  assert.equal(canScreenEligibility(NO_ELIGIBILITY), false);
  assert.equal(canScreenEligibility(null), false);
  assert.equal(canScreenEligibility({ id: "pm-kisan", en: { name: "x", eligibility: [] } }), false);
});

test("non-screenable schemes disclose that screening is PM-KISAN only", async () => {
  offline();
  const en = await queryAssistant("what are the eligibility criteria for PMFBY?", "en", {});
  assert.equal(en.status, "found");
  assert.equal(en.primaryScheme?.id, "pmfby");
  assert.ok(en.message.includes("Step-by-step eligibility screening is currently available for PM-KISAN only."));

  const te = await queryAssistant("పంట బీమా అర్హత నిబంధనలు ఏమిటి?", "te", {});
  assert.equal(te.primaryScheme?.id, "pmfby");
  assert.ok(/[\u0C00-\u0C7F]/u.test(te.message));
  assert.ok(te.message.includes("పీఎం-కిసాన్ కోసం మాత్రమే"));
});

// ── Missing data ───────────────────────────────────────────────────────────

test("a record without eligibility data cannot start a screening", () => {
  const result = handleEligibilityScreening("start", "start", "en", NO_ELIGIBILITY);
  assert.equal(result.status, "found");
  assert.equal(result.eligibilityState, null);
  assert.ok(result.message.includes("does not contain eligibility criteria"));
  assert.ok(!result.message.includes("**1."), "must not ask a question");
  assert.ok(!/cultivable|landholding|₹10,000/.test(result.message));

  const te = handleEligibilityScreening("start", "start", "te", NO_ELIGIBILITY);
  assert.ok(/[\u0C00-\u0C7F]/u.test(te.message));
  assert.ok(te.message.includes("అర్హత నిబంధనలు ధృవీకరించిన రికార్డులో లేవు"));
});

test("a missing document list is reported, never filled with invented documents", () => {
  const en = handleEligibilityScreening("none of these", "exclusions", "en", NO_DOCUMENTS);
  assert.equal(en.status, "eligibility_result");
  assert.ok(en.message.includes("Required documents are not listed in the verified record."));
  assert.ok(!/Aadhaar|Patta|Bank Account/.test(en.message));

  const te = handleEligibilityScreening("none of these", "exclusions", "te", NO_DOCUMENTS);
  assert.ok(te.message.includes("అవసరమైన పత్రాల వివరాలు ధృవీకరించిన రికార్డులో అందుబాటులో లేవు"));
  assert.ok(/[\u0C00-\u0C7F]/u.test(te.message));
});

test("a missing description is reported instead of a fabricated one", () => {
  const en = buildSchemeOverview(AYUSHMAN, "en");
  assert.ok(en.includes("This scheme's description is not available in the verified record."));
  assert.ok(!en.includes("Verified government welfare scheme for farmers."));
  assert.ok(en.includes("₹5 lakh"), "record benefits are still shown");

  const te = buildSchemeOverview(AYUSHMAN, "te");
  assert.ok(te.includes("ఈ పథకం వివరణ ధృవీకరించిన రికార్డులో అందుబాటులో లేదు."));
  assert.ok(!te.includes("రైతుల సంక్షేమం కోసం ప్రభుత్వం అందించే పథకం."));
});

// ── Telugu flow parity ─────────────────────────────────────────────────────

test("Telugu screening uses the record's Telugu facts at every step", async () => {
  offline();
  const start = await queryAssistant("పీఎం కిసాన్‌కు నేను అర్హుడినా?", "te", {});
  assert.equal(start.status, "eligibility_question");
  assert.equal(start.eligibilityState?.step, "land_ownership");
  assert.ok(/[\u0C00-\u0C7F]/u.test(start.message));
  assert.ok(start.message.includes("సాగుభూమి"), "Telugu requirement from the record");
  assert.ok(!start.message.includes("₹10,000"));

  const exclusions = await queryAssistant("అవును", "te", start);
  assert.equal(exclusions.eligibilityState?.step, "exclusions");
  assert.ok(exclusions.message.includes("ఆదాయపు పన్ను"), "Telugu exclusion text from the record");
  assert.ok(!exclusions.message.includes("₹10,000"));

  const eligible = await queryAssistant("ఎవరూ లేరు", "te", exclusions);
  assert.equal(eligible.status, "eligibility_result");
  assert.ok(eligible.message.includes("ఆధార్ కార్డు"), "Telugu document from the record");
  assert.ok(/[\u0C00-\u0C7F]/u.test(eligible.message));
});
