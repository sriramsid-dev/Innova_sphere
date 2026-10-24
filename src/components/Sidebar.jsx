import React from "react";

const NAV_ITEMS = [
  { id: "home",      icon: HomeIcon,      labelEn: "Home",               labelTe: "హోమ్" },
  { id: "chat",      icon: AskAIIcon,     labelEn: "Ask AI",             labelTe: "AI అడగండి" },
  { id: "schemes",   icon: SchemesIcon,   labelEn: "Schemes",            labelTe: "పథకాలు" },
  { id: "crops",     icon: CropsIcon,     labelEn: "Crops & Farming",    labelTe: "పంటలు & వ్యవసాయం" },
  { id: "documents", icon: DocumentsIcon, labelEn: "Documents",          labelTe: "పత్రాలు" },
  { id: "grievance", icon: GrievanceIcon, labelEn: "Grievance Guidance", labelTe: "ఫిర్యాదు మార్గదర్శకత్వం" },
  { id: "saved",     icon: SavedIcon,     labelEn: "Saved Information",  labelTe: "సేవ్ చేసిన సమాచారం" },
];

export default function Sidebar({ activeNav, setActiveNav, lang }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const label = lang === "te" ? item.labelTe : item.labelEn;
          const isActive = activeNav === item.id;
          const isComingSoon = item.id === "crops" || item.id === "documents" || item.id === "saved";
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item${isActive ? " active" : ""}${isComingSoon ? " coming-soon" : ""}`}
              onClick={() => !isComingSoon && setActiveNav(item.id)}
              title={isComingSoon ? (lang === "te" ? "త్వరలో వస్తుంది" : "Coming soon") : label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sidebar-icon"><Icon /></span>
              <span className="sidebar-label">{label}</span>
              {isComingSoon && (
                <span className="sidebar-soon-badge">
                  {lang === "te" ? "త్వరలో" : "Soon"}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom-art" aria-hidden="true">
        <div className="sidebar-landscape">
          <svg viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="90" fill="#e8f5e9"/>
            <circle cx="140" cy="22" r="12" fill="#FFF176" opacity="0.8"/>
            <ellipse cx="50" cy="70" rx="60" ry="30" fill="#a5d6a7"/>
            <ellipse cx="130" cy="72" rx="65" ry="28" fill="#81c784"/>
            <rect x="18" y="42" width="5" height="20" rx="2" fill="#5d4037"/>
            <ellipse cx="20" cy="38" rx="12" ry="14" fill="#2e7d32"/>
            <rect x="148" y="45" width="5" height="18" rx="2" fill="#5d4037"/>
            <ellipse cx="150" cy="40" rx="10" ry="12" fill="#388e3c"/>
            <rect x="0" y="68" width="180" height="22" rx="0" fill="#66bb6a"/>
            <ellipse cx="90" cy="80" rx="18" ry="5" fill="#a5d6a7" opacity="0.6"/>
          </svg>
        </div>
        <p className="sidebar-tagline">
          {lang === "te"
            ? "మన రైతులకు\nఉజ్వల భవిష్యత్తు"
            : "Better Information\nBrighter Futures\nfor Our Farmers"}
        </p>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  );
}
function AskAIIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="14" rx="2"/>
      <path d="M3 21l4-4h14"/>
    </svg>
  );
}
function SchemesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  );
}
function CropsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/>
      <path d="M12 12C12 12 8 9 5 5c4 0 7 3 7 7z"/>
      <path d="M12 12c0 0 4-3 7-7-4 0-7 3-7 7z"/>
    </svg>
  );
}
function DocumentsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function GrievanceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function SavedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  );
}
