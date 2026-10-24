/**
 * Innova Sphere — Idempotent Scheme Data Import & Validation Script
 *
 * Usage:
 *   node scripts/importSchemes.mjs --dry-run   (Dry run validation - default, no DB writes)
 *   node scripts/importSchemes.mjs --execute   (Executes idempotent upsert into Supabase)
 *
 * Rules:
 *   • Never prints secrets or publishable keys
 *   • Validates all fields against the actual columns of public.schemes
 *   • Checks for duplicate slugs
 *   • Idempotent: uses existing slug matching to prevent duplicate records
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Read environment variables safely from .env.local
const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: .env.local file not found.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : "";
const anonKey = keyMatch ? keyMatch[1].trim() : "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing in .env.local");
  process.exit(1);
}

const isExecuteMode = process.argv.includes("--execute");
const isDryRun = !isExecuteMode || process.argv.includes("--dry-run");

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Load scheme import dataset
const dataPath = path.resolve("src/data/schemes-import.json");
if (!fs.existsSync(dataPath)) {
  console.error(`❌ Error: Data file not found at ${dataPath}`);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Actual verified database columns of public.schemes
const DB_COLUMNS = [
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
];

async function run() {
  console.log("================================================================================");
  console.log("Innova Sphere — Scheme Import Workflow");
  console.log(`Mode: ${isDryRun ? "🔍 DRY-RUN VALIDATION (No live database changes will be made)" : "🚀 EXECUTE (Writing to Supabase)"}`);
  console.log("================================================================================\n");

  // Step 1: Validate database reachability and inspect schema
  console.log("1. Verifying Supabase connection and public.schemes table...");
  const { data: existingRows, error: pingError } = await supabase
    .from("schemes")
    .select("id, slug")
    .limit(100);

  if (pingError) {
    console.error(`❌ Database connection failed: ${pingError.message}`);
    process.exit(1);
  }

  const existingSlugMap = new Map();
  (existingRows || []).forEach((row) => {
    if (row.slug) existingSlugMap.set(row.slug, row.id);
  });

  console.log(`   Connected successfully. Existing records in public.schemes: ${existingSlugMap.size}\n`);

  // Step 2: Validate records in JSON file
  console.log("2. Validating scheme dataset records...");
  const readyRecords = [];
  const needsReviewRecords = [];
  const validationErrors = [];

  const seenSlugs = new Set();

  rawData.forEach((item, index) => {
    const itemNum = index + 1;
    const errors = [];

    // Required fields check
    if (!item.slug || typeof item.slug !== "string") errors.push("Missing or invalid 'slug'");
    if (!item.name || typeof item.name !== "string") errors.push("Missing or invalid 'name'");
    if (!item.name_te || typeof item.name_te !== "string") errors.push("Missing or invalid 'name_te'");
    if (!item.category || typeof item.category !== "string") errors.push("Missing or invalid 'category'");
    if (!item.summary || typeof item.summary !== "string") errors.push("Missing or invalid 'summary'");

    // Array / JSONB fields check
    ["benefits", "eligibility", "required_documents", "application_steps"].forEach((field) => {
      if (!Array.isArray(item[field])) {
        errors.push(`Field '${field}' must be an array of strings`);
      } else if (item[field].length === 0) {
        errors.push(`Field '${field}' cannot be empty`);
      }
    });

    // URLs check
    if (!item.official_url || !item.official_url.startsWith("http")) {
      errors.push("Missing or invalid 'official_url'");
    }
    if (!item.source_url || !item.source_url.startsWith("http")) {
      errors.push("Missing or invalid 'source_url'");
    }

    // Verification date check
    if (!item.last_verified_at || isNaN(Date.parse(item.last_verified_at))) {
      errors.push("Missing or invalid ISO date in 'last_verified_at'");
    }

    // Duplicate slug check within import file
    if (seenSlugs.has(item.slug)) {
      errors.push(`Duplicate slug '${item.slug}' found in import file`);
    } else {
      seenSlugs.add(item.slug);
    }

    if (errors.length > 0) {
      validationErrors.push({ itemNum, slug: item.slug || "unknown", errors });
    } else if (item.review_status === "needs_review") {
      needsReviewRecords.push(item);
    } else {
      readyRecords.push(item);
    }
  });

  console.log(`   Total records analyzed: ${rawData.length}`);
  console.log(`   - Verified & Ready for import: ${readyRecords.length}`);
  console.log(`   - Marked 'needs_review': ${needsReviewRecords.length}`);
  console.log(`   - Validation errors: ${validationErrors.length}\n`);

  if (validationErrors.length > 0) {
    console.error("❌ Schema Validation Errors Detected:");
    validationErrors.forEach((v) => {
      console.error(`   Record #${v.itemNum} [${v.slug}]:`);
      v.errors.forEach((e) => console.error(`     - ${e}`));
    });
    process.exit(1);
  }

  // Step 3: Report breakdown of records
  console.log("3. Detailed Scheme Breakdown:");
  console.log("--------------------------------------------------------------------------------");
  rawData.forEach((item, i) => {
    const isNew = !existingSlugMap.has(item.slug);
    const actionDesc = isNew ? "INSERT (new row)" : `UPDATE (existing id ${existingSlugMap.get(item.slug)})`;
    const statusTag = item.review_status === "needs_review" ? "⚠️ NEEDS REVIEW" : "✅ VERIFIED & READY";

    console.log(`[${i + 1}] ${item.name} (${item.slug})`);
    console.log(`    Status:            ${statusTag}`);
    console.log(`    Database Action:   ${actionDesc}`);
    console.log(`    Category:          ${item.category}`);
    console.log(`    Official Portal:   ${item.official_url}`);
    console.log(`    Source/Guideline:  ${item.source_url}`);
    console.log(`    Verified Date:     ${item.last_verified_at}`);
    if (item.review_notes) {
      console.log(`    Review Notes:      ${item.review_notes}`);
    }
    console.log("");
  });

  const targetRecords = rawData.filter((item) => item.review_status === "ready");
  const skippedRecords = rawData.filter((item) => item.review_status !== "ready");

  console.log(`Targeting ${targetRecords.length} verified schemes for import:`);
  targetRecords.forEach((r) => console.log(`   • ${r.name} (${r.slug})`));
  if (skippedRecords.length > 0) {
    console.log(`Skipping ${skippedRecords.length} unverified / needs_review schemes:`);
    skippedRecords.forEach((r) => console.log(`   • ${r.name} (${r.slug}) [${r.review_status}]`));
  }
  console.log("");

  // Step 4: Execution or Dry-run conclusion
  if (isDryRun) {
    console.log("--------------------------------------------------------------------------------");
    console.log("DRY-RUN VALIDATION COMPLETE — 0 RECORDS WERE WRITTEN TO THE DATABASE.");
    console.log(`Validated ${targetRecords.length} ready records for live import.`);
    console.log(`${skippedRecords.length} record(s) correctly retained as needs_review (will not be imported).`);
    console.log("--------------------------------------------------------------------------------\n");
    return;
  }

  // Step 5: Execute mode (only when user explicitly runs with --execute)
  console.log("4. Executing Idempotent Database Import for Verified Records...");
  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of targetRecords) {
    // Build payload containing ONLY verified database columns
    const payload = {};
    DB_COLUMNS.forEach((col) => {
      if (item[col] !== undefined) {
        payload[col] = item[col];
      }
    });

    const existingId = existingSlugMap.get(item.slug);
    if (existingId) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("schemes")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId);

      if (updateError) {
        console.error(`❌ Failed to update ${item.slug}: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated: ${item.slug} (id: ${existingId})`);
        updatedCount++;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from("schemes")
        .insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);

      if (insertError) {
        console.error(`❌ Failed to insert ${item.slug}: ${insertError.message}`);
        if (insertError.message.includes("row-level security")) {
          console.error("\n   ⚠️ Row Level Security (RLS) Explanation:");
          console.error("   The publishable/anon key only has SELECT permissions on public.schemes.");
          console.error("   To insert the records into Supabase, choose one of these options:");
          console.error("     1) Run the SQL script 'supabase/seed_schemes.sql' in your Supabase Dashboard SQL Editor (recommended), or");
          console.error("     2) Pass SUPABASE_SERVICE_ROLE_KEY=\"...\" as an environment variable to this script, or");
          console.error("     3) Add an INSERT policy for the 'anon' role in your Supabase SQL editor.\n");
        }
      } else {
        console.log(`   ✅ Inserted: ${item.slug}`);
        insertedCount++;
      }
    }
  }

  console.log("\n================================================================================");
  console.log(`IMPORT EXECUTION FINISHED: ${insertedCount} inserted, ${updatedCount} updated.`);
  console.log("================================================================================\n");

  // Step 6: Post-import Database Verification
  console.log("5. Verifying Database Retrieval...");
  const { data: finalRows, count: finalCount, error: verifyError } = await supabase
    .from("schemes")
    .select("id, slug, name, category, official_url, last_verified_at", { count: "exact" });

  if (verifyError) {
    console.error(`❌ Verification query failed: ${verifyError.message}`);
  } else {
    console.log(`   Total records in public.schemes: ${finalCount}`);
    (finalRows || []).forEach((row, idx) => {
      console.log(`   [${idx + 1}] ID: ${row.id} | Slug: ${row.slug} | Name: ${row.name}`);
      console.log(`       Category: ${row.category} | Verified: ${row.last_verified_at}`);
      console.log(`       Official URL: ${row.official_url}`);
    });
  }
}

run().catch((err) => {
  console.error("Unhandled error during import workflow:", err);
  process.exit(1);
});
