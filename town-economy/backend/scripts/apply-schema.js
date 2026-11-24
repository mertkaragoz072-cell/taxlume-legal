#!/usr/bin/env node
// Applies backend/supabase/schema.sql to the Supabase project through the
// management API, so nobody has to paste it into the SQL editor.
//
//   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_ACCESS_TOKEN=sbp_... node backend/scripts/apply-schema.js
//
// The token needs Database read-write on that one project (create it under
// Account -> Access Tokens). In a Claude cloud session whose environment has
// an `api.supabase.com` network secret, leave SUPABASE_ACCESS_TOKEN unset: the
// proxy adds the credential. The schema is idempotent, so re-running is safe.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const ref = process.env.SUPABASE_PROJECT_REF || (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!ref) {
  console.error("Set EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_PROJECT_REF) to the project to update.");
  process.exit(2);
}
const query = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
const args = [
  "-sS",
  "-m",
  "120",
  "-X",
  "POST",
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  "-H",
  "Content-Type: application/json",
  "-w",
  "\n%{http_code}",
  "-d",
  JSON.stringify({ query }),
];
if (process.env.SUPABASE_ACCESS_TOKEN)
  args.push("-H", `Authorization: Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`);

const out = execFileSync("curl", args).toString();
const code = Number(out.slice(out.lastIndexOf("\n") + 1));
const body = out.slice(0, out.lastIndexOf("\n"));
if (code >= 200 && code < 300) {
  console.log(`Schema applied to project ${ref}.`);
} else {
  console.error(`Failed (HTTP ${code}): ${body.slice(0, 500)}`);
  process.exit(1);
}
