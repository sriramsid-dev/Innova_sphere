/**
 * Load .env.server from the project root BEFORE any other server module
 * reads process.env. This file must be imported first in server/index.js.
 *
 * ESM imports execute in source order, so placing `import "./loadEnv.js"`
 * above all other imports guarantees env vars are available when
 * gemini.js and supabaseAdmin.js run their top-level initialisers.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.server");

dotenv.config({ path: envPath });
