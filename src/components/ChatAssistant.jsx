import React, { useState, useEffect, useRef } from "react";
import { queryAssistant } from "../services/searchService";

export default function ChatAssistant({ lang, t, onSelectScheme }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize greeting whenever language changes if chat is empty or has only greeting
  useEffect(() => {
    setMessages([
      {
        id: "initial-greeting",
        sender: "assistant",
        text: t.chatWelcome,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        matchedSchemes: []
      }
    ]);
  }, [lang, t.chatWelcome]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (queryText) => {
    const textToQuery = (queryText || inputText).trim();
    if (!textToQuery || isProcessing) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      // Query local verified scheme search layer
      const response = await queryAssistant(textToQuery, lang);

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: response.status,
        matchedSchemes: response.matchedSchemes || [],
        primaryScheme: response.primaryScheme || null
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error querying assistant:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "assistant",
          text: lang === "te"
            ? "క్షమించండి, శోధన సమయంలో సాంకేతిక లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి."
            : "Sorry, an unexpected error occurred while searching. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "initial-greeting",
        sender: "assistant",
        text: t.chatWelcome,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        matchedSchemes: []
      }
    ]);
  };

  const suggestedQuestions = [
    t.suggestedQ1,
    t.suggestedQ2,
    t.suggestedQ3,
    t.suggestedQ4
  ];

  return (
    <section className="chat-section" aria-labelledby="chat-heading">
      <div className="chat-card-container">
        {/* Chat Header */}
        <div className="chat-card-header">
          <div className="chat-title-group">
            <span className="chat-header-icon">💬</span>
            <div>
              <h2 id="chat-heading" className="chat-title">{t.chatTitle}</h2>
              <p className="chat-sub">{t.chatSubtitle}</p>
            </div>
          </div>

          <div className="chat-badge-group">
            <span className="badge-local-mode" title="Direct local verified query engine, not connected to generative AI">
              ℹ️ {t.chatModeBadge}
            </span>
            <button
              type="button"
              className="chat-reset-btn"
              onClick={handleReset}
              title={t.chatClearBtn}
            >
              🔄 {t.chatClearBtn}
            </button>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="suggested-queries-box">
          <span className="suggested-label">{t.suggestedQueriesHeading}:</span>
          <div className="suggested-chips-scroll">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="chip-btn"
                onClick={() => handleSend(q)}
                disabled={isProcessing}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="chat-messages-container" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === "user" ? "user-row" : "assistant-row"}`}
            >
              <div className="message-avatar" aria-hidden="true">
                {msg.sender === "user" ? "🧑‍🌾" : "🌱"}
              </div>
              <div className="message-bubble">
                <div className="message-header-line">
                  <span className="message-sender-name">
                    {msg.sender === "user" ? (lang === "te" ? "మీరు (రైతు)" : "You (Farmer)") : "Innova Sphere Assistant"}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                
                {/* Message Body with line breaks & markdown-like emphasis */}
                <div className="message-body-text">
                  {msg.text.split("\n").map((line, lIdx) => {
                    if (!line.trim()) return <br key={lIdx} />;
                    return (
                      <p key={lIdx} className="message-paragraph">
                        {line}
                      </p>
                    );
                  })}
                </div>

                {/* If the assistant matched a primary scheme, provide an instant action button to view its card */}
                {msg.primaryScheme && (
                  <div className="matched-action-box">
                    <button
                      type="button"
                      className="btn-view-card"
                      onClick={() => onSelectScheme(msg.primaryScheme.id)}
                    >
                      <span>🔍 {t.viewFullCardBtn} ({msg.primaryScheme.code})</span>
                    </button>
                    <a
                      href={msg.primaryScheme.verifiedOfficialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-quick-portal"
                    >
                      <span>Official Portal ↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="message-row assistant-row">
              <div className="message-avatar">🌱</div>
              <div className="message-bubble loading-bubble">
                <span className="typing-indicator">
                  <span></span><span></span><span></span>
                </span>
                <span className="typing-text">
                  {lang === "te" ? "ధృవీకరించిన రికార్డులను శోధిస్తోంది..." : "Searching local verified records..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chat-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chatPlaceholder}
            aria-label={t.chatPlaceholder}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="chat-submit-btn"
            disabled={!inputText.trim() || isProcessing}
          >
            <span>{t.chatSendBtn}</span>
            <span className="send-arrow">➔</span>
          </button>
        </form>
      </div>
    </section>
  );
}
