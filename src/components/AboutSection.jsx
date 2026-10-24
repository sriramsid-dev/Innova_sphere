import React from "react";
import { SAMPLE_DATA_METADATA } from "../data/schemes";

export default function AboutSection({ lang, t }) {
  return (
    <section className="about-section" aria-labelledby="about-heading">
      <div className="about-card">
        <div className="about-badge">
          <span>🌱 {lang === "te" ? "ప్రాజెక్ట్ నేపథ్యం" : "Project Overview"}</span>
        </div>

        <h2 id="about-heading" className="about-title">
          {lang === "te"
            ? "ఇన్నోవా స్పియర్ గురించి (Innova Sphere)"
            : "About Innova Sphere"}
        </h2>

        <p className="about-lead">
          {lang === "te"
            ? "రైతులు మరియు వ్యవసాయ సహకార సంఘాల సభ్యులకు ప్రభుత్వ పథకాలు, అర్హతలు, అవసరమైన పత్రాలు మరియు దరఖాస్తు ప్రక్రియపై సరళమైన, స్పష్టమైన సమాచారాన్ని అందించడమే ఇన్నోవా స్పియర్ ప్రధాన లక్ష్యం."
            : "Innova Sphere is a dedicated multilingual informational platform designed to break down linguistic and procedural barriers for farmers and rural cooperative members seeking government assistance."}
        </p>

        <div className="about-grid">
          <div className="about-box">
            <span className="box-icon">🎯</span>
            <h3>{lang === "te" ? "ప్రధాన లక్ష్యాలు" : "Core Mission"}</h3>
            <ul>
              <li>
                {lang === "te"
                  ? "రైతులకు అర్థమయ్యే సరళమైన తెలుగు మరియు ఆంగ్లంలో పథకాల వివరాలు అందించడం."
                  : "Deliver verified scheme guidelines in accessible, simple English and Telugu."}
              </li>
              <li>
                {lang === "te"
                  ? "దరఖాస్తుకు ముందే అర్హతలు మరియు అవసరమైన పత్రాల చెక్‌లిస్ట్‌ను తెలియజేయడం."
                  : "Provide clear eligibility criteria and document checklists before visiting offices."}
              </li>
              <li>
                {lang === "te"
                  ? "ప్రాథమిక వ్యవసాయ సహకార పరపతి సంఘాల (PACS) సేవలను సులభంగా అర్థమయ్యేలా చేయడం."
                  : "Demystify village-level Primary Agricultural Credit Societies (PACS) and KCC loans."}
              </li>
            </ul>
          </div>

          <div className="about-box">
            <span className="box-icon">🛡️</span>
            <h3>{lang === "te" ? "డేటా ధృవీకరణ & పారదర్శకత" : "Data Verification & Transparency"}</h3>
            <ul>
              <li>
                {lang === "te"
                  ? "నమూనా డేటాలోని ప్రతి సమాచారం నేరుగా అధికారిక భారత ప్రభుత్వ వెబ్‌సైట్‌ల నుండి ధృవీకరించబడింది."
                  : "Every entry is verified against authentic Government of India portals (PM-KISAN, PMFBY, Cooperation)."}
              </li>
              <li>
                {lang === "te"
                  ? "నకిలీ లాగిన్‌లు, నకిలీ దరఖాస్తు ఫారాలు లేదా నకిలీ చెల్లింపు గేట్‌వేలు ఏవీ లేవు."
                  : "Zero fake buttons, no simulated payments, and no fabricated application forms."}
              </li>
              <li>
                {lang === "te"
                  ? "ప్రస్తుత అసిస్టెంట్ ధృవీకరించబడిన స్థానిక నమూనా రికార్డులను శోధిస్తుంది (లైవ్ AI మోడల్‌గా నటించదు)."
                  : "Assistant operates as an honest local query engine without pretending to be a live external LLM."}
              </li>
            </ul>
          </div>
        </div>

        {/* Phase 1 Status & Roadmap */}
        <div className="roadmap-card">
          <h3>📌 {lang === "te" ? "ప్రస్తుత స్థితి మరియు పరిమితులు" : "Phase 1 Status & Current Architecture"}</h3>
          <p>
            {lang === "te"
              ? "ఇది ప్రాజెక్ట్ యొక్క ప్రారంభ ఫ్రంటెండ్ (Phase 1). ఇందులో డేటా లేయర్, సెర్చ్ లాజిక్, మరియు యూఐ వేర్వేరు ఫైల్స్‌లో చక్కగా విభజించబడ్డాయి. భవిష్యత్తులో బ్యాకెండ్ ఏపీఐ లేదా లైవ్ AI మోడల్‌ను సులభంగా అనుసంధానించవచ్చు."
              : "This frontend is designed with decoupled data and search service layers. The local verified dataset can be swapped with a live REST API or full AI service layer in Phase 2 without rewriting the user interface."}
          </p>
          <div className="limitations-pills">
            <span className="limitation-tag">✓ Clean React + Vite Architecture</span>
            <span className="limitation-tag">✓ Responsive Mobile Design</span>
            <span className="limitation-tag">✓ Modular Data Layer (`src/data/schemes.js`)</span>
            <span className="limitation-tag">✓ Plug-and-play Search Service (`src/services/searchService.js`)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
