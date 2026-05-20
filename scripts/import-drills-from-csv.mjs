import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const entries = raw
    .split(/\r?\n/)
    .map((line) => line.match(/^([^#=]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1].trim(), match[2].trim()]);

  return Object.fromEntries(entries);
}

function htmlToPlainText(value) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/?(ul|ol)>/gi, "\n")
    .replace(/<\/?(strong|em|b|i)>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toTags(drillType, playType) {
  return [...new Set([drillType, playType]
    .flatMap((value) => (value || "").split("|"))
    .map((value) => value.trim())
    .filter(Boolean))];
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    throw new Error("Usage: node scripts/import-drills-from-csv.mjs /absolute/path/to/export.csv");
  }

  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const rows = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        [
          "import csv, json, sys",
          "with open(sys.argv[1], newline='', encoding='utf-8-sig') as f:",
          "    print(json.dumps(list(csv.DictReader(f))))",
        ].join("\n"),
        csvPath,
      ],
      { encoding: "utf8" },
    ),
  );

  const payload = rows.map((row) => ({
    legacy_id: row.ID?.trim() || null,
    title: row.Title?.trim() || "Untitled Drill",
    drill_type: row["Drill Type"]?.trim() || null,
    play_type: row["Play Type"]?.trim() || null,
    tags: toTags(row["Drill Type"], row["Play Type"]),
    description: htmlToPlainText(row["Drill Description"]),
    instructions: htmlToPlainText(row["Drill Instructions"]),
    notes: htmlToPlainText(row.Content),
    video_url: row["Youtube Video"]?.trim() || null,
    image_url: row.Images?.trim() || null,
    is_active: true,
  }));

  const { error } = await supabase
    .from("drill_libraries")
    .upsert(payload, { onConflict: "legacy_id" });

  if (error) {
    throw error;
  }

  console.log(`Imported ${payload.length} drills.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
