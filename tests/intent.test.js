import test from "node:test";
import assert from "node:assert/strict";
import {
  INTENT,
  detectConversationalIntent,
  isContextualFollowUp,
  isLikelyFarmerTopic,
  stripLeadingChitChat,
} from "../src/services/intent.js";

test("greetings are classified in English, Telugu and transliteration", () => {
  for (const text of [
    "hello",
    "hi",
    "hey",
    "hello!",
    "good morning",
    "hello how are you",
    "namaste",
    "namaskaram",
    "నమస్కారం",
    "నమస్తే",
  ]) {
    assert.equal(detectConversationalIntent(text), INTENT.GREETING, `greeting: ${text}`);
  }
});

test("identity questions are classified", () => {
  for (const text of [
    "what is your name?",
    "what's your name",
    "who are you?",
    "who are you",
    "నీ పేరు ఏమిటి?",
    "మీరు ఎవరు?",
  ]) {
    assert.equal(detectConversationalIntent(text), INTENT.IDENTITY, `identity: ${text}`);
  }
});

test("thanks, farewells and acknowledgements are classified", () => {
  assert.equal(detectConversationalIntent("thank you"), INTENT.THANKS);
  assert.equal(detectConversationalIntent("thanks"), INTENT.THANKS);
  assert.equal(detectConversationalIntent("ధన్యవాదాలు"), INTENT.THANKS);

  assert.equal(detectConversationalIntent("bye"), INTENT.FAREWELL);
  assert.equal(detectConversationalIntent("goodbye"), INTENT.FAREWELL);
  assert.equal(detectConversationalIntent("బై"), INTENT.FAREWELL);

  assert.equal(detectConversationalIntent("ok"), INTENT.ACKNOWLEDGEMENT);
  assert.equal(detectConversationalIntent("okay"), INTENT.ACKNOWLEDGEMENT);
  assert.equal(detectConversationalIntent("got it"), INTENT.ACKNOWLEDGEMENT);
  assert.equal(detectConversationalIntent("సరే"), INTENT.ACKNOWLEDGEMENT);
});

test("capability and help requests are classified", () => {
  assert.equal(detectConversationalIntent("what can you do?"), INTENT.CAPABILITIES);
  assert.equal(detectConversationalIntent("how can you help?"), INTENT.CAPABILITIES);
  assert.equal(detectConversationalIntent("I need help"), INTENT.HELP);
  assert.equal(detectConversationalIntent("సహాయం కావాలి"), INTENT.HELP);
});

test("scheme and topic questions are NOT conversational", () => {
  for (const text of [
    "tell me about PM-KISAN",
    "explain PMFBY",
    "what documents do I need?",
    "what are the benefits?",
    "how do I apply?",
    "hello, explain PMFBY",
    "kisan credit card",
    "crop insurance",
    "soil test",
    "కిసాన్ గురించి చెప్పండి",
    "పంట బీమాకు అవసరమైన పత్రాలు ఏమిటి?",
    "",
  ]) {
    assert.equal(detectConversationalIntent(text), null, `not conversational: ${text}`);
  }
});

test("eligibility answers are never treated as chit-chat", () => {
  for (const text of ["yes", "no", "none of these", "అవును", "కాదు", "ఎవరూ లేరు / వర్తించదు"]) {
    assert.equal(detectConversationalIntent(text), null, `eligibility answer: ${text}`);
  }
});

test("off-topic requests are not conversational intents but are off-topic", () => {
  for (const text of ["tell me a joke", "what is the capital of India?", "what is the weather today"]) {
    assert.equal(detectConversationalIntent(text), null);
    assert.equal(isLikelyFarmerTopic(text), false, `off topic: ${text}`);
  }
});

test("farmer topics are recognised for clarification", () => {
  for (const text of ["kisan credit card", "crop insurance", "my soil is poor", "రైతు రుణం", "గ్రీవెన్స్"]) {
    assert.equal(isLikelyFarmerTopic(text), true, `farmer topic: ${text}`);
  }
});

