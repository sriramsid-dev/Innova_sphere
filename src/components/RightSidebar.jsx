import React from "react";

export default function RightSidebar({ lang, setActiveNav, onSelectScheme, SCHEMES_DATA }) {
  const popularSchemes = [
    { id: "rythu-bandhu",   icon: "🌾", nameEn: "Rythu Bandhu",    nameTe: "రైతు బంధు",      url: "https://rythubandhu.telangana.gov.in" },
    { id: "pm-kisan",       icon: "👥", nameEn: "PM Kisan",         nameTe: "పీఎం కిసాన్",    url: "https://pmkisan.gov.in" },
    { id: "pmfby",          icon: "🛡️", nameEn: "Crop Insurance",   nameTe: "పంట బీమా",       url: "https://pmfby.gov.in" },
    { id: "soil-health",    icon: "🌱", nameEn: "Soil Health Card", nameTe: "మట్టి ఆరోగ్య కార్డు", url: "https://soilhealth.dac.gov.in" },
    { id: "subsidy-schemes",icon: "💰", nameEn: "Subsidy Schemes",  nameTe: "సబ్సిడీ పథకాలు", url: "https://agricoop.gov.in" },
  ];

  const handleSchemeClick = (scheme) => {
    // If it's a locally available scheme, navigate to it
    const localScheme = SCHEMES_DATA?.find(s => s.id === scheme.id);
    if (localScheme) {
      onSelectScheme(scheme.id);
    } else {
      // External scheme — open portal
      window.open(scheme.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <aside className="right-sidebar">
      {/* Popular Schemes */}
      <div className="rs-panel popular-schemes-panel">
        <div className="rs-panel-header">
          <span className="rs-panel-icon star-icon">⭐</span>
          <h3 className="rs-panel-title">
            {lang === "te" ? "ప్రముఖ పథకాలు" : "Popular Schemes"}
          </h3>
        </div>
        <ul className="rs-scheme-list">
          {popularSchemes.map((scheme) => (
            <li key={scheme.id}>
              <button
                type="button"
                className="rs-scheme-item"
                onClick={() => handleSchemeClick(scheme)}
                title={lang === "te" ? scheme.nameTe : scheme.nameEn}
              >
                <span className="rs-scheme-icon">{scheme.icon}</span>
                <span className="rs-scheme-name">
                  {lang === "te" ? scheme.nameTe : scheme.nameEn}
                </span>
                <span className="rs-chevron">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Need Help */}
      <div className="rs-panel need-help-panel">
        <div className="rs-panel-header">
          <span className="rs-panel-icon phone-icon">📞</span>
          <h3 className="rs-panel-title">
            {lang === "te" ? "సహాయం కావాలా?" : "Need Help?"}
          </h3>
        </div>
        <p className="rs-helpline-label">
          {lang === "te" ? "రైతు సహాయ కేంద్రం" : "Farmer Helpline"}
        </p>
        <a
          href="tel:1800-180-1551"
          className="rs-helpline-number"
          title="Call Farmer Helpline (Toll Free)"
        >
          <span className="rs-phone-icon">📱</span>
          <span>1800-180-1551</span>
        </a>
        <p className="rs-helpline-sub">
          {lang === "te" ? "(టోల్ ఫ్రీ)" : "(Toll Free)"}
        </p>
      </div>

      {/* Useful Resources */}
      <div className="rs-panel useful-resources-panel">
        <div className="rs-panel-header">
          <span className="rs-panel-icon">🔗</span>
          <h3 className="rs-panel-title">
            {lang === "te" ? "ఉపయోగకర వనరులు" : "Useful Resources"}
          </h3>
        </div>
        <ul className="rs-resource-list">
          <li>
            <a
              href="https://agricoop.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="rs-resource-link"
            >
              <span className="rs-res-icon">🌐</span>
              <span>{lang === "te" ? "అధికారిక ప్రభుత్వ వెబ్‌సైట్లు" : "Official Government Websites"}</span>
              <span className="rs-chevron">›</span>
            </a>
          </li>
          <li>
            <a
              href="https://www.youtube.com/@KrishiDarshanDD"
              target="_blank"
              rel="noopener noreferrer"
              className="rs-resource-link"
            >
              <span className="rs-res-icon">📹</span>
              <span>{lang === "te" ? "రైతు శిక్షణ వీడియోలు" : "Farmer Training Videos"}</span>
              <span className="rs-chevron">›</span>
            </a>
          </li>
          <li>
            <a
              href="https://agri.telangana.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="rs-resource-link"
            >
              <span className="rs-res-icon">📍</span>
              <span>{lang === "te" ? "స్థానిక వ్యవసాయ కార్యాలయాలు" : "Local Agriculture Offices"}</span>
              <span className="rs-chevron">›</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
