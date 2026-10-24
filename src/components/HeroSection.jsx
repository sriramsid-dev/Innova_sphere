import React from "react";

export default function HeroSection({ lang, t, onOpenChat, onBrowseSchemes, schemeCount }) {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-pulse"></span>
          <span>{lang === "te" ? "రైతులు & సహకార సేవల డిజిటల్ సహాయకుడు" : "Digital Scheme Assistant for Agriculture & Cooperatives"}</span>
        </div>

        <h2 id="hero-title" className="hero-heading">
          {t.heroTitle}
        </h2>

        <p className="hero-description">
          {t.heroDescription}
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onBrowseSchemes}
          >
            <span className="btn-icon">🌾</span>
            {lang === "te" ? "పథకాల వివరాలు చూడండి" : "Explore Verified Schemes"}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenChat}
          >
            <span className="btn-icon">💬</span>
            {lang === "te" ? "సహాయకుడిని అడగండి (చాట్)" : "Ask Assistant in Simple Terms"}
          </button>
        </div>

        {/* Highlight Stats */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <span className="stat-number">{schemeCount}+</span>
            <span className="stat-label">{t.statVerified}</span>
            <span className="stat-sub">{lang === "te" ? "పీఎం కిసాన్, పీఎంఎఫ్‌బీవై, PACS" : "PM-KISAN, PMFBY, PACS"}</span>
          </div>

          <div className="stat-card">
            <span className="stat-number">2</span>
            <span className="stat-label">{t.statLanguages}</span>
            <span className="stat-sub">{lang === "te" ? "తెలుగు & English" : "English & తెలుగు"}</span>
          </div>

          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">{t.statAssistance}</span>
            <span className="stat-sub">{lang === "te" ? "ప్రభుత్వ పోర్టల్ లింకులు" : "Direct Official Portals"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
