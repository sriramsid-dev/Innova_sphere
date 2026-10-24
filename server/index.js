/**
 * Innova Sphere — Express API Server
 *
 * Runs on PORT (default 3001). Vite proxies /api/* to this server
 * during development so the browser never needs to know this port.
 *
 * Security:
 *   - GEMINI_API_KEY read from .env.server only (never VITE_ vars)
 *   - CORS restricted to localhost Vite dev origins
 *   - Rate limited to 20 req/min per IP
 *   - Request body size capped at 8 kb
 */

// Load environment variables from .env.server before any other imports
import "./loadEnv.js";
// Remove the default dotenv import that loads .env
// import "dotenv/config"; // <-- removed

import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow localhost origins used by Vite dev server
const ALLOWED_ORIGIN_REGEX = /^http:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-origin) during dev
      if (!origin || ALLOWED_ORIGIN_REGEX.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "8kb" }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimitMiddleware);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    gemini: !!process.env.GEMINI_API_KEY,
    supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/chat", chatRouter);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[server] Unhandled error:", err.message || err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  console.log(`\n🌿 Innova Sphere API server running on http://localhost:${PORT}`);
  console.log(`   Gemini:   ${process.env.GEMINI_API_KEY ? `✅ configured (${modelName})` : "❌ GEMINI_API_KEY not set"}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? "✅ configured" : "❌ SUPABASE_URL not set"}\n`);
});
