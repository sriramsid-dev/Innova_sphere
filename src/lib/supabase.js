/**
 * Innova Sphere — Supabase Client
 *
 * Reads connection details exclusively from Vite environment variables so that
 * no credentials are ever hard-coded or bundled into source control.
 *
 * Required variables (set in .env.local, never committed):
 *   VITE_SUPABASE_URL              – your project URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  – the anon/public key (safe for browsers)
 *
 * Security notes:
 *   • Only the anon (publishable) key is used here; the service-role secret key
 *     must never appear in frontend code.
 *   • Row Level Security (RLS) on public.schemes is respected as-is; this
 *     client does not disable or bypass it.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_SUPABASE_URL) ||
  "";

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  "";

/**
 * True when both env vars are present and non-empty.
 * Components and services read this flag to decide between live data
 * and the local sample dataset — never silently mixing the two.
 */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

/**
 * The Supabase client instance.
 * Export is `null` when the project is not configured so that call sites
 * can guard against accidental use rather than hitting a runtime crash.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // No session persistence needed for a public-facing info tool.
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// ── Developer guidance ─────────────────────────────────────────────────────
if (!isSupabaseConfigured) {
  const missing = [
    !supabaseUrl && "VITE_SUPABASE_URL",
    !supabaseAnonKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  console.warn(
    "[Innova Sphere] Supabase is not configured.\n" +
      `Missing environment variable(s): ${missing.join(", ")}\n` +
      "Add them to .env.local to enable live data from the database.\n" +
      "The app will continue using the local verified sample dataset."
  );
}
