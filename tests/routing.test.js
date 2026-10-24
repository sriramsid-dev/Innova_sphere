import test from "node:test";
import assert from "node:assert/strict";
import { shouldInheritScheme } from "../src/services/intent.js";
import { queryAssistant } from "../src/services/searchService.js";

const lastSchemeId = "pmfby";

// Route the API offline so the deterministic rule-based path is exercised.
const offline = () => {
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
};

// Mock the /api/chat server response.
const mockServer = (status, body, jsonOk = true) => {
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (!jsonOk) throw new Error("invalid json");
      return body;
    },
  });
};

const flowLand = { eligibilityState: { schemeId: "pm-kisan", step: "land_ownership" } };
const flowExcl = { eligibilityState: { schemeId: "pm-kisan", step: "exclusions" } };

// Table-driven: [label, text, context, lang, expectedStatus, expectedCardId, expectedStepOrNull]
const ROUTES = [
  // Chit-chat — no card, flow state preserved.
  ["greeting keeps no card", "hello", { lastSchemeId }, "en", "conversational", null, null],
  ["greeting after PM-KISAN keeps no card", "hello", { lastSchemeId: "pm-kisan" }, "en", "conversational", null, null],
  ["identity", "what is your name?", { lastSchemeId }, "en", "conversational", null, null],
  ["thanks", "thank you", { lastSchemeId }, "en", "conversational", null, null],
  ["farewell", "bye", { lastSchemeId }, "en", "conversational", null, null],
  ["acknowledgement", "okay", { lastSchemeId }, "en", "conversational", null, null],
  ["telugu greeting", "నమస్కారం", { lastSchemeId }, "te", "conversational", null, null],
  // Chit-chat mid-flow preserves the flow state (chips stay).
  ["greeting mid-flow keeps state", "hello", flowLand, "en", "conversational", null, "land_ownership"],
  ["thanks mid-flow keeps state", "thanks", flowLand, "en", "conversational", null, "land_ownership"],

  // Mixed intent: a greeting + a valid answer advances the flow.
  ["hello yes advances", "hello yes", flowLand, "en", "eligibility_question", "pm-kisan", "exclusions"],

  // Eligibility answers.
  ["yes advances to exclusions", "yes", flowLand, "en", "eligibility_question", "pm-kisan", "exclusions"],
  ["i own 2 acres advances", "i own 2 acres", flowLand, "en", "eligibility_question", "pm-kisan", "exclusions"],
  ["no ends (landless)", "i do not own land", flowLand, "en", "eligibility_result", "pm-kisan", null],
  ["telugu no ends", "నాకు భూమి లేదు", flowLand, "te", "eligibility_result", "pm-kisan", null],
  ["ambiguous land re-asks", "i don't know", flowLand, "en", "eligibility_question", "pm-kisan", "land_ownership"],
  ["not sure re-asks", "not sure", flowLand, "en", "eligibility_question", "pm-kisan", "land_ownership"],
  ["out-of-order none re-asks", "none of these", flowLand, "en", "eligibility_question", "pm-kisan", "land_ownership"],
  ["exclusions none is eligible", "none of these", flowExcl, "en", "eligibility_result", "pm-kisan", null],
  ["exclusions applies", "yes, an exclusion applies", flowExcl, "en", "eligibility_result", "pm-kisan", null],
  ["exclusions ambiguous re-asks", "i don't know", flowExcl, "en", "eligibility_question", "pm-kisan", "exclusions"],

  // Mid-flow topic change answers and ends the flow.
  ["mid-flow scheme question ends flow", "tell me about PMFBY", flowLand, "en", "found", "pmfby", null],
  ["mid-flow follow-up answers & ends flow", "what documents do I need?", flowLand, "en", "found", "pm-kisan", null],

  // Eligibility flow start / informational.
  ["start flow", "am I eligible for PM-KISAN?", {}, "en", "eligibility_question", "pm-kisan", "land_ownership"],
  ["telugu start flow", "పీఎం కిసాన్‌కు నేను అర్హుడినా?", {}, "te", "eligibility_question", "pm-kisan", "land_ownership"],
  ["can i apply is informational", "can I apply for PM-KISAN?", {}, "en", "found", "pm-kisan", null],
  ["bare nenu does not start flow", "nenu pm kisan gurinchi adagali", {}, "en", "found", "pm-kisan", null],

  // Follow-ups inherit the previous scheme.
  ["docs follow-up", "what documents do I need?", { lastSchemeId }, "en", "found", "pmfby", null],
  ["tell me more", "tell me more", { lastSchemeId }, "en", "found", "pmfby", null],
  ["telugu docs follow-up", "పత్రాలు ఏమిటి?", { lastSchemeId }, "te", "found", "pmfby", null],
  ["translit docs follow-up", "patralu emiti?", { lastSchemeId }, "en", "found", "pmfby", null],
  ["follow-up without context clarifies", "what documents do I need?", {}, "en", "clarify", null, null],

  // Topic change / new subject never inherits.
  ["new subject no inherit", "tell me more about ayushman", { lastSchemeId }, "en", "off_topic", null, null],

  // False positives → no card.
  ["insurance alone clarifies", "my car insurance expired", {}, "en", "clarify", null, null],
  ["income tax off-topic", "what is income tax?", {}, "en", "off_topic", null, null],
  ["credit card bill clarifies", "I have a credit card bill", {}, "en", "clarify", null, null],
  ["capital of India off-topic", "what is the capital of India?", {}, "en", "off_topic", null, null],
  ["greeting + off-topic is off-topic", "hello, what is the capital of India?", {}, "en", "off_topic", null, null],
  ["voice filler greeting", "um hello", { lastSchemeId }, "en", "conversational", null, null],
];

