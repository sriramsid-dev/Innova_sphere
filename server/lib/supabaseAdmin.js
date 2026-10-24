/**
 * Innova Sphere — Server-side Supabase client
 *
 * Uses the anon key (same RLS restrictions as the browser client).
 * The existing RLS policy allows SELECT on verification_status = 'verified',
 * so no service key is required for scheme lookups.
 *
 * Environment variables (read from .env.server, never .env.local):
 *   SUPABASE_URL       — project URL
 *   SUPABASE_ANON_KEY  — publishable anon key
 */

import "../loadEnv.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabaseAdmin] SUPABASE_URL or SUPABASE_ANON_KEY not set in server env. " +
      "Scheme fetching will be skipped; Gemini will receive no grounding data."
  );
}

export const supabaseAdmin =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Verified existing columns in public.schemes
const EXISTING_COLUMNS = [
  "id",
  "name",
  "name_te",
  "slug",
  "category",
  "summary",
  "benefits",
  "eligibility",
  "required_documents",
  "application_steps",
  "official_url",
  "source_url",
  "last_verified_at",
  "created_at",
  "updated_at",
  "verification_status",
].join(", ");

/**
 * Fetch verified scheme rows from Supabase by slug array.
 * Returns an array of raw row objects (≤ slugs.length items).
 * Returns [] if Supabase is not configured or the query fails.
 *
 * @param {string[]} slugs — e.g. ['pm-kisan', 'pmfby']
 * @returns {Promise<object[]>}
 */
export async function fetchSchemesBySlug(slugs) {
  if (!supabaseAdmin || !slugs || slugs.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("schemes")
    .select(EXISTING_COLUMNS)
    .in("slug", slugs)
    .eq("verification_status", "verified");

  if (error) {
    console.error("[supabaseAdmin] fetchSchemesBySlug error:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Fetch all verified schemes — used for broad/unmatched queries.
 * Returns up to 10 rows to keep Gemini prompt size reasonable.
 *
 * @returns {Promise<object[]>}
 */
export async function fetchAllVerifiedSchemes() {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("schemes")
    .select(EXISTING_COLUMNS)
    .eq("verification_status", "verified")
    .limit(10);

  if (error) {
    console.error("[supabaseAdmin] fetchAllVerifiedSchemes error:", error.message);
    return [];
  }

  return data || [];
}

