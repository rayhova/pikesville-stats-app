import type { SeasonRecord } from "@/lib/admin-domain";
import type { TeamSeasonRow } from "@/lib/admin-repository";

export function formatTeamSeasonOptionLabel(teamSeason: Pick<TeamSeasonRow, "season" | "name" | "label">) {
  return `${teamSeason.season} · ${teamSeason.name} · ${teamSeason.label}`;
}

export function isVarsityTeamSeason(teamSeason: Pick<TeamSeasonRow, "name" | "label">) {
  const label = teamSeason.label.toLowerCase();
  const name = teamSeason.name.toLowerCase();

  if (label.includes("jv") || name.includes("jv")) {
    return false;
  }

  return label.includes("varsity") || name.includes("varsity") || label.trim().length === 0;
}

export function pickDefaultPikesvilleVarsityTeamSeason(
  teamSeasonRows: TeamSeasonRow[],
  seasons: SeasonRecord[] = [],
) {
  const activeSeason = seasons.find((season) => season.status === "active") ?? null;
  const seasonStartRanks = new Map(
    seasons.map((season) => [
      season.name,
      season.startDate ? new Date(`${season.startDate}T00:00:00`).getTime() : 0,
    ]),
  );
  const scoredRows = teamSeasonRows
    .filter((teamSeason) => teamSeason.type === "ours")
    .map((teamSeason) => {
      let score = 0;
      const teamName = teamSeason.name.toLowerCase();

      if (activeSeason && (teamSeason.season === activeSeason.name || teamSeason.season === activeSeason.schoolYear)) {
        score += 1000;
      }
      if (isVarsityTeamSeason(teamSeason)) {
        score += 200;
      }
      if (teamName.includes("pikesville")) {
        score += 50;
      }
      if (teamSeason.label.toLowerCase().includes("jv") || teamName.includes("jv")) {
        score -= 500;
      }
      score += Math.floor((seasonStartRanks.get(teamSeason.season) ?? 0) / 1000000000);

      return { teamSeason, score };
    })
    .sort((left, right) => right.score - left.score || left.teamSeason.label.localeCompare(right.teamSeason.label));

  return scoredRows[0]?.teamSeason ?? teamSeasonRows.find((teamSeason) => teamSeason.type === "ours") ?? teamSeasonRows[0] ?? null;
}
