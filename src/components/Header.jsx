import React, { useState } from "react";

export default function Header({ lang, setLang, t }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Branding */}
        <div className="header-brand">
          <div className="brand-logo" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#1b5e20"/>
              <path d="M20 8 C14 8 10 13 10 18 C10 24 14 27 20 32 C26 27 30 24 30 18 C30 13 26 8 20 8Z" fill="#4caf50"/>
              <path d="M20 13 C17 13 15 15 15 18 C15 21 17 23 20 26 C23 23 25 21 25 18 C25 15 23 13 20 13Z" fill="#81c784"/>
              <circle cx="20" cy="18" r="3" fill="#ffffff"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">Innova Sphere</span>
            <span className="brand-tagline">
              {lang === "te" ? "రైతుల కోసం AI సహాయకుడు" : "AI Support for Farmers"}
            </span>
          </div>
        </div>

        {/* Right: Language + Profile */}
        <div className="header-right">
          {/* Language Toggle */}
          <div className="lang-toggle" role="group" aria-label="Language selection">
            <button
              type="button"
              className={`lang-btn${lang === "en" ? " active" : ""}`}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn telugu-btn${lang === "te" ? " active" : ""}`}
              onClick={() => setLang("te")}
              aria-pressed={lang === "te"}
            >
              తెలుగు
            </button>
          </div>

          {/* Farmer Profile Menu */}
          <div className="profile-menu-wrapper">
            <button
              type="button"
              className="profile-btn"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              id="profile-menu-btn"
            >
              <span className="profile-avatar" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <span className="profile-label">
                {lang === "te" ? "రైతు" : "Farmer"}
              </span>
              <span className="profile-chevron" aria-hidden="true">▾</span>
            </button>

            {profileOpen && (
              <div className="profile-dropdown" role="menu" aria-labelledby="profile-menu-btn">
                <div className="profile-dropdown-header">
                  <span className="pd-icon">👤</span>
                  <span>{lang === "te" ? "రైతు ప్రొఫైల్" : "Farmer Profile"}</span>
                </div>
                <div className="pd-notice">
                  {lang === "te"
                    ? "ప్రొఫైల్ నిర్వహణ త్వరలో వస్తుంది"
                    : "Profile management coming soon"}
                </div>
                <button
                  type="button"
                  className="pd-close"
                  onClick={() => setProfileOpen(false)}
                  role="menuitem"
                >
                  {lang === "te" ? "మూసివేయి" : "Close"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
