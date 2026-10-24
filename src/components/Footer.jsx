import React from "react";

export default function Footer({ lang, t }) {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-symbol">🌾</span>
              <span className="logo-text">Innova Sphere</span>
            </div>
            <p className="footer-tagline">
              {lang === "te"
                ? "రైతులు మరియు సహకార సేవల కోసం బహుభాషా సమాచార సహాయకుడు."
                : "Multilingual AI Assistant for Farmers and Cooperative Services."}
            </p>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-links-title">
              {lang === "te" ? "అధికారిక ప్రభుత్వ పోర్టల్‌లు" : "Official Government Portals"}
            </h4>
            <ul className="footer-links-list">
              <li>
                <a href="https://pmkisan.gov.in" target="_blank" rel="noopener noreferrer">
                  PM-KISAN Portal ↗
                </a>
              </li>
              <li>
                <a href="https://pmfby.gov.in" target="_blank" rel="noopener noreferrer">
                  PM Fasal Bima Yojana (PMFBY) ↗
                </a>
              </li>
              <li>
                <a href="https://cooperation.gov.in" target="_blank" rel="noopener noreferrer">
                  Ministry of Cooperation, GoI ↗
                </a>
              </li>
              <li>
                <a href="https://agricoop.nic.in" target="_blank" rel="noopener noreferrer">
                  Agricoop (Agri & Farmers Welfare) ↗
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-coop-note">
            <h4 className="footer-links-title">
              {lang === "te" ? "గ్రామీణ సహకార సంఘాలు" : "Cooperative Society Support"}
            </h4>
            <p className="coop-note-text">
              {lang === "te"
                ? "రైతులు స్వల్పకాలిక పంట రుణాలు (KCC), రాయితీ ఎరువులు మరియు నాణ్యమైన విత్తనాల కొరకు మీ స్థానిక ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘం (PACS) లేదా జిల్లా కేంద్ర సహకార బ్యాంకు (DCCB)ను నేరుగా సంప్రదించవచ్చు."
                : "Farmers can approach their nearest Primary Agricultural Credit Society (PACS) or District Central Cooperative Bank (DCCB) branch for zero-hassle KCC crop loans and subsidized fertilizers."}
            </p>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p className="footer-disclaimer-text">{t.footerDisclaimer}</p>
          <p className="footer-copy-text">{t.footerCopyright} • Phase 1 Frontend</p>
        </div>
      </div>
    </footer>
  );
}