test("queryAssistant routes the full matrix deterministically", async () => {
  offline();
  for (const [label, text, ctx, lang, expStatus, expCard, expStep] of ROUTES) {
    const r = await queryAssistant(text, lang, ctx);
    assert.equal(r.status, expStatus, `${label}: status`);
    assert.equal(r.primaryScheme?.id || null, expCard, `${label}: card`);
    assert.equal(r.eligibilityState?.step || null, expStep, `${label}: state`);
    if (expCard === null) assert.equal((r.matchedSchemes || []).length, 0, `${label}: matchedSchemes`);
  }
});

test("Telugu queries return Telugu text and Telugu scheme names", async () => {
  offline();
  const cases = [
    ["హలో", "conversational"],
    ["పీఎం కిసాన్ గురించి చెప్పండి", "found"],
    ["పత్రాలు ఏమిటి?", "found"],
  ];
  for (const [text, status] of cases) {
    const r = await queryAssistant(text, "te", { lastSchemeId: "pmfby" });
    assert.equal(r.status, status, `te status: ${text}`);
    assert.ok(/[\u0C00-\u0C7F]/.test(r.message), `te message: ${text}`);
  }
});

// ── Server / API / model failure handling ────────────────────────────────────

test("chit-chat never calls the API even when the server is up", async () => {
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return { ok: true, status: 200, json: async () => ({ message: "server", primaryScheme: { id: "pmfby" } }) };
  };
  const r = await queryAssistant("hello", "en", { lastSchemeId });
  assert.equal(called, 0);
  assert.equal(r.status, "conversational");
  assert.equal(r.primaryScheme ?? null, null);
});

test("an unmatched query never surfaces a server-provided card", async () => {
  mockServer(200, { status: "ok", message: "server off-topic", primaryScheme: { id: "pmfby" } });
  const r = await queryAssistant("what is the capital of India?", "en", {});
  assert.equal(r.primaryScheme, null);
});

test("the card comes from the client-resolved scheme, not a mismatched server card", async () => {
  mockServer(200, { status: "ok", message: "server docs", primaryScheme: { id: "pm-kisan" } });
  const r = await queryAssistant("what documents do I need?", "en", { lastSchemeId: "pmfby" });
  assert.equal(r.primaryScheme?.id, "pmfby");
});

test("a valid server card for the resolved scheme is used", async () => {
  mockServer(200, { status: "ok", message: "server pmfby", primaryScheme: { id: "pmfby" } });
  const r = await queryAssistant("explain PMFBY", "en", {});
  assert.equal(r.primaryScheme?.id, "pmfby");
  assert.equal(r.usedGemini, true);
  assert.equal(r.eligibilityState, null);
});

test("API failures fall back to the verified rule-based answer with no invented card", async () => {
  for (const [status, body, jsonOk] of [
    [500, { error: "boom" }, true],
    [503, { error: "unavailable" }, true],
    [200, null, false], // invalid JSON
    [200, { status: "ok", message: "" }, true], // empty message
  ]) {
    mockServer(status, body, jsonOk);
    const r = await queryAssistant("explain PMFBY", "en", {});
    assert.equal(r.status, "found", `fallback status ${status}`);
    assert.equal(r.primaryScheme?.id, "pmfby", `fallback card ${status}`);
    assert.equal(r.usedGemini, undefined, `fallback not gemini ${status}`);
    assert.ok(r.message.length > 0, `fallback message ${status}`);
  }
});

test("eligibility screening is never routed through the server", async () => {
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return { ok: true, status: 200, json: async () => ({ message: "server" }) };
  };
  const r = await queryAssistant("yes", "en", flowLand);
  assert.equal(called, 0);
  assert.equal(r.status, "eligibility_question");
  assert.equal(r.eligibilityState?.step, "exclusions");
});

test("a genuine follow-up inherits the last scheme", () => {
  for (const text of [
    "what documents do I need?",
    "what are the benefits?",
    "how do I apply?",
    "tell me more",
    "పత్రాలు ఏమిటి?",
    "అర్హత ఏమిటి?",
  ]) {
    assert.equal(
      shouldInheritScheme({ text, hasSchemeMatch: false, lastSchemeId }),
      true,
      `should inherit: ${text}`
    );
  }
});

test("greetings never inherit the last scheme", () => {
  for (const text of ["hello", "hi", "good morning", "నమస్కారం", "namaskaram"]) {
    assert.equal(
      shouldInheritScheme({ text, hasSchemeMatch: false, lastSchemeId }),
      false,
      `must not inherit: ${text}`
    );
  }
});

test("identity, thanks, farewells, acknowledgements never inherit the last scheme", () => {
  for (const text of ["what is your name?", "thank you", "bye", "okay", "నీ పేరు ఏమిటి?"]) {
    assert.equal(
      shouldInheritScheme({ text, hasSchemeMatch: false, lastSchemeId }),
      false,
      `must not inherit: ${text}`
    );
  }
});

test("off-topic text never inherits the last scheme", () => {
  for (const text of [
    "tell me a joke",
    "what is the capital of India?",
    "what is the weather today",
    "ayushman bharat",
  ]) {
    assert.equal(
      shouldInheritScheme({ text, hasSchemeMatch: false, lastSchemeId }),
      false,
      `must not inherit: ${text}`
    );
  }
});

test("an explicit scheme match always wins over inheritance", () => {
  assert.equal(
    shouldInheritScheme({ text: "what documents do I need?", hasSchemeMatch: true, lastSchemeId }),
    false
  );
});

test("no inheritance without a previous scheme", () => {
  assert.equal(
    shouldInheritScheme({ text: "what documents do I need?", hasSchemeMatch: false, lastSchemeId: null }),
    false
  );
});
