import React from "react";

const QUICK_ACTIONS = [
  {
    id: "schemes",
    icon: SchemeInfoIcon,
    color: "green",
    labelEn: "Scheme Information",
    labelTe: "పథకం సమాచారం",
  },
  {
    id: "eligibility",
    icon: EligibilityIcon,
    color: "blue",
    labelEn: "Eligibility Check",
    labelTe: "అర్హత తనిఖీ",
  },
  {
    id: "documents",
    icon: DocumentsIcon,
    color: "purple",
    labelEn: "Required Documents",
    labelTe: "అవసరమైన పత్రాలు",
  },
  {
    id: "grievance",
    icon: GrievanceIcon,
    color: "red",
    labelEn: "Grievance Guidance",
    labelTe: "ఫిర్యాదు మార్గదర్శకత్వం",
  },
];

export default function WelcomeBanner({ lang, setActiveNav, onAskQuestion, schemeCount }) {
  const handleQuickAction = (actionId) => {
    if (actionId === "schemes") {
      setActiveNav("schemes");
    } else if (actionId === "eligibility" || actionId === "documents") {
      // Pre-populate the assistant
      const q = actionId === "eligibility"
        ? (lang === "te" ? "PM కిసాన్ అర్హత నిబంధనలు ఏమిటి?" : "What are the eligibility criteria for PM Kisan?")
        : (lang === "te" ? "పీఎం కిసాన్ కోసం ఏ పత్రాలు కావాలి?" : "What documents are needed for PM Kisan?");
      onAskQuestion(q);
    } else if (actionId === "grievance") {
      setActiveNav("grievance");
    }
  };

  return (
    <div className="welcome-banner">
      <div className="banner-content">
        <div className="banner-text">
          <h1 className="banner-title">
            {lang === "te" ? (
              <>ఇన్నోవా స్పియర్‌కు<br />స్వాగతం</>
            ) : (
              <>Welcome to<br />Innova Sphere</>
            )}
          </h1>
          <p className="banner-subtitle">
            {lang === "te"
              ? "ప్రభుత్వ పథకాలు, వ్యవసాయ సహాయం మరియు ఫిర్యాదు మార్గదర్శకత్వం కోసం మీ AI సహాయకుడు."
              : "Your AI assistant for government schemes, agricultural support, and grievance guidance."}
          </p>
        </div>

        {/* Farmer SVG Illustration */}
        <div className="banner-illustration" aria-hidden="true">
          <FarmerIllustration />
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="quick-actions-row">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = lang === "te" ? action.labelTe : action.labelEn;
          return (
            <button
              key={action.id}
              type="button"
              className={`quick-action-tile qa-${action.color}`}
              onClick={() => handleQuickAction(action.id)}
            >
              <span className="qa-icon"><Icon /></span>
              <span className="qa-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Quick Action Icons */
function SchemeInfoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function EligibilityIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function DocumentsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function GrievanceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

/* Inline SVG Farmer Illustration */
function FarmerIllustration() {
  return (
    <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="farmer-svg">
      {/* Sky/BG gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b2dfdb"/>
          <stop offset="100%" stopColor="#e8f5e9"/>
        </linearGradient>
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a574"/>
          <stop offset="100%" stopColor="#c4956a"/>
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="100" cy="110" r="95" fill="url(#skyGrad)" opacity="0.6"/>

      {/* Green field ground */}
      <ellipse cx="100" cy="200" rx="90" ry="20" fill="#66bb6a" opacity="0.5"/>

      {/* Body / kurta */}
      <rect x="72" y="120" width="56" height="70" rx="10" fill="#f5f5f0"/>
      {/* Collar */}
      <path d="M100 120 L93 134 L100 138 L107 134 Z" fill="#e8e0d4"/>
      {/* Arms */}
      <rect x="48" y="124" width="26" height="14" rx="7" fill="#f5f5f0"/>
      <rect x="126" y="124" width="26" height="14" rx="7" fill="#f5f5f0"/>

      {/* Hands */}
      <ellipse cx="50" cy="138" rx="8" ry="7" fill="url(#skinGrad)"/>
      {/* Phone in right hand */}
      <rect x="145" y="128" width="14" height="20" rx="3" fill="#263238"/>
      <rect x="147" y="131" width="10" height="14" rx="1" fill="#42a5f5"/>
      <circle cx="152" cy="146" r="1.5" fill="#90caf9"/>
      <ellipse cx="152" cy="131" rx="8" ry="7" fill="url(#skinGrad)"/>

      {/* Neck */}
      <rect x="94" y="108" width="12" height="14" rx="4" fill="url(#skinGrad)"/>

      {/* Head */}
      <ellipse cx="100" cy="92" rx="24" ry="26" fill="url(#skinGrad)"/>

      {/* Turban */}
      <ellipse cx="100" cy="70" rx="28" ry="10" fill="#ffffff"/>
      <path d="M72 70 Q100 54 128 70 Q118 58 100 56 Q82 58 72 70Z" fill="#f5f5f0"/>
      <ellipse cx="100" cy="70" rx="28" ry="8" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
      {/* Turban layers */}
      <path d="M74 68 Q100 60 126 68" stroke="#e8e8e8" strokeWidth="1.5" fill="none"/>
      <path d="M76 65 Q100 57 124 65" stroke="#e8e8e8" strokeWidth="1" fill="none"/>

      {/* Ears */}
      <ellipse cx="76" cy="92" rx="5" ry="7" fill="url(#skinGrad)"/>
      <ellipse cx="124" cy="92" rx="5" ry="7" fill="url(#skinGrad)"/>

      {/* Mustache */}
      <path d="M92 100 Q96 103 100 102 Q104 103 108 100" stroke="#5d4037" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Eyes */}
      <ellipse cx="91" cy="89" rx="4" ry="4.5" fill="white"/>
      <ellipse cx="109" cy="89" rx="4" ry="4.5" fill="white"/>
      <circle cx="92" cy="90" r="2.5" fill="#3e2723"/>
      <circle cx="110" cy="90" r="2.5" fill="#3e2723"/>
      <circle cx="93" cy="89" r="0.8" fill="white"/>
      <circle cx="111" cy="89" r="0.8" fill="white"/>

      {/* Smile */}
      <path d="M93 100 Q100 107 107 100" stroke="#8d6e63" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* Eyebrows */}
      <path d="M87 83 Q91 81 95 83" stroke="#5d4037" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M105 83 Q109 81 113 83" stroke="#5d4037" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* Small plants/crops below */}
      <g transform="translate(60, 185)">
        <rect x="0" y="0" width="3" height="12" rx="1" fill="#558b2f"/>
        <ellipse cx="1.5" cy="-2" rx="5" ry="7" fill="#66bb6a"/>
      </g>
      <g transform="translate(130, 183)">
        <rect x="0" y="0" width="3" height="14" rx="1" fill="#558b2f"/>
        <ellipse cx="1.5" cy="-2" rx="5" ry="8" fill="#7cb342"/>
      </g>
      <g transform="translate(84, 188)">
        <rect x="0" y="0" width="3" height="10" rx="1" fill="#558b2f"/>
        <ellipse cx="1.5" cy="-1" rx="4" ry="5" fill="#8bc34a"/>
      </g>
      <g transform="translate(108, 187)">
        <rect x="0" y="0" width="3" height="11" rx="1" fill="#558b2f"/>
        <ellipse cx="1.5" cy="-1" rx="4" ry="6" fill="#66bb6a"/>
      </g>
    </svg>
  );
}
