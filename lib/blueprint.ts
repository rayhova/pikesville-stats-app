export const appPrinciples = [
  "Tablet-first scorer workflow with app-like installability",
  "One event stream as the source of truth for stats and edits",
  "Realtime sync across authenticated devices",
  "Offline-safe input queue for unreliable gym Wi-Fi",
  "Season aggregates derived from normalized game data",
];

export const appPhases = [
  "Scoring shell: auth, teams, roster, live game header, active lineups",
  "Event engine: shots, subs, rebounds, assists, steals, fouls, turnovers, blocks, timeouts",
  "Derived stats: player box score, team stats, plus-minus, lineup metrics, quarter filters",
  "Reporting layer: play efficiency, defensive effectiveness, shot charts, season views",
  "Polish: PWA install, offline sync, permissions, audit trail, export workflows",
];
