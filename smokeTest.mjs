/**
 * Innova Sphere — Post-implementation smoke tests
 * Run: node smokeTest.mjs
 * Server must be running on http://localhost:3001
 */

import { queryAssistant } from "./src/services/searchService.js";

const API = "http://localhost:3001/api/chat";
let passed = 0, failed = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function chat(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ...json, httpStatus: res.status, status: res.status };
}

function assert(condition, detail) {
  if (!condition) throw new Error(detail);
}

async function runTest(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log("PASS");
    passed++;
  } catch (err) {
    console.log(`FAIL -- ${err.message}`);
    failed++;
  }
  await delay(800);
}

console.log("\n--- Core Smoke Tests T1-T10 ---");

await runTest("T1: English PM-KISAN overview", async () => {
  const r = await chat({ query: "Tell me about PM-KISAN", lang: "en" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.usedGemini === true, "Expected Gemini response");
  assert(r.message && r.message.length > 50, "Response too short");
  assert(/pm.?kisan|kisan/i.test(r.message), "Response doesn't mention PM-KISAN");
  assert(r.primaryScheme?.id === "pm-kisan", `primaryScheme was '${r.primaryScheme?.id}'`);
});

await runTest("T2: Telugu PM-KISAN overview", async () => {
  const r = await chat({ query: "\u0c2a\u0c40\u0c0e\u0c02 \u0c15\u0c3f\u0c38\u0c3e\u0c28\u0c4d \u0c17\u0c41\u0c30\u0c3f\u0c02\u0c1a\u0c3f \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.usedGemini === true, "Expected Gemini response");
  assert(r.message && r.message.length > 50, "Response too short");
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu characters");
  assert(r.primaryScheme?.id === "pm-kisan", `primaryScheme was '${r.primaryScheme?.id}'`);
});

await runTest("T3: Server detects pm-kisan slug for 'nenu eligible aa?'", async () => {
  const r = await chat({ query: "nenu eligible aa?", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "pm-kisan", `Expected pm-kisan, got '${r.primaryScheme?.id}'`);
  assert(/[\u0C00-\u0C7F]/.test(r.message) || /eligible|criteria|arthudu/i.test(r.message), "Response doesn't discuss eligibility");
});

await runTest("T4: Info eligibility query gets informational Gemini answer (no pass/fail)", async () => {
  const r = await chat({ query: "PM-KISAN \u0c05\u0c30\u0c4d\u0c39\u0c24 \u0c28\u0c3f\u0c2c\u0c02\u0c27\u0c28\u0c32\u0c41 \u0c0f\u0c2e\u0c3f\u0c1f\u0c3f?", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.usedGemini === true, "Expected Gemini response");
  assert(r.message && r.message.length > 50, "Response too short");
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu characters");
  assert(!/you are eligible|not eligible/i.test(r.message), "Gemini made a definitive pass/fail decision");
});

await runTest("T5: General Telugu query gets Telugu Gemini response (Supabase->Telugu translation)", async () => {
  const r = await chat({ query: "\u0c2a\u0c4d\u0c30\u0c2d\u0c41\u0c24\u0c4d\u0c35 \u0c2a\u0c25\u0c15\u0c3e\u0c32 \u0c17\u0c41\u0c30\u0c3f\u0c02\u0c1a\u0c3f \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.usedGemini === true, "Expected Gemini response");
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu -- Gemini translation failed");
});

await runTest("T6: Follow-up 'What documents do I need?' uses PM-KISAN context from history", async () => {
  const history = [
    { role: "user",      text: "Tell me about PM-KISAN" },
    { role: "assistant", text: "PM-KISAN provides 6000 per year to farmers." },
  ];
  const r = await chat({ query: "What documents do I need?", lang: "en", conversationHistory: history });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.usedGemini === true, "Expected Gemini response");
  assert(r.primaryScheme?.id === "pm-kisan", `Expected primaryScheme pm-kisan, got '${r.primaryScheme?.id}'`);
  assert(/aadhaar|land|passbook|document|bank/i.test(r.message), "Response doesn't mention PM-KISAN documents");
});

await runTest("T7: Language switch en->te responds in Telugu, history preserved", async () => {
  const history = [
    { role: "user",      text: "Tell me about PM-KISAN" },
    { role: "assistant", text: "PM-KISAN provides 6000 per year." },
    { role: "user",      text: "[Language switched to Telugu. Please respond in Telugu from now on.]" },
  ];
  const r = await chat({ query: "\u0c2a\u0c24\u0c4d\u0c30\u0c3e\u0c32\u0c41 \u0c0f\u0c2e\u0c3f\u0c1f\u0c3f?", lang: "te", conversationHistory: history });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response not in Telugu after language switch");
  assert(r.primaryScheme?.id === "pm-kisan", `Expected pm-kisan, got '${r.primaryScheme?.id}'`);
});

await runTest("T8: PMFBY English query gets valid response", async () => {
  const r = await chat({ query: "Tell me about PMFBY crop insurance", lang: "en" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.message && r.message.length > 50, "Response too short");
  assert(/pmfby|fasal|crop insurance/i.test(r.message), "Response doesn't mention PMFBY");
  assert(r.primaryScheme?.id === "pmfby", `primaryScheme was '${r.primaryScheme?.id}'`);
});

await runTest("T9: 'panta bima gurainci' resolves to PMFBY in Telugu", async () => {
  const r = await chat({ query: "panta bima gurainci cheppandi", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "pmfby", `Expected pmfby, got '${r.primaryScheme?.id}'`);
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu characters");
});

await runTest("T10: Server leaves eligibilityState=null (determinism on client)", async () => {
  const r = await chat({ query: "Am I eligible for PM-KISAN? I own agricultural land.", lang: "en" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.eligibilityState === null, `Server set eligibilityState: ${JSON.stringify(r.eligibilityState)}`);
  assert(r.message && r.message.length > 50, "Response too short");
});

console.log("\n--- Transliteration & Scheme Matching Tests ---");

await runTest("U1: 'rythu' transliteration keyword -> pm-kisan", async () => {
  const r = await chat({ query: "rythu ki pm kisan benefits emiti?", lang: "te" });
  assert(r.primaryScheme?.id === "pm-kisan", `Got '${r.primaryScheme?.id}'`);
});

await runTest("U2: 'rythu runam' keyword -> kisan-credit-card", async () => {
  const r = await chat({ query: "rythu runam enduku apply cheyyali?", lang: "te" });
  assert(r.primaryScheme?.id === "kisan-credit-card", `Got '${r.primaryScheme?.id}'`);
});

await runTest("U3: 'nela pariksham' keyword -> soil-health-card", async () => {
  const r = await chat({ query: "nela pariksham ela cheyali?", lang: "te" });
  assert(r.primaryScheme?.id === "soil-health-card", `Got '${r.primaryScheme?.id}'`);
});

await runTest("U4: 'arthudu' transliteration keyword -> pm-kisan", async () => {
  const r = await chat({ query: "nenu arthudu avutanu aa?", lang: "te" });
  assert(r.primaryScheme?.id === "pm-kisan", `Got '${r.primaryScheme?.id}'`);
});

console.log("\n--- Four Schemes Verification (English & Telugu) ---");

await runTest("S1: Kisan Credit Card in English", async () => {
  const r = await chat({ query: "Explain Kisan Credit Card loan limits and interest subvention", lang: "en" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "kisan-credit-card", `Expected kisan-credit-card, got '${r.primaryScheme?.id}'`);
  assert(/credit|kcc|loan|interest/i.test(r.message), "Response missing credit details");
});

await runTest("S2: Kisan Credit Card in Telugu", async () => {
  const r = await chat({ query: "కిసాన్ క్రెడిట్ కార్డు రుణం వివరాలు చెప్పండి", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "kisan-credit-card", `Expected kisan-credit-card, got '${r.primaryScheme?.id}'`);
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu characters");
});

await runTest("S3: Soil Health Card in English", async () => {
  const r = await chat({ query: "What parameters are tested under Soil Health Card?", lang: "en" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "soil-health-card", `Expected soil-health-card, got '${r.primaryScheme?.id}'`);
  assert(/soil|nutrient|fertilizer|card/i.test(r.message), "Response missing soil details");
});

await runTest("S4: Soil Health Card in Telugu", async () => {
  const r = await chat({ query: "నేల ఆరోగ్య కార్డు ప్రయోజనాలు ఏమిటి?", lang: "te" });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "soil-health-card", `Expected soil-health-card, got '${r.primaryScheme?.id}'`);
  assert(/[\u0C00-\u0C7F]/.test(r.message), "Response contains no Telugu characters");
});

console.log("\n--- Follow-up 'Tell me more' Context Test ---");

await runTest("F1: 'Tell me more' contextual follow-up after PMFBY", async () => {
  const history = [
    { role: "user",      text: "Tell me about PMFBY crop insurance" },
    { role: "assistant", text: "PMFBY provides crop insurance coverage against natural disasters." },
  ];
  const r = await chat({ query: "Tell me more", lang: "en", conversationHistory: history });
  assert(r.status === 200, `HTTP ${r.status}`);
  assert(r.primaryScheme?.id === "pmfby", `Expected pmfby context, got '${r.primaryScheme?.id}'`);
});

console.log("\n--- Client-side First-Person Eligibility Screening Flow ---");

await runTest("E1: 'nenu eligible aa?' triggers interactive screening (not Gemini)", async () => {
  const res = await queryAssistant("nenu eligible aa?", "te");
  assert(res.status === "eligibility_question", `Expected eligibility_question, got '${res.status}'`);
  assert(res.primaryScheme?.id === "pm-kisan", `Expected pm-kisan, got '${res.primaryScheme?.id}'`);
  assert(res.eligibilityState?.step === "land_ownership", `Expected step land_ownership, got '${res.eligibilityState?.step}'`);
  assert(/1\./.test(res.message), "Expected Question 1 in response");
});

await runTest("E2: 'Am I eligible for PM-KISAN?' triggers interactive screening", async () => {
  const res = await queryAssistant("Am I eligible for PM-KISAN?", "en");
  assert(res.status === "eligibility_question", `Expected eligibility_question, got '${res.status}'`);
  assert(res.primaryScheme?.id === "pm-kisan", `Expected pm-kisan, got '${res.primaryScheme?.id}'`);
  assert(res.eligibilityState?.step === "land_ownership", `Expected step land_ownership`);
});

await runTest("E3: Telugu script 'నేను అర్హుడినా?' triggers interactive screening in Telugu", async () => {
  const res = await queryAssistant("నేను పీఎం కిసాన్ అర్హుడినా?", "te");
  assert(res.status === "eligibility_question", `Expected eligibility_question, got '${res.status}'`);
  assert(res.primaryScheme?.id === "pm-kisan", `Expected pm-kisan, got '${res.primaryScheme?.id}'`);
  assert(/[\u0C00-\u0C7F]/.test(res.message), "Expected Telugu prompt");
});

await runTest("E4: Deterministic 2-step screening passes eligible user", async () => {
  // Step 1: User says Yes to land ownership
  const step1State = { schemeId: "pm-kisan", step: "land_ownership" };
  const r1 = await queryAssistant("yes", "en", { eligibilityState: step1State });
  assert(r1.status === "eligibility_question", "Step 1 should ask about exclusions");
  assert(r1.eligibilityState?.step === "exclusions", `Expected step exclusions, got '${r1.eligibilityState?.step}'`);

  // Step 2: User says 'None of these' to exclusion criteria
  const step2State = r1.eligibilityState;
  const r2 = await queryAssistant("none of these", "en", { eligibilityState: step2State });
  assert(r2.status === "eligibility_result", `Expected eligibility_result, got '${r2.status}'`);
  assert(r2.eligibilityState === null, "Eligibility flow should be complete");
  assert(/preliminarily eligible|likely eligible|eligible/i.test(r2.message), "Expected eligible verdict");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`Final Smoke Test Results: ${passed} passed  |  ${failed} failed`);
console.log(`${"=".repeat(60)}\n`);

if (failed > 0) process.exit(1);
