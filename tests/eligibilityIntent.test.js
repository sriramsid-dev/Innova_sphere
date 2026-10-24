import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyEligibilityAnswer,
  isEligibilityDecisionQuery,
} from "../src/services/intent.js";

// ── land_ownership step ─────────────────────────────────────────────────────

test("land ownership: affirmative answers", () => {
  for (const text of [
    "yes",
    "yeah",
    "yep",
    "yes",
    "i own land",
    "i own 2 acres",
    "we own agricultural land",
    "i have land",
    "yes please",
    "అవును",
    "అవును అండి",
    "భూమి ఉంది",
  ]) {
    assert.equal(classifyEligibilityAnswer(text, "land_ownership"), "yes", `yes: ${text}`);
  }
});

test("land ownership: negative answers", () => {
  for (const text of [
    "no",
    "nope",
    "nah",
    "i don't own land",
    "i do not own land",
    "i don't have land",
    "i am a tenant",
    "tenant farmer",
    "landless",
    "no land",
    "కాదు",
    "నాకు భూమి లేదు",
  ]) {
    assert.equal(classifyEligibilityAnswer(text, "land_ownership"), "no", `no: ${text}`);
  }
});

test("land ownership: ambiguous answers re-ask (never a determination)", () => {
  for (const text of [
    "i don't know",
    "not sure",
    "no idea",
    "maybe",
    "perhaps",
    "unsure",
    "can't say",
    "తెలియదు",
    "బహుశా",
    // Out-of-order answer belonging to the exclusions step.
    "none of these",
    // Unrelated input.
    "tell me a joke",
    "what documents do I need?",
  ]) {
    assert.equal(
      classifyEligibilityAnswer(text, "land_ownership"),
      null,
      `ambiguous: ${text}`
    );
  }
});

// ── exclusions step ─────────────────────────────────────────────────────────

test("exclusions: no exclusion applies", () => {
  for (const text of [
    "none of these",
    "none",
    "no",
    "no exclusions",
    "neither",
    "ఎవరూ లేరు / వర్తించదు",
    "ఎవరూ లేరు",
  ]) {
    assert.equal(classifyEligibilityAnswer(text, "exclusions"), "none", `none: ${text}`);
  }
});

test("exclusions: an exclusion applies", () => {
  for (const text of [
    "yes",
    "yes, an exclusion applies",
    "one applies",
    "yes i pay income tax",
    "govt employee",
    "i am a government officer",
    "అవును",
    "వర్తిస్తుంది",
    "పెన్షన్ వస్తుంది",
  ]) {
    assert.equal(classifyEligibilityAnswer(text, "exclusions"), "applies", `applies: ${text}`);
  }
});

test("exclusions: ambiguous answers re-ask", () => {
  for (const text of ["i don't know", "not sure", "maybe later", "ఏమో"]) {
    assert.equal(classifyEligibilityAnswer(text, "exclusions"), null, `ambiguous: ${text}`);
  }
});

test("classifyEligibilityAnswer returns null for unknown steps and empty input", () => {
  assert.equal(classifyEligibilityAnswer("yes", "start"), null);
  assert.equal(classifyEligibilityAnswer("yes", "unknown"), null);
  assert.equal(classifyEligibilityAnswer("", "land_ownership"), null);
  assert.equal(classifyEligibilityAnswer(null, "land_ownership"), null);
});

// ── eligibility decision query (flow trigger) ───────────────────────────────

test("explicit first-person decision queries are recognised", () => {
  for (const text of [
    "am I eligible for PM-KISAN?",
    "am I eligible?",
    "do I qualify?",
    "check my eligibility",
    "what is my eligibility?",
    "nenu eligible aa?",
    "avutaana?",
    "నేను అర్హుడినా?",
    "నాకు అర్హత ఉందా?",
  ]) {
    assert.equal(isEligibilityDecisionQuery(text), true, `decision: ${text}`);
  }
});

test("bare pronouns and application questions are NOT screening triggers", () => {
  for (const text of [
    // bare "nenu" / "can i" must not start the flow (RC9)
    "nenu pm kisan gurinchi adagali",
    "can I apply for PM-KISAN?",
    // informational eligibility question
    "what are the eligibility criteria for PM-KISAN?",
    // chit-chat
    "hello",
    "thank you",
  ]) {
    assert.equal(isEligibilityDecisionQuery(text), false, `not decision: ${text}`);
  }
});
