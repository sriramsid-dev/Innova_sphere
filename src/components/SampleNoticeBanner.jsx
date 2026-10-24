import React, { useState } from "react";
import { SAMPLE_DATA_METADATA } from "../data/schemes";

export default function SampleNoticeBanner({ lang, t }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sample-notice-banner" aria-label="Sample Data Verification Notice">
      <div className="sample-notice-container">
        <div className="notice-header-row">
          <div className="notice-tag">
            <span className="notice-icon">🛡️</span>
            <strong>{t.sampleNoticeTitle}</strong>
            <span className="badge-verified">✓ {SAMPLE_DATA_METADATA.verificationStatus}</span>
          </div>
          <button
            type="button"
            className="notice-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
          >
            {collapsed ? (lang === "te" ? "వివరాలు చూపు" : "Show Details") : (lang === "te" ? "దాచు" : "Hide Details")}
          </button>
        </div>

        {!collapsed && (
          <div className="notice-content">
            <p className="notice-text">
              {lang === "te" ? SAMPLE_DATA_METADATA.disclaimerTe : SAMPLE_DATA_METADATA.disclaimerEn}
            </p>
            <div className="notice-sources">
              <span className="sources-label">{lang === "te" ? "ధృవీకరించిన అధికారిక పోర్టల్‌లు:" : "Verified Official Sources:"}</span>
              <a href="https://pmkisan.gov.in" target="_blank" rel="noopener noreferrer" className="source-pill">
                pmkisan.gov.in ↗
              </a>
              <a href="https://pmfby.gov.in" target="_blank" rel="noopener noreferrer" className="source-pill">
                pmfby.gov.in ↗
              </a>
              <a href="https://cooperation.gov.in" target="_blank" rel="noopener noreferrer" className="source-pill">
                cooperation.gov.in ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
