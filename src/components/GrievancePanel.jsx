import React from "react";

export default function GrievancePanel({ lang }) {
  const helpline = "1800-180-1551";
  const pgPortal = "https://pgportal.gov.in";

  return (
    <section className="grievance-panel" aria-labelledby="grievance-heading">
      <div className="grievance-header">
        <span className="grievance-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        <h2 id="grievance-heading">
          {lang === "te" ? "ఫిర్యాదు మార్గదర్శకత్వం" : "Grievance Guidance"}
        </h2>
      </div>

      <div className="grievance-notice">
        <p>
          {lang === "te"
            ? "ఇది ఫిర్యాదు నమోదు వ్యవస్థ కాదు. ఫిర్యాదు నమోదు కోసం అధికారిక ప్రభుత్వ పోర్టల్‌లు లేదా హెల్ప్‌లైన్‌లను ఉపయోగించండి."
            : "This is an information guide, not an official grievance portal. To formally file a complaint, use the official government portals or helplines listed below."}
        </p>
      </div>

      <div className="grievance-steps">
        <h3>{lang === "te" ? "ఫిర్యాదు నమోదు చేసే విధానం" : "How to Register a Grievance"}</h3>
        <ol className="grievance-step-list">
          {(lang === "te" ? [
            "మీ సమస్య స్పష్టంగా రాసుకోండి — పథకం పేరు, అర్జీ సంఖ్య మరియు ఏ దశలో సమస్య వచ్చిందో.",
            "మొదట సంబంధిత పోర్టల్‌కు (pmkisan.gov.in / pmfby.gov.in) వెళ్ళి 'Grievance' విభాగంలో ఫిర్యాదు నమోదు చేయండి.",
            "అధికారిక కేంద్ర పోర్టల్: pgportal.gov.in లో కూడా ఏ కేంద్ర ప్రభుత్వ పథకంపైనైనా ఫిర్యాదు నమోదు చేయవచ్చు.",
            "రైతు సహాయ హెల్ప్‌లైన్‌కు కాల్ చేయండి: 1800-180-1551 (టోల్ ఫ్రీ)",
            "స్థానిక వ్యవసాయ కార్యాలయాన్ని సంప్రదించండి — జిల్లా వ్యవసాయ అధికారి (DAO) మీకు మార్గదర్శకత్వం చేయగలరు.",
          ] : [
            "Document your issue clearly — scheme name, application ID, and at which step you faced a problem.",
            "First try the scheme-specific portal's Grievance section (pmkisan.gov.in / pmfby.gov.in).",
            "Use the Central Government Grievance Portal pgportal.gov.in for any Central scheme complaint.",
            "Call the Farmer Helpline: 1800-180-1551 (Toll Free)",
            "Visit your local Agriculture Office — the District Agriculture Officer (DAO) can assist you.",
          ]).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="grievance-links">
        <h3>{lang === "te" ? "అధికారిక ఫిర్యాదు పోర్టల్‌లు" : "Official Grievance Portals"}</h3>
        <div className="grievance-portal-list">
          {[
            { name: "CPGRAMS (Central Government)", url: pgPortal, desc: lang === "te" ? "కేంద్ర పోర్టల్" : "Central portal" },
            { name: "PM-KISAN Grievances", url: "https://pmkisan.gov.in/Grievance.aspx", desc: lang === "te" ? "పీఎం కిసాన్ ఫిర్యాదులు" : "PM Kisan complaints" },
            { name: "PMFBY Grievances", url: "https://pmfby.gov.in/farmerGrievanceHome", desc: lang === "te" ? "పంట బీమా ఫిర్యాదులు" : "Crop insurance complaints" },
          ].map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grievance-portal-link"
            >
              <span className="gp-icon">🏛️</span>
              <div>
                <span className="gp-name">{p.name}</span>
                <span className="gp-desc">{p.desc}</span>
              </div>
              <span className="gp-arrow">↗</span>
            </a>
          ))}
        </div>

        <div className="grievance-helpline-card">
          <span className="gh-icon">📞</span>
          <div>
            <p className="gh-label">{lang === "te" ? "రైతు సహాయ హెల్ప్‌లైన్" : "Farmer Helpline"}</p>
            <a href={`tel:${helpline}`} className="gh-number">{helpline}</a>
            <p className="gh-sub">{lang === "te" ? "టోల్ ఫ్రీ • సోమవారం–శనివారం 6am–10pm" : "Toll Free • Mon–Sat 6am–10pm"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
