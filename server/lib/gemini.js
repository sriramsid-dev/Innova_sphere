/**
 * Innova Sphere — Gemini API wrapper (server-side only)
 *
 * Responsibilities:
 *  - Read GEMINI_API_KEY from server env (never from VITE_ vars)
 *  - Build a grounded system prompt: Gemini only uses data we supply
 *  - Call the Gemini API and return a structured chat response
 *  - Never invent scheme details, amounts, dates, or portal URLs
 *
 * Environment variables:
 *   GEMINI_API_KEY — Google Gemini API key (server env only)
 */

import "../loadEnv.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "[gemini] GEMINI_API_KEY not set. Gemini calls will be skipped; " +
      "the server will return a 503 so the client falls back to rule-based responses."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Model to use — configurable via GEMINI_MODEL env var, defaulting to gemini-3.5-flash-lite
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Maximum characters to send per query (server-side guard)
const MAX_QUERY_CHARS = 500;

/**
 * Build the grounded system instruction for Gemini.
 * Gemini must ONLY use the scheme data we supply.
 *
 * @param {string} lang — 'en' | 'te'
 * @returns {string}
 */
function buildSystemInstruction(lang) {
  const langInstruction =
    lang === "te"
      ? `Respond entirely in Telugu (తెలుగు). Use natural, simple Telugu that rural farmers can understand. Even if previous messages in the conversation history are in English, you must respond strictly in Telugu now.

Telugu Translation rules:
- Translate the factual scheme information provided in the user message into clear, farmer-friendly Telugu.
- Preserve ALL numbers exactly as given (e.g., ₹6,000, ₹2,000, 4%, 7%, ₹3 lakh).
- Keep official scheme names and acronyms in their original English form with Telugu explanations in parentheses (e.g., "పీఎం-కిసాన్ (PM-KISAN)").
- Keep technical terms (DBT, Aadhaar, eKYC, IFSC, OTP, CSC) in English with Telugu context.
- Keep official portal URLs exactly as they appear in the data (do NOT translate or modify URLs).
- If a field (e.g., required documents, application steps) is missing from the scheme data provided, say so honestly: "ఈ వివరాలు ధ్రువీకృత రికార్డుల్లో అందుబాటులో లేవు." Do NOT invent missing information.`
      : "Respond in clear, simple English suitable for Indian farmers. Even if previous messages in the conversation history are in Telugu, you must respond strictly in English now.";

  return `You are Innova Sphere, a trusted farming assistance chatbot for Indian farmers.

Your role:
- Answer questions about Indian government farming schemes using ONLY the scheme data provided in this conversation.
- Do NOT invent, guess, or extrapolate eligibility criteria, benefit amounts, dates, portal URLs, or any scheme details not present in the provided data.
- If the scheme data does not contain the answer to a specific question, say so honestly and direct the user to the official portal listed in the data.
- Eligibility information: You may explain what the official eligibility criteria are, as stated in the data. Do NOT make a pass/fail eligibility determination for the user — always clarify that official verification is required. If the user asks "Am I eligible?" or "nenu eligible aa?", explain the criteria from the data and advise them to check through official channels.
- Keep responses concise and practical. Use Markdown formatting (bold, numbered lists, bullet points) to structure responses clearly.
- Always include the official portal URL when available in the scheme data.
- Do not repeat the same information multiple times.

${langInstruction}

IMPORTANT: Base your answer strictly and only on the scheme data provided. Never hallucinate scheme details, amounts, URLs, or eligibility rules.`;
}


/**
 * Format scheme rows into a compact, readable string for the Gemini prompt.
 * Keeps token count low by only including non-empty fields.
 *
 * @param {object[]} rows — raw Supabase scheme rows
 * @returns {string}
 */
function formatSchemesForPrompt(rows) {
  if (!rows || rows.length === 0) {
    return "No specific scheme data available for this query.";
  }

  return rows
    .map((row) => {
      const parts = [];
      parts.push(`## ${row.name || row.slug}${row.name_te ? ` (${row.name_te})` : ""}`);
      if (row.summary) parts.push(`Summary: ${row.summary}`);
      if (row.category) parts.push(`Category: ${row.category}`);
      if (row.official_url) parts.push(`Official Portal: ${row.official_url}`);

      if (Array.isArray(row.benefits) && row.benefits.length > 0) {
        parts.push(`Benefits:\n${row.benefits.map((b) => `  - ${b}`).join("\n")}`);
      } else if (typeof row.benefits === "string" && row.benefits) {
        try {
          const parsed = JSON.parse(row.benefits);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parts.push(`Benefits:\n${parsed.map((b) => `  - ${b}`).join("\n")}`);
          }
        } catch {
          parts.push(`Benefits: ${row.benefits}`);
        }
      }

      if (Array.isArray(row.eligibility) && row.eligibility.length > 0) {
        parts.push(`Eligibility:\n${row.eligibility.map((e) => `  - ${e}`).join("\n")}`);
      } else if (typeof row.eligibility === "string" && row.eligibility) {
        try {
          const parsed = JSON.parse(row.eligibility);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parts.push(`Eligibility:\n${parsed.map((e) => `  - ${e}`).join("\n")}`);
          }
        } catch {
          parts.push(`Eligibility: ${row.eligibility}`);
        }
      }

      if (Array.isArray(row.required_documents) && row.required_documents.length > 0) {
        parts.push(`Required Documents:\n${row.required_documents.map((d) => `  - ${d}`).join("\n")}`);
      }

      if (Array.isArray(row.application_steps) && row.application_steps.length > 0) {
        parts.push(`Application Steps:\n${row.application_steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
      }

      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

/**
 * Call Gemini with grounded scheme data.
 *
 * @param {object} options
 * @param {string}   options.query          — User's question
 * @param {string}   options.lang           — 'en' | 'te'
 * @param {object[]} options.schemeRows     — Relevant Supabase scheme rows
 * @param {object|null} options.eligibilityState — Current multi-turn state (for context only)
 * @param {object[]} options.conversationHistory — Previous messages [{role, text}]
 * @returns {Promise<{ message: string, usedGemini: boolean }>}
 */
export async function callGemini({
  query,
  lang = "en",
  schemeRows = [],
  eligibilityState = null,
  conversationHistory = [],
}) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Sanitise query length
  const safeQuery = query.slice(0, MAX_QUERY_CHARS);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: buildSystemInstruction(lang),
  });

  // Build the user message with grounding data embedded
  const schemeContext = formatSchemesForPrompt(schemeRows);

  let eligibilityContext = "";
  if (eligibilityState) {
    eligibilityContext = `\n\nCurrent eligibility conversation state: ${JSON.stringify(eligibilityState)}
Note: Eligibility decisions are made by a deterministic rule engine, not by you. You may explain what the criteria mean but do NOT make a pass/fail eligibility determination.`;
  }

  const groundedUserMessage = `User question: ${safeQuery}

Scheme data to use for your answer:
${schemeContext}${eligibilityContext}`;

  // Build conversation history for multi-turn context
  // Only include last 6 turns to keep token cost reasonable
  const history = conversationHistory
    .slice(-6)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(groundedUserMessage);
    const response = result.response;
    const text = response.text();

    return {
      message: text,
      usedGemini: true,
    };
  } catch (err) {
    // Log error type but never log the API key or user query content
    console.error("[gemini] API call failed:", err.message || err.status || "Unknown error");
    throw err;
  }
}

/** Check whether the Gemini client is configured. */
export function isGeminiConfigured() {
  return !!genAI;
}
