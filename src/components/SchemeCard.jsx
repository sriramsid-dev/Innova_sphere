import React, { useState } from "react";

export default function SchemeCard({ scheme, lang, t, isHighlighted }) {
  const [activeSection, setActiveSection] = useState("benefits"); // 'benefits' | 'eligibility' | 'documents' | 'steps'
  const langData = scheme[lang] || scheme.en;
  const authority = lang === "te" ? scheme.authorityTe : scheme.authorityEn;

  return (
    <article
      id={`scheme-${scheme.id}`}
      className={`scheme-card ${isHighlighted ? "highlighted-card" : ""}`}
      aria-labelledby={`title-${scheme.id}`}
    >
      {/* Top Meta Header */}
      <div className="card-top-bar">
        <div className="badges-left">
          <span className="code-badge">{scheme.code}</span>
          <span className="category-pill">{langData.categoryLabel}</span>
        </div>
        <div className="badge-verified-wrapper">
          <span className="verified-shield">✓</span>
          <span className="verified-label">{t.officialSourceBadge}</span>
        </div>
      </div>

      {/* Scheme Title & Overview */}
      <div className="card-main-info">
        <h3 id={`title-${scheme.id}`} className="scheme-title">
          {langData.name}
        </h3>
        <p className="scheme-authority">
          <span className="authority-icon">🏛️</span>
          <span>{authority}</span>
        </p>
        <p className="scheme-short-desc">
          {langData.shortDescription}
        </p>
      </div>

      {/* Section Navigation Tabs (Tabs keep mobile view neat and uncluttered) */}
      <div className="card-sub-nav" role="tablist" aria-label="Scheme Details Selection">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "benefits"}
          className={`card-tab-btn ${activeSection === "benefits" ? "active" : ""}`}
          onClick={() => setActiveSection("benefits")}
        >
          <span className="tab-icon">💰</span>
          <span>{t.benefitsHeading}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "eligibility"}
          className={`card-tab-btn ${activeSection === "eligibility" ? "active" : ""}`}
          onClick={() => setActiveSection("eligibility")}
        >
          <span className="tab-icon">👥</span>
          <span>{t.eligibilityHeading}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "documents"}
          className={`card-tab-btn ${activeSection === "documents" ? "active" : ""}`}
          onClick={() => setActiveSection("documents")}
        >
          <span className="tab-icon">📄</span>
          <span>{t.documentsHeading}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "steps"}
          className={`card-tab-btn ${activeSection === "steps" ? "active" : ""}`}
          onClick={() => setActiveSection("steps")}
        >
          <span className="tab-icon">📝</span>
          <span>{t.stepsHeading}</span>
        </button>
      </div>

      {/* Dynamic Content Panel */}
      <div className="card-tab-panel" role="tabpanel">
        {activeSection === "benefits" && (
          <div className="panel-content">
            <h4 className="panel-subheading">{t.benefitsHeading}</h4>
            {(langData.benefits && langData.benefits.length > 0) ? (
              <ul className="detail-list benefits-list">
                {langData.benefits.map((benefit, index) => (
                  <li key={index} className="detail-item">
                    <span className="item-bullet">✨</span>
                    <span className="item-text">{benefit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="item-text text-muted">{lang === "te" ? "వివరాలు త్వరలో అందుబాటులోకి వస్తాయి." : "Details will be updated soon."}</p>
            )}
          </div>
        )}

        {activeSection === "eligibility" && (
          <div className="panel-content">
            <h4 className="panel-subheading">{t.eligibilityHeading}</h4>
            {(langData.eligibility && langData.eligibility.length > 0) ? (
              <ul className="detail-list eligibility-list">
                {langData.eligibility.map((item, index) => (
                  <li key={index} className="detail-item">
                    <span className="item-bullet">✅</span>
                    <span className="item-text">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="item-text text-muted">{lang === "te" ? "అర్హత వివరాలు త్వరలో అందుబాటులోకి వస్తాయి." : "Eligibility details will be updated soon."}</p>
            )}
          </div>
        )}

        {activeSection === "documents" && (
          <div className="panel-content">
            <h4 className="panel-subheading">{t.documentsHeading}</h4>
            {(langData.requiredDocuments && langData.requiredDocuments.length > 0) ? (
              <div className="docs-grid">
                {langData.requiredDocuments.map((doc, index) => (
                  <div key={index} className="doc-pill-card">
                    <span className="doc-icon">📌</span>
                    <span className="doc-text">{doc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="item-text text-muted">{lang === "te" ? "పత్రాల వివరాలు త్వరలో అందుబాటులోకి వస్తాయి." : "Document details will be updated soon."}</p>
            )}
          </div>
        )}

        {activeSection === "steps" && (
          <div className="panel-content">
            <h4 className="panel-subheading">{t.stepsHeading}</h4>
            {(langData.applicationSteps && langData.applicationSteps.length > 0) ? (
              <ol className="steps-list">
                {langData.applicationSteps.map((step, index) => (
                  <li key={index} className="step-item">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-desc">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="item-text text-muted">{lang === "te" ? "దరఖాస్తు విధానం త్వరలో అందుబాటులోకి వస్తుంది." : "Application steps will be updated soon."}</p>
            )}
          </div>
        )}
      </div>

      {/* Official Government Source Link Section */}
      <div className="card-footer-action">
        <a
          href={scheme.verifiedOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-official-portal"
          title={`${t.visitPortalBtn} (${scheme.verifiedOfficialUrl})`}
        >
          <span className="portal-icon">🏛️</span>
          <span className="portal-text">{t.visitPortalBtn}</span>
          <span className="portal-url-tag">({scheme.verifiedOfficialUrl.replace("https://", "")}) ↗</span>
        </a>
        <p className="external-notice">
          ℹ️ {t.externalNotice}
        </p>
      </div>
    </article>
  );
}
