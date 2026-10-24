import React, { useState, useEffect, useRef, useCallback } from "react";
import { queryAssistant } from "../services/searchService";
import MarkdownRenderer from "./MarkdownRenderer";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import MicButton, { VoiceStatus } from "./MicButton";

// Example questions shown as chips in the reference design
const EXAMPLE_QUESTIONS = {
  en: [
    "Tell me about PM-KISAN",
    "What documents are required for crop insurance?",
    "Am I eligible for PM-KISAN?",
    "How to register a grievance?",
  ],
  te: [
    "పీఎం-కిసాన్ గురించి చెప్పండి",
    "పంట బీమాకు అవసరమైన పత్రాలు ఏమిటి?",
    "పీఎం కిసాన్‌కు నేను అర్హుడినా?",
    "ఫిర్యాదు ఎలా నమోదు చేయాలి?",
  ],
};

export default function AssistantPanel({ lang, t, onSelectScheme, externalQuery, onExternalQueryConsumed }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [eligibilityState, setEligibilityState] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Voice input — browser Web Speech API, single utterance, never auto-sent.
  const handleVoiceTranscript = useCallback((transcript) => {
    setInputText((prev) => {
      const existing = prev.trimEnd();
      return existing ? `${existing} ${transcript}` : transcript;
    });
    // Keep focus in the field so the transcript can be reviewed and edited.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const {
    status: voiceStatus,
    errorCode: voiceErrorCode,
    interimText: voiceInterimText,
    toggle: toggleVoice,
  } = useSpeechRecognition({
    lang,
    disabled: isProcessing,
    onFinalTranscript: handleVoiceTranscript,
  });

  // NOTE: No greeting is injected into message state.
  // The idle greeting UI (ap-greeting-area) is rendered when messages is empty,
  // so it reflects the current lang automatically without resetting conversation.

  // Handle external query (from quick action tiles)
  useEffect(() => {
    if (externalQuery) {
      setInputText(externalQuery);
      onExternalQueryConsumed?.();
      // Auto-send after brief delay so UI shows the populated input
      const timer = setTimeout(() => {
        handleSend(externalQuery);
      }, 150);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuery]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (queryText) => {
    const textToQuery = (queryText ?? inputText).trim();
    if (!textToQuery || isProcessing) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToQuery,
      lang, // tag with current UI language so history can reflect language switches
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      // Build conversation history for Gemini multi-turn context.
      // All messages are preserved regardless of language — this keeps the full
      // conversation context intact when the user switches languages mid-session.
      // The system instruction already tells Gemini to respond in the current lang;
      // we prepend a brief language-switch note when lang changed from the prior turn
      // so Gemini understands the transition without losing context.
      const prevMessages = messages; // full previous message history

      // The most recent *scheme* answer supplies context for genuine follow-ups.
      // Greetings/thanks carry no primaryScheme, so they never become a scheme
      // themselves; the intent gate in queryAssistant also blocks chit-chat from
      // inheriting this value.
      const lastSchemeMsg = [...prevMessages]
        .reverse()
        .find((m) => m.sender === "assistant" && m.primaryScheme?.id);
      const lastSchemeId = lastSchemeMsg?.primaryScheme?.id || null;

      const lastTaggedMsg = [...prevMessages].reverse().find((m) => m.lang);
      const langSwitched = Boolean(lastTaggedMsg && lastTaggedMsg.lang !== lang);

      const conversationHistory = prevMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        text: m.text,
      }));

      // If the user just switched language, append a clear-language note at the
      // END of the history (as a system-style user message) so Gemini knows.
      // This is appended BEFORE the current query so it appears in the right order.
      if (langSwitched) {
        const switchNote = lang === "te"
          ? "[Language switched to Telugu. Please respond in Telugu from now on.]"
          : "[Language switched to English. Please respond in English from now on.]";
        conversationHistory.push({ role: "user", text: switchNote });
      }

      const response = await queryAssistant(textToQuery, lang, {
        eligibilityState,
        conversationHistory,
        lastSchemeId,
      });

      // Update eligibility state from EVERY response: chit-chat passes it
      // through (flow kept, chips stay); a scheme question / clarify /
      // off-topic clears it; an eligibility answer advances or clears it.
      setEligibilityState(response.eligibilityState ?? null);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: response.message,
          status: response.status,
          primaryScheme: response.primaryScheme || null,
          eligibilityState: response.eligibilityState || null,
          lang, // tag assistant message with response language
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "assistant",
          text: lang === "te"
            ? "క్షమించండి, శోధన సమయంలో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "Sorry, an error occurred during search. Please try again.",
          lang,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChipClick = (q) => {
    setInputText(q);
    handleSend(q);
  };

  const hasConversation = messages.length > 0;
  const exampleQs = EXAMPLE_QUESTIONS[lang] || EXAMPLE_QUESTIONS.en;

  // Determine quick replies for active multi-turn question. Chips follow the
  // language of the question bubble they belong to (not the live UI language),
  // so the buttons always match the question the user is answering.
  const getQuickReplies = (msg) => {
    if (!msg.eligibilityState) return null;
    const msgLang = msg.lang || lang;
    const { step } = msg.eligibilityState;
    if (step === "land_ownership") {
      return msgLang === "te" ? ["అవును", "కాదు"] : ["Yes", "No"];
    }
    if (step === "exclusions") {
      return msgLang === "te"
        ? ["ఎవరూ లేరు / వర్తించదు", "అవును, వర్తిస్తుంది"]
        : ["None of these", "Yes, an exclusion applies"];
    }
    return null;
  };

  return (
    <section className="assistant-panel" aria-label="AI Assistant">
      {/* Chat messages — shown only if there's a real conversation */}
      {hasConversation && (
        <div className="ap-messages" role="log" aria-live="polite">
          {messages.map((msg, idx) => {
            const isLastAssistantMsg = msg.sender === "assistant" && idx === messages.length - 1;
            const quickReplies = isLastAssistantMsg ? getQuickReplies(msg) : null;

            return (
              <div
                key={msg.id}
                className={`ap-msg-row${msg.sender === "user" ? " ap-user" : " ap-bot"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="ap-bot-avatar" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="14" rx="2"/>
                      <path d="M3 21l4-4h14"/>
                    </svg>
                  </div>
                )}
                <div className="ap-bubble">
                  <MarkdownRenderer content={msg.text} />

                  {quickReplies && quickReplies.length > 0 && (
                    <div className="ap-quick-replies" role="group" aria-label="Quick replies">
                      {quickReplies.map((replyText, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          className="ap-quick-btn"
                          onClick={() => handleSend(replyText)}
                          disabled={isProcessing}
                        >
                          {replyText}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.primaryScheme && (
                    <div
                      className="ap-scheme-action"
                      role="group"
                      aria-label={lang === "te" ? "పథకం శీఘ్ర చర్యలు" : "Scheme quick actions"}
                    >
                      <button
                        type="button"
                        className="ap-action-btn ap-view-btn"
                        onClick={() => onSelectScheme(msg.primaryScheme.id)}
                        title={lang === "te" ? `${msg.primaryScheme.code} పూర్తి వివరాలు చూడండి` : `View full details for ${msg.primaryScheme.code}`}
                      >
                        <span className="ap-btn-icon" aria-hidden="true">🔍</span>
                        <span className="ap-btn-text">
                          {lang === "te" ? "పూర్తి వివరాలు చూడండి" : "View Full Scheme Details"}
                        </span>
                        <span className="ap-btn-badge">{msg.primaryScheme.code}</span>
                      </button>
                      {msg.primaryScheme.verifiedOfficialUrl && (
                        <a
                          href={msg.primaryScheme.verifiedOfficialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ap-action-btn ap-portal-btn"
                          title={lang === "te" ? "అధికారిక ప్రభుత్వ వెబ్‌సైట్‌ను సందర్శించండి" : "Visit official government portal"}
                        >
                          <span className="ap-btn-text">
                            {lang === "te" ? "అధికారిక పోర్టల్" : "Official Portal"}
                          </span>
                          <span className="ap-btn-icon" aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isProcessing && (
            <div className="ap-msg-row ap-bot">
              <div className="ap-bot-avatar" aria-hidden="true">🌱</div>
              <div className="ap-bubble ap-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Greeting + Example chips — shown when no real conversation yet */}
      {!hasConversation && (
        <div className="ap-greeting-area">
          <div className="ap-greeting-bubble">
            <div className="ap-bot-avatar-lg" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="14" rx="2"/>
                <path d="M3 21l4-4h14"/>
              </svg>
            </div>
            <div className="ap-greeting-text">
              <p className="ap-hello">{lang === "te" ? "నమస్తే!" : "Hello!"}</p>
              <p>{lang === "te" ? "నేను మీకు ఎలా సహాయపడగలను?" : "How can I help you today?"}</p>
              <p className="ap-hello-sub">
                {lang === "te"
                  ? "ప్రభుత్వ పథకాలు, పంట సలహాలు, అర్హత, అవసరమైన పత్రాలు, లేదా ఫిర్యాదు విధానాల గురించి నన్ను అడగవచ్చు."
                  : "You can ask me about government schemes, crop advice, eligibility, required documents, or grievance procedures."}
              </p>
            </div>
          </div>

          {/* Example question chips */}
          <div className="ap-example-chips">
            {exampleQs.map((q, i) => (
              <button
                key={i}
                type="button"
                className="ap-chip"
                onClick={() => handleChipClick(q)}
                disabled={isProcessing}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer: voice status + input bar */}
      <div className="ap-composer">
        <VoiceStatus
          t={t}
          status={voiceStatus}
          errorCode={voiceErrorCode}
          interimText={voiceInterimText}
          onRetry={toggleVoice}
        />

        <form
          className="ap-input-bar"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <span className="ap-input-attach" aria-hidden="true">📎</span>
          <input
            ref={inputRef}
            type="text"
            className="ap-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={lang === "te" ? "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి..." : "Type your question here..."}
            aria-label={lang === "te" ? "సహాయకుడిని అడగండి" : "Ask the assistant"}
            disabled={isProcessing}
          />
          <MicButton
            t={t}
            status={voiceStatus}
            onToggle={toggleVoice}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="ap-send-btn"
            disabled={!inputText.trim() || isProcessing}
            aria-label={lang === "te" ? "పంపు" : "Send"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}
