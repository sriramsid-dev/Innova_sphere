import React from "react";

/**
 * Innova Sphere — Supabase Data Source Banner
 *
 * Displays one of the 4 explicit connection states:
 *   1. "connected"       — Connected — showing database data (records > 0)
 *   2. "not_configured"  — Not connected — showing sample data
 *   3. "connected_empty" — Connected, but no scheme records found (records === 0)
 *   4. "error"           — Database request failed (shows error, fallback to sample data)
 */
export default function DataSourceBanner({
  lang = "en",
  status = "not_configured", // "connected" | "not_configured" | "connected_empty" | "error"
  recordCount = 0,
  errorMessage = "",
  onRefresh,
  isRefreshing = false,
}) {
  const getBannerDetails = () => {
    switch (status) {
      case "connected":
        return {
          type: "live",
          icon: "🟢",
          titleEn: "Connected — showing database data",
          titleTe: "సుపాబేస్‌కు అనుసంధానించబడింది — లైవ్ డేటాబేస్ రికార్డులు",
          msgEn: `Connected to Supabase public.schemes table (${recordCount} live ${recordCount === 1 ? "scheme" : "schemes"} loaded).`,
          msgTe: `సుపాబేస్ public.schemes పట్టిక నుండి డేటా అందుబాటులో ఉంది (${recordCount} లైవ్ పథకాలు).`,
        };

      case "connected_empty":
        return {
          type: "warning",
          icon: "🟡",
          titleEn: "Connected, but no scheme records found",
          titleTe: "అనుసంధానించబడింది — కానీ రికార్డులు లేవు",
          msgEn: "Successfully connected to Supabase, but public.schemes contains 0 records. Showing verified local sample data for preview.",
          msgTe: "సుపాబేస్‌తో అనుసంధానం విజయవంతమైంది, కానీ public.schemes లో ఎటువంటి రికార్డులు లేవు (0 పథకాలు). ప్రివ్యూ కోసం ధృవీకరించిన స్థానిక నమూనా డేటా చూపబడుతోంది.",
        };

      case "error":
        return {
          type: "error",
          icon: "🔴",
          titleEn: "Database request failed",
          titleTe: "డేటాబేస్ అభ్యర్థన విఫలమైంది",
          msgEn: errorMessage
            ? `Query error: ${errorMessage}. Showing verified local sample data as fallback.`
            : "Could not reach database. Showing verified local sample data as fallback.",
          msgTe: errorMessage
            ? `లోపం: ${errorMessage}. ధృవీకరించిన స్థానిక నమూనా డేటా చూపబడుతోంది.`
            : "డేటాబేస్‌ను సంప్రదించలేకపోయాము. ధృవీకరించిన స్థానిక నమూనా డేటా చూపబడుతోంది.",
        };

      case "not_configured":
      default:
        return {
          type: "sample",
          icon: "ℹ️",
          titleEn: "Not connected — showing sample data",
          titleTe: "డేటాబేస్ అనుసంధానం లేదు — నమూనా డేటా",
          msgEn: "Supabase credentials not configured in .env.local. Showing verified local sample data.",
          msgTe: "సుపాబేస్ క్రెడెన్షియల్స్ లేవు — ధృవీకరించిన స్థానిక నమూనా డేటా చూపబడుతోంది. ఇది నేరుగా ప్రభుత్వ సర్వర్ నుండి రాలేదు.",
        };
    }
  };

  const details = getBannerDetails();
  const title = lang === "te" ? details.titleTe : details.titleEn;
  const message = lang === "te" ? details.msgTe : details.msgEn;

  return (
    <aside
      className={`data-source-banner banner-${details.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="dsb-icon" aria-hidden="true">
        {details.icon}
      </span>
      <div className="dsb-content">
        <div className="dsb-header-line">
          <strong className="dsb-title">{title}</strong>
          <span className="dsb-badge badge-${details.type}">
            {status === "connected"
              ? (lang === "te" ? "లైవ్ డేటాబేస్" : "Live Database")
              : status === "connected_empty"
              ? (lang === "te" ? "పట్టిక ఖాళీగా ఉంది (నమూనా ప్రివ్యూ)" : "Empty Table (Sample Preview)")
              : status === "error"
              ? (lang === "te" ? "లోపం (నమూనా డేటా)" : "Error (Sample Fallback)")
              : (lang === "te" ? "స్థానిక నమూనా డేటా" : "Local Sample Data")}
          </span>
        </div>
        <p className="dsb-message">{message}</p>
      </div>
      {onRefresh && (
        <button
          type="button"
          className="dsb-refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title={lang === "te" ? "కనెక్షన్‌ను తిరిగి తనిఖీ చేయండి" : "Re-check database connection"}
        >
          {isRefreshing ? "⏳" : "🔄"} {lang === "te" ? "తనిఖీ" : "Re-check"}
        </button>
      )}
    </aside>
  );
}
