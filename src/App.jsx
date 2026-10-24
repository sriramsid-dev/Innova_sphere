import React, { useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DataSourceBanner from "./components/DataSourceBanner";
import WelcomeBanner from "./components/WelcomeBanner";
import AssistantPanel from "./components/AssistantPanel";
import SchemeSearch from "./components/SchemeSearch";
import GrievancePanel from "./components/GrievancePanel";
import RightSidebar from "./components/RightSidebar";
import { translations } from "./translations/i18n";
import { SCHEMES_DATA } from "./data/schemes";
import { checkSupabaseHealth } from "./services/searchService";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

export default function App() {
  const [lang, setLang] = useState("en");
  // activeNav: 'home' | 'chat' | 'schemes' | 'grievance'
  const [activeNav, setActiveNav] = useState("home");
  const [highlightedSchemeId, setHighlightedSchemeId] = useState(null);
  // Pending question to send to assistant
  const [pendingQuestion, setPendingQuestion] = useState(null);

  // Supabase connection state
  const [dbHealth, setDbHealth] = useState({
    status: isSupabaseConfigured ? "connected_empty" : "not_configured",
    recordCount: 0,
    errorMessage: "",
    isChecking: false,
  });

  const checkConnection = useCallback(async () => {
    setDbHealth((prev) => ({ ...prev, isChecking: true }));
    const health = await checkSupabaseHealth();
    setDbHealth({
      status: health.status,
      recordCount: health.recordCount,
      errorMessage: health.error || "",
      isChecking: false,
    });
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const t = translations[lang] || translations.en;

  // Navigate to schemes and highlight a specific scheme
  const handleSelectScheme = useCallback((schemeId) => {
    setActiveNav("schemes");
    setHighlightedSchemeId(schemeId);
    setTimeout(() => {
      const el = document.getElementById(`scheme-${schemeId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightedSchemeId(null), 4500);
  }, []);

  // Navigate to chat + pre-fill a question
  const handleAskQuestion = useCallback((question) => {
    setActiveNav("chat");
    setPendingQuestion(question);
  }, []);

  // Home nav → show home view
  const handleSetActiveNav = useCallback((nav) => {
    setActiveNav(nav);
    if (nav !== "chat") setPendingQuestion(null);
  }, []);

  // What to render in center column
  const renderCenter = () => {
    if (activeNav === "home") {
      return (
        <>
          <WelcomeBanner
            lang={lang}
            setActiveNav={handleSetActiveNav}
            onAskQuestion={handleAskQuestion}
            schemeCount={SCHEMES_DATA.length}
          />
          <AssistantPanel
            lang={lang}
            t={t}
            onSelectScheme={handleSelectScheme}
            externalQuery={pendingQuestion}
            onExternalQueryConsumed={() => setPendingQuestion(null)}
          />
        </>
      );
    }

    if (activeNav === "chat") {
      return (
        <div className="chat-only-view">
          <AssistantPanel
            lang={lang}
            t={t}
            onSelectScheme={handleSelectScheme}
            externalQuery={pendingQuestion}
            onExternalQueryConsumed={() => setPendingQuestion(null)}
          />
        </div>
      );
    }

    if (activeNav === "schemes") {
      return (
        <SchemeSearch
          lang={lang}
          t={t}
          highlightedSchemeId={highlightedSchemeId}
        />
      );
    }

    if (activeNav === "grievance") {
      return <GrievancePanel lang={lang} />;
    }

    return null;
  };

  return (
    <div className={`app-root lang-${lang}`}>
      <Header lang={lang} setLang={setLang} t={t} />

      <div className="app-body">
        <Sidebar
          activeNav={activeNav}
          setActiveNav={handleSetActiveNav}
          lang={lang}
        />

        <main className="center-column" id="main-content">
          <DataSourceBanner
            lang={lang}
            status={dbHealth.status}
            recordCount={dbHealth.recordCount}
            errorMessage={dbHealth.errorMessage}
            onRefresh={checkConnection}
            isRefreshing={dbHealth.isChecking}
          />
          {renderCenter()}
        </main>

        <RightSidebar
          lang={lang}
          setActiveNav={handleSetActiveNav}
          onSelectScheme={handleSelectScheme}
          SCHEMES_DATA={SCHEMES_DATA}
        />
      </div>

      {/* Minimal footer */}
      <footer className="app-footer">
        <p className="footer-notice">
          {lang === "te"
            ? "ℹ️ ఇన్నోవా స్పియర్ స్వతంత్ర సమాచార వేదిక. తుది నిబంధనల కోసం అధికారిక ప్రభుత్వ పోర్టల్‌లను సంప్రదించండి."
            : "ℹ️ Innova Sphere is an independent information guide. Always verify final rules on official government portals. Data sourced from pmkisan.gov.in, pmfby.gov.in, cooperation.gov.in."}
        </p>
      </footer>
    </div>
  );
}