test("contextual follow-ups are detected", () => {
  for (const text of [
    "what documents do I need?",
    "what are the benefits?",
    "how do I apply?",
    "tell me more",
    "what about the eligibility?",
    "పత్రాలు ఏమిటి?",
    "అర్హత ఏమిటి?",
    "దరఖాస్తు ఎలా?",
  ]) {
    assert.equal(isContextualFollowUp(text), true, `follow-up: ${text}`);
  }
});

test("vague anaphora only follows up when it introduces no new subject", () => {
  assert.equal(isContextualFollowUp("tell me more"), true);
  assert.equal(isContextualFollowUp("explain more about it"), true);
  assert.equal(isContextualFollowUp("give me more details"), true);
  assert.equal(isContextualFollowUp("మరిన్ని వివరాలు చెప్పండి"), true);

  // A new proper noun / topic must never inherit the previous scheme.
  assert.equal(isContextualFollowUp("tell me more about ayushman"), false);
  assert.equal(isContextualFollowUp("tell me more about ayushman bharat"), false);
  assert.equal(isContextualFollowUp("more details about the weather forecast today"), false);
  assert.equal(isContextualFollowUp("అయుష్మాన్ భారత్ గురించి చెప్పండి"), false);
});

test("a greeting only counts when it is (essentially) the whole utterance", () => {
  // Whole-utterance greetings remain greetings.
  assert.equal(detectConversationalIntent("hello"), INTENT.GREETING);
  assert.equal(detectConversationalIntent("hey there"), INTENT.GREETING);
  assert.equal(detectConversationalIntent("good evening sir"), INTENT.GREETING);
  assert.equal(detectConversationalIntent("hello how are you"), INTENT.GREETING);

  // A greeting followed by real content is NOT a greeting (RC2).
  assert.equal(detectConversationalIntent("hello, what is the capital of India?"), null);
  assert.equal(detectConversationalIntent("hello, tell me a joke"), null);
});

test("a greeting combined with another chit-chat intent classifies the remainder", () => {
  assert.equal(detectConversationalIntent("hi, I need help"), INTENT.HELP);
  assert.equal(detectConversationalIntent("hello, thank you"), INTENT.THANKS);
  assert.equal(detectConversationalIntent("hello, what is your name?"), INTENT.IDENTITY);
});

test("good night is a farewell", () => {
  assert.equal(detectConversationalIntent("good night"), INTENT.FAREWELL);
  assert.equal(detectConversationalIntent("శుభ రాత్రి"), INTENT.FAREWELL);
});

test("leading voice fillers are stripped before chit-chat detection", () => {
  assert.equal(stripLeadingChitChat("um hello"), "hello");
  assert.equal(stripLeadingChitChat("um, hello yes"), "yes");
  assert.equal(stripLeadingChitChat("so what documents do I need?"), "what documents do I need?");
  // "so" must not eat into a word like "solar".
  assert.equal(stripLeadingChitChat("solar panel subsidy"), "solar panel subsidy");

  assert.equal(detectConversationalIntent("um hello"), INTENT.GREETING);
  assert.equal(detectConversationalIntent("um, bye"), INTENT.FAREWELL);
});

test("Telugu transliteration topic words count as follow-ups", () => {
  assert.equal(isContextualFollowUp("patralu emiti?"), true);
  assert.equal(isContextualFollowUp("arhata enti?"), true);
  assert.equal(isContextualFollowUp("prayojanalu enti?"), true);
});

test("greetings, thanks and off-topic text are not follow-ups", () => {
  for (const text of [
    "hello",
    "thank you",
    "bye",
    "tell me a joke",
    "what is the capital of India?",
    "what is the weather today",
    "explain PMFBY",
    "ayushman bharat",
  ]) {
    assert.equal(isContextualFollowUp(text), false, `not a follow-up: ${text}`);
  }
});
