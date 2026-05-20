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

function readCsvRows(csvPath) {
  return JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        [
          "import csv, json, sys",
          "with open(sys.argv[1], newline='', encoding='utf-8-sig') as f:",
          "    print(json.dumps(list(csv.reader(f))))",
        ].join("\n"),
        csvPath,
      ],
      { encoding: "utf8" },
    ),
  );
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

function splitTags(value) {
  return [...new Set((value || "")
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean))];
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getHeaderIndex(header, name) {
  return header.findIndex((column) => column === name);
}

function getCell(row, index) {
  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function normalizeForMatch(value) {
  return value.trim().toLowerCase();
}

function playBelongsToTeam(play, teamSeasonId) {
  return (
    play.team_season_id === teamSeasonId ||
    (Array.isArray(play.team_season_ids) && play.team_season_ids.includes(teamSeasonId))
  );
}

function findExistingPlay(existingPlays, payload) {
  const matchingNameRows = existingPlays.filter(
    (play) =>
      play.play_side === payload.play_side &&
      normalizeForMatch(play.play_name) === normalizeForMatch(payload.play_name) &&
      play.play_scope === payload.play_scope &&
      playBelongsToTeam(play, payload.team_season_id),
  );

  if (payload.embed_code) {
    return (
      matchingNameRows.find((play) => play.embed_code === payload.embed_code) ??
      matchingNameRows.find((play) => !play.embed_code)
    );
  }

  return matchingNameRows.find((play) => !play.embed_code) ?? matchingNameRows[0];
}

function buildPayloadFromCsv(csvPath, playSide, teamSeasonId) {
  const [header, ...rows] = readCsvRows(csvPath);
  const titleIndex = getHeaderIndex(header, "Title");
  const contentIndex = getHeaderIndex(header, "Content");
  const imageIndex = getHeaderIndex(header, "Image URL");
  const playTypeIndex = getHeaderIndex(header, "Play Type");
  const statusIndex = getHeaderIndex(header, "Status");
  const primaryEmbedIndex = getHeaderIndex(
    header,
    playSide === "offense" ? "Offensive Play Embed" : "Defensive Play Embed",
  );
  const opposingEmbedIndex = getHeaderIndex(
    header,
    playSide === "offense" ? "Opposing Offensive Play Embed" : "Opposing Defensive Play Embed",
  );

  return rows
    .map((row) => {
      const title = getCell(row, titleIndex);
      const playFamily = getCell(row, playTypeIndex);
      const primaryEmbed = getCell(row, primaryEmbedIndex);
      const opposingEmbed = getCell(row, opposingEmbedIndex);

      return {
        team_season_id: teamSeasonId,
        team_season_ids: [teamSeasonId],
        play_scope: "team",
        play_name: title || "Untitled Play",
        play_family: playFamily || null,
        play_side: playSide,
        tags: splitTags(playFamily),
        notes: htmlToPlainText(getCell(row, contentIndex)) || null,
        image_url: getCell(row, imageIndex) || null,
        embed_code: primaryEmbed || opposingEmbed || null,
        is_active: getCell(row, statusIndex) !== "trash",
      };
    })
    .filter((row) => row.play_name !== "Untitled Play");
}

async function main() {
  const teamSeasonId = getArgValue("--team-season-id");
  const offenseCsvPath = getArgValue("--offense");
  const defenseCsvPath = getArgValue("--defense");

  if (!teamSeasonId || !offenseCsvPath || !defenseCsvPath) {
    throw new Error(
      "Usage: node scripts/import-plays-from-wp-export.mjs --team-season-id <id> --offense /path/off.csv --defense /path/def.csv",
    );
  }

  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const payload = [
    ...buildPayloadFromCsv(offenseCsvPath, "offense", teamSeasonId),
    ...buildPayloadFromCsv(defenseCsvPath, "defense", teamSeasonId),
  ];

  const { data: existingPlays, error: existingError } = await supabase
    .from("play_libraries")
    .select("id, team_season_id, team_season_ids, play_scope, play_name, play_side, embed_code");

  if (existingError) {
    throw existingError;
  }

  let inserted = 0;
  let updated = 0;
  const localExisting = [...(existingPlays ?? [])];

  for (const row of payload) {
    const existingPlay = findExistingPlay(localExisting, row);

    if (existingPlay) {
      const { error } = await supabase
        .from("play_libraries")
        .update({
          ...row,
          play_family: row.play_family ?? undefined,
        })
        .eq("id", existingPlay.id);

      if (error) {
        throw error;
      }

      Object.assign(existingPlay, row);
      updated += 1;
      continue;
    }

    const { data, error } = await supabase
      .from("play_libraries")
      .insert(row)
      .select("id, team_season_id, team_season_ids, play_scope, play_name, play_side, embed_code")
      .single();

    if (error) {
      throw error;
    }

    localExisting.push(data);
    inserted += 1;
  }

  console.log(`Imported ${payload.length} plays. Inserted ${inserted}, updated ${updated}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
