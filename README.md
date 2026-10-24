# Innova Sphere – Multilingual AI Assistant for Farmers & Cooperative Services

Innova Sphere is a bilingual (English / తెలుగు) web application that helps farmers and rural cooperative members find verified government scheme information, understand eligibility, check required documents, and follow step-by-step application instructions in simple language.

It ships with a React frontend, an Express API server that can answer with Google Gemini (grounded on our own data), and a Supabase-backed verified scheme dataset with a local sample fallback.

---

## ✨ Key Features

1. **Bilingual support (English & Telugu)** — full toggle between English and native Telugu script; headings, badges, tabs, cards, assistant replies, and quick-reply chips all switch dynamically.
2. **Verified reference dataset** — three verified schemes and cooperative services:
   - **PM-KISAN** (Pradhan Mantri Kisan Samman Nidhi) – [pmkisan.gov.in](https://pmkisan.gov.in)
   - **PMFBY** (Pradhan Mantri Fasal Bima Yojana) – [pmfby.gov.in](https://pmfby.gov.in)
   - **PACS & Cooperative Credit** (Ministry of Cooperation) – [cooperation.gov.in](https://cooperation.gov.in)
   - No invented eligibility criteria, benefits, amounts, or URLs.
3. **Conversational assistant (`src/components/AssistantPanel.jsx`)** —
   - Rule-based query engine over the verified dataset, with **multi-turn eligibility screening** (land ownership → exclusions) and Yes/No quick replies.
   - Question routing that separates chit-chat, follow-up questions, scheme questions, and off-topic input.
   - Optional **Gemini** answers via `POST /api/chat`, grounded on data supplied by the server; when Gemini is unavailable the client falls back to rule-based responses.
   - Voice input (browser Web Speech API) and Markdown-rendered replies.
4. **Interactive scheme directory (`src/components/SchemeSearch.jsx`)** — search by name, keywords, documents, or amounts; category filtering; scheme cards with Benefits, Eligibility, Documents, and Steps tabs plus verified official portal links.
5. **Grievance guidance (`src/components/GrievancePanel.jsx`)** — Farmer Helpline 1800-180-1551 and links to CPGRAMS, PM-KISAN and PMFBY grievance pages (informational guide only, not an official filing portal).
6. **Separation of concerns** — UI (`src/components/`), data (`src/data/`), translations (`src/translations/`), query logic (`src/services/`), and backend (`server/`) are decoupled.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, plain CSS design system |
| Backend | Express 5 (Node), CORS, rate limiting |
| AI | Google Gemini via `@google/generative-ai` (server-side only) |
| Database | Supabase (`@supabase/supabase-js`), local sample fallback |
| Tests / Lint | Node built-in test runner (`node --test`), oxlint |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js v18 or higher** (v20+ recommended)
- **npm v9 or higher**
- A **Supabase** project (optional — the app runs on the bundled sample dataset without it)
- A **Google Gemini API key** (optional — without it the assistant answers from the rule-based engine)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Two environment files exist and **are never committed** (see `.gitignore`):

| File | Used by | Variables |
|---|---|---|
| `.env.local` | Vite (frontend) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `.env.server` | Express server | `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

Copy the template and fill in real values locally:

```bash
cp .env.server.example .env.server
```

`.env.server.example` contains **placeholders only** — it is safe to commit.

> **Security:** never put `GEMINI_API_KEY` or a Supabase **service-role** key in a `VITE_` variable — anything prefixed with `VITE_` is embedded into the browser bundle. The frontend uses only the publishable (anon) key.

### 3. Configure Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in the Supabase SQL editor, in order:
   - [`supabase/seed_schemes.sql`](supabase/seed_schemes.sql) — creates/populates `public.schemes`
   - [`supabase/allow_public_read.sql`](supabase/allow_public_read.sql) — read access for the anon/publishable key
   - [`supabase/verify_schemes.sql`](supabase/verify_schemes.sql) — sanity checks
3. Put the project URL and **publishable (anon)** key into `.env.local` and `.env.server`.
4. Optional: import/refresh records from the local JSON with
   ```bash
   node scripts/importSchemes.mjs            # dry run (default)
   node scripts/importSchemes.mjs --execute  # writes to Supabase
   ```
   Writing requires `SUPABASE_SERVICE_ROLE_KEY` in your shell environment; the script never prints secrets.

Without Supabase, the app automatically falls back to the local verified dataset in `src/data/schemes.js` and shows a "sample data" notice.

### 4. Configure Gemini (optional)

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Put it in `.env.server` as `GEMINI_API_KEY`.
3. Optionally set `GEMINI_MODEL` (default: `gemini-3.5-flash-lite`).

The key is read **server-side only**. Without it, `/api/chat` returns `503` and the frontend answers from the rule-based engine — the app still works.

### 5. Run the app

```bash
# Frontend + backend together (recommended)
npm run dev:all

# Or separately, in two terminals:
npm run dev      # Vite dev server → http://localhost:5173
npm run server   # Express API     → http://localhost:3001
```

Vite proxies `/api/*` to `http://localhost:3001`, so the browser never needs to know the API port.

```bash
# Production build & preview
npm run build
npm run preview
```

---

## ✅ Tests & Lint

```bash
npm test   # node --test — 47 unit tests in tests/
npm run lint  # oxlint
```

| Test file | Covers |
|---|---|
| `tests/intent.test.js` | Greetings, thanks, identity, off-topic text and follow-up detection |
| `tests/routing.test.js` | End-to-end `queryAssistant` routing, language, fallback paths |
| `tests/schemeMatching.test.js` | Evidence-gated scheme resolution (incl. Telugu/transliteration) |
| `tests/eligibilityIntent.test.js` | Multi-turn eligibility answer classification |

Tests need **no network, no Supabase, and no Gemini key**. They pass on a fresh clone after `npm install`.

---

## 📁 Project Structure

```
innova-sphere/
├── index.html                    # HTML entry (Noto Sans Telugu + Plus Jakarta Sans)
├── package.json                  # Scripts & dependencies
├── vite.config.js                # Vite config + /api → :3001 dev proxy
├── .env.server.example           # Placeholder env template (safe to commit)
├── server/                       # Express API
│   ├── index.js                  # App bootstrap, CORS, rate limit, /api/health
│   ├── loadEnv.js                # Loads .env.server before anything else
│   ├── routes/chat.js            # POST /api/chat (Gemini + scheme keyword grounding)
│   ├── lib/gemini.js             # Grounded Gemini wrapper (server-side key)
│   ├── lib/supabaseAdmin.js      # Server-side Supabase client
│   └── middleware/rateLimit.js   # 20 req/min per IP
├── src/
│   ├── main.jsx                  # React root mount
│   ├── App.jsx                   # Shell: nav, panels, language, DB health
│   ├── index.css                 # Design system, animations, responsive CSS
│   ├── assets/                   # Images & logos
│   ├── data/
│   │   ├── schemes.js            # Verified sample scheme entries + metadata
│   │   ├── schemesTelugu.js      # Telugu name mapping
│   │   └── schemes-import.json   # Import payload for scripts/importSchemes.mjs
│   ├── lib/supabase.js           # Browser Supabase client (publishable key only)
│   ├── services/
│   │   ├── searchService.js      # Query engine: routing, matching, eligibility flow
│   │   └── intent.js             # Conversational intent classification (pure)
│   ├── hooks/useSpeechRecognition.js  # Web Speech API voice input
│   ├── translations/i18n.js      # English & Telugu dictionary
│   └── components/               # Header, Sidebar, AssistantPanel, SchemeSearch,
│                                 # SchemeCard, GrievancePanel, RightSidebar,
│                                 # MarkdownRenderer, MicButton, banners, Footer, …
├── tests/                        # node --test unit tests
├── supabase/                     # SQL: seed, public read, verification
├── scripts/                      # Scheme import & repo validation utilities
└── public/                       # Static assets
```

---

## 🛡️ Architecture Notes

- **Data sources:** the app prefers live Supabase records and degrades gracefully to the bundled verified sample dataset; the source in use is always shown in the UI (`DataSourceBanner`).
- **AI:** Gemini only answers from data supplied by the server — it never invents scheme details, amounts, dates, or portal URLs, and it is not required for the app to work.
- **No fake integrations:** no simulated logins, fake payment gateways, or pseudo application submission forms. Grievance content is informational and links to official portals.
- **Secrets:** real credentials live only in `.env.local` and `.env.server` (both gitignored). Never commit them, and never place a server key in a `VITE_` variable.