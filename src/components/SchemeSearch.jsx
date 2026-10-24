import React, { useState, useEffect } from "react";
import SchemeCard from "./SchemeCard";
import { searchSchemes } from "../services/searchService";

export default function SchemeSearch({ lang, t, highlightedSchemeId }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [schemes, setSchemes] = useState([]);
  const [dataSource, setDataSource] = useState(null); // "live" | "sample" | null
  const [dbStatus, setDbStatus] = useState("not_configured");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    searchSchemes({ query, category, lang })
      .then(({ schemes: results, source, dbStatus: status, error }) => {
        if (!isMounted) return;
        setSchemes(results);
        setDataSource(source);
        if (status) setDbStatus(status);
        if (error) setFetchError(error);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error searching schemes:", err);
        if (isMounted) {
          setFetchError(err.message || "Unknown error");
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [query, category, lang]);

  const handleClear = () => {
    setQuery("");
    setCategory("all");
  };

  const categories = [
    { id: "all",                   label: t.categoryAll },
    { id: "income_support",        label: t.categoryIncome },
    { id: "crop_insurance",        label: t.categoryInsurance },
    { id: "cooperative_services",  label: t.categoryCoop },
  ];

  return (
    <section className="scheme-search-section" id="scheme-directory" aria-labelledby="search-heading">
      <div className="section-header">
        <h2 id="search-heading" className="section-title">{t.searchHeading}</h2>
        <p className="section-subtitle">
          {lang === "te"
            ? "కిసాన్, బీమా, లేదా సొసైటీ రుణాల గురించి వెతకండి"
            : "Search verified schemes, eligibility rules, and required paperwork"}
        </p>
      </div>

      {/* ── Contextual Directory Notice ─────────────────────────────────── */}
      {dbStatus === "connected_empty" && (
        <div className="directory-notice warning-notice" role="note">
          <span className="dn-icon">🟡</span>
          <div className="dn-text">
            <strong>
              {lang === "te"
                ? "డేటాబేస్ పట్టిక ఖాళీగా ఉంది (0 రికార్డులు) — నమూనా డేటా ప్రివ్యూ"
                : "Supabase connected, but public.schemes has 0 records"}
            </strong>
            <p>
              {lang === "te"
                ? "సుపాబేస్ పట్టికతో అనుసంధానం విజయవంతమైంది, కానీ అందులో ఇంకా పథకాలు లేవు. ఇంటర్‌ఫేస్ మరియు ఫీచర్ల ప్రదర్శన కోసం క్రింద ధృవీకరించిన స్థానిక నమూనా పథకాలు చూపబడుతున్నాయి."
                : "The database connection is active, but the table contains no records yet. Displaying verified local sample schemes below for preview and demonstration."}
            </p>
          </div>
        </div>
      )}

      {dbStatus === "connected" && (
        <div className="directory-notice live-notice" role="note">
          <span className="dn-icon">🟢</span>
          <div className="dn-text">
            <strong>
              {lang === "te"
                ? "లైవ్ డేటాబేస్ నుండి పథకాలు"
                : "Showing live scheme records from Supabase database"}
            </strong>
          </div>
        </div>
      )}

      {/* ── Search input ────────────────────────────────────────────────── */}
      <div className="search-control-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery("")}
              title={t.clearFilter}
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

        <div className="category-filter-group" role="group" aria-label="Scheme Category Filters">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-pill-btn ${category === cat.id ? "active" : ""}`}
              onClick={() => setCategory(cat.id)}
              aria-pressed={category === cat.id}
            >
              {cat.label}
            </button>
          ))}
          {(query || category !== "all") && (
            <button type="button" className="reset-filter-btn" onClick={handleClear}>
              ↺ {t.clearFilter}
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ───────────────────────────────────────────────── */}
      <div className="results-status-bar">
        <span className="results-count">
          {t.showingResults.replace("{count}", schemes.length)}
        </span>
        <span className="results-meta-note">
          {dataSource === "live"
            ? (lang === "te" ? "లైవ్ డేటాబేస్ రికార్డులు" : "From live database")
            : dbStatus === "connected_empty"
            ? (lang === "te" ? "నమూనా ప్రివ్యూ · public.schemes ఖాళీగా ఉంది" : "Sample preview · public.schemes is empty")
            : (lang === "te" ? "అధికారిక ప్రభుత్వ రికార్డుల ఆధారంగా నమూనా డేటా" : "Verified sample data · official portals")}
        </span>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {fetchError ? (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>
            {lang === "te"
              ? `శోధన లోపం: ${fetchError}`
              : `Search error: ${fetchError}`}
          </p>
        </div>
      ) : loading ? (
        <div className="loading-state">
          <span className="spinner">⏳</span>
          <p>{lang === "te" ? "శోధిస్తోంది..." : "Searching records…"}</p>
        </div>
      ) : schemes.length > 0 ? (
        <div className="schemes-grid">
          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              lang={lang}
              t={t}
              isHighlighted={highlightedSchemeId === scheme.id}
            />
          ))}
        </div>
      ) : (
        <div className="empty-results-box">
          <span className="empty-icon">🌾</span>
          <h3 className="empty-title">{t.noResultsTitle}</h3>
          <p className="empty-hint">{t.noResultsHint}</p>
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            {t.clearFilter}
          </button>
        </div>
      )}
    </section>
  );
}
