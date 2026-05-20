import type {
  CoachProfileRecord,
  CoachResponsibilityTemplateRecord,
  DrillLibraryRecord,
  EventAttendanceRecord,
  ManagerProfileRecord,
  ProgramAssignmentRecord,
  ProgramAssignmentCompletionRecord,
  ProgramAssignmentProofRecord,
  PracticePlanRecord,
  PlayerDevelopmentPlanRecord,
  PlayerEvaluationRecord,
  PlayerRecord,
  ProgramRecord,
  RosterMembershipRecord,
  SeasonRecord,
  TeamSeasonRecord,
  WeekGoalRecord,
} from "@/lib/admin-domain";

export const seasons: SeasonRecord[] = [
  {
    id: "2025-26",
    name: "2025-26 Varsity Season",
    schoolYear: "2025-2026",
    status: "active",
    startDate: "2025-11-01",
    endDate: "2026-03-20",
  },
  {
    id: "2024-25",
    name: "2024-25 Varsity Season",
    schoolYear: "2024-2025",
    status: "complete",
    startDate: "2024-11-01",
    endDate: "2025-03-21",
  },
];

export const programs: ProgramRecord[] = [
  {
    id: "pikesville",
    name: "Pikesville",
    shortName: "Pikesville",
    isPikesville: true,
  },
  {
    id: "dulaney",
    name: "Dulaney",
    shortName: "Dulaney",
    isPikesville: false,
  },
  {
    id: "liberty",
    name: "Liberty",
    shortName: "Liberty",
    isPikesville: false,
  },
];

export const teamSeasons: TeamSeasonRecord[] = [
  {
    id: "pikesville-2025-26-varsity",
    programId: "pikesville",
    seasonId: "2025-26",
    label: "Varsity",
    teamType: "ours",
    level: "varsity",
    scoutingSummary: "Pressure the rim, spread teams out, and keep pace high.",
    offense: "Flow into Horns, Zoom, and quick drag actions. Punish tags with spray-outs.",
    defense: "Switch selectively one through four and keep the ball out of the middle.",
    press: "Run make-or-dead pressure to eat clock and force sideline entries.",
    teamTendencies: "Best when pace stays high and paint touches happen early in possessions.",
    scoutingVideos: [
      "<iframe src=\"https://example.com/pikesville-offense\"></iframe>",
    ],
    keysToWinning: "Win paint touches, own defensive rebounding, keep turnovers low.",
    actionsToWatch: "Horns, Zoom, stack BLOB package.",
  },
  {
    id: "pikesville-2024-25-varsity",
    programId: "pikesville",
    seasonId: "2024-25",
    label: "Varsity",
    teamType: "ours",
    level: "varsity",
    scoutingSummary: "Last season's team identity for continuity example only.",
  },
  {
    id: "dulaney-2025-26-varsity",
    programId: "dulaney",
    seasonId: "2025-26",
    label: "Varsity",
    teamType: "opponent",
    level: "varsity",
    scoutingSummary: "Physical half-court team that will sit in zone after makes.",
    offense: "Heavy Pistol and middle pick-and-roll. Looks for paint collapse before kick-outs.",
    defense: "Primary 2-3 zone with late-clock matchup principles.",
    press: "Occasional three-quarter pressure after free throws.",
    teamTendencies: "Will slow tempo after makes and hide weaker defenders in the zone.",
    scoutingVideos: [
      "<iframe src=\"https://example.com/dulaney-zone\"></iframe>",
      "<iframe src=\"https://example.com/dulaney-pistol\"></iframe>",
    ],
    keysToWinning: "Attack gaps early and punish late closeouts.",
    actionsToWatch: "2-3 zone, horns elbow touch, pistol action.",
  },
  {
    id: "liberty-2025-26-varsity",
    programId: "liberty",
    seasonId: "2025-26",
    label: "Varsity",
    teamType: "opponent",
    level: "varsity",
    scoutingSummary: "Likes to play through primary guard in late clock.",
    offense: "Spread ball-screen team with late-clock isolation bailout.",
    defense: "Mixes man and 1-3-1 to change pace.",
    press: "Token pressure, usually to burn five seconds.",
    teamTendencies: "Guard-dominant team that gets stagnant if first action is taken away.",
    scoutingVideos: [],
    keysToWinning: "Shrink the floor, finish possessions, limit live-ball turnovers.",
    actionsToWatch: "Middle ball screen, 1-3-1 pressure.",
  },
];

export const players: PlayerRecord[] = [
  {
    id: "kylan-artis",
    firstName: "Kylan",
    lastName: "Artis",
    dominantHand: "right",
    photoUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=500&q=80",
    graduatingClass: "2027",
    birthdate: "",
  },
  {
    id: "jonah-matz",
    firstName: "Jonah",
    lastName: "Matz",
    dominantHand: "right",
    graduatingClass: "2026",
    birthdate: "",
  },
  {
    id: "chase-huber",
    firstName: "Chase",
    lastName: "Huber",
    dominantHand: "right",
  },
  {
    id: "kelan-dennis",
    firstName: "Kelan",
    lastName: "Dennis",
    dominantHand: "right",
  },
];

export const playerEvaluations: PlayerEvaluationRecord[] = [
  {
    id: "eval-kylan-1",
    playerId: "kylan-artis",
    coachName: "Coach Gotha",
    evaluationDate: "2026-04-10",
    evaluation:
      "Strong spring pace and leadership. Needs cleaner late-clock reads versus loaded help.",
    createdAt: "2026-04-10T12:00:00.000Z",
  },
  {
    id: "eval-jonah-1",
    playerId: "jonah-matz",
    coachName: "Coach Gotha",
    evaluationDate: "2026-04-08",
    evaluation:
      "Shot prep has improved. Keep demanding rim pressure earlier in possessions.",
    createdAt: "2026-04-08T12:00:00.000Z",
  },
];

export const playerDevelopmentPlans: PlayerDevelopmentPlanRecord[] = [
  {
    id: "plan-kylan-short",
    playerId: "kylan-artis",
    horizon: "short_term",
    coachName: "Coach Gotha",
    planDate: "2026-04-12",
    targetDate: "2026-05-15",
    goalType: "tactical_or_team_goals",
    planBody:
      "Own first side pick-and-roll reads and deliver early weak-side skips without over-dribbling.",
    createdAt: "2026-04-12T12:00:00.000Z",
  },
  {
    id: "plan-kylan-long",
    playerId: "kylan-artis",
    horizon: "long_term",
    coachName: "Coach Gotha",
    planDate: "2026-04-12",
    targetDate: "2026-10-01",
    goalType: "physical_development",
    planBody:
      "Add lower-body strength and keep burst while improving ability to absorb contact at the rim.",
    createdAt: "2026-04-12T12:00:00.000Z",
  },
];

export const rosterMemberships: RosterMembershipRecord[] = [
  {
    id: "kylan-2025-26",
    playerId: "kylan-artis",
    teamSeasonId: "pikesville-2025-26-varsity",
    jerseyNumber: "#25",
    position: "G",
    height: "6'1\"",
    isActive: true,
    isStarter: true,
    tendencies: "Pushes tempo, confident spot-up shooter, attacks right hand.",
    strengths: "Transition pace, on-ball pressure.",
    weaknesses: "Can over-dribble against set traps.",
    matchupNotes: "Best used to pressure lead guards.",
  },
  {
    id: "jonah-2025-26",
    playerId: "jonah-matz",
    teamSeasonId: "pikesville-2025-26-varsity",
    jerseyNumber: "#11",
    position: "Wing",
    height: "6'4\"",
    isActive: true,
    isStarter: true,
    tendencies: "Finds space weak side, relocates well on kick-outs.",
    strengths: "Shooting gravity, length.",
    weaknesses: "Needs early touches to stay aggressive.",
    matchupNotes: "Can guard up a spot against bigger wings.",
  },
  {
    id: "kylan-2024-25",
    playerId: "kylan-artis",
    teamSeasonId: "pikesville-2024-25-varsity",
    jerseyNumber: "#25",
    position: "G",
    height: "6'0\"",
    isActive: true,
    isStarter: true,
    tendencies: "Returning lead guard identity from prior season.",
    strengths: "Experience and pace.",
    weaknesses: "Still learning late-clock reads.",
    matchupNotes: "Example of same player appearing in multiple seasons.",
  },
  {
    id: "chase-2025-26",
    playerId: "chase-huber",
    teamSeasonId: "dulaney-2025-26-varsity",
    jerseyNumber: "#1",
    position: "PG",
    height: "5'11\"",
    isActive: true,
    isStarter: true,
    closeoutType: "kyrie",
    speedType: "cheetah",
    defenderTypes: ["cone"],
    drivePreference: "right",
    trapPreference: "trap",
    playerNotes: "Primary creator. Load up on right hand and make him finish through length.",
    tendencies: "Lives in middle ball screen, favors pull-up right.",
    strengths: "Pace, shot creation.",
    weaknesses: "Loose with left-hand handle under pressure.",
    matchupNotes: "Send him left and crowd late-clock isolations.",
  },
  {
    id: "kelan-2025-26",
    playerId: "kelan-dennis",
    teamSeasonId: "dulaney-2025-26-varsity",
    jerseyNumber: "#3",
    position: "F",
    height: "6'5\"",
    isActive: true,
    isStarter: true,
    closeoutType: "ben",
    speedType: "elephant",
    defenderTypes: ["eraser"],
    drivePreference: "left",
    trapPreference: "do_not_trap",
    playerNotes: "Physical finisher. Bring help late, not early, and make him score over bodies.",
    tendencies: "Crash-and-finish forward, opportunistic corner cutter.",
    strengths: "Length, second jump.",
    weaknesses: "Limited decision-maker when put on the floor.",
    matchupNotes: "Tag early in transition and box on every shot.",
  },
];

export const teamSeasonRows = teamSeasons.map((teamSeason) => {
  const program = programs.find((item) => item.id === teamSeason.programId);
  const season = seasons.find((item) => item.id === teamSeason.seasonId);
  const relatedMemberships = rosterMemberships.filter(
    (membership) => membership.teamSeasonId === teamSeason.id && membership.isActive,
  );

  return {
    id: teamSeason.id,
    name: program?.name ?? teamSeason.id,
    shortName: program?.shortName ?? "",
    label: teamSeason.label,
    season: season?.name ?? season?.schoolYear ?? teamSeason.seasonId,
    type: teamSeason.teamType,
    activePlayers: relatedMemberships.length,
    lastGameDate:
      teamSeason.id === "pikesville-2025-26-varsity"
        ? "2026-02-18"
        : teamSeason.id === "dulaney-2025-26-varsity"
          ? "2026-01-30"
          : teamSeason.id === "liberty-2025-26-varsity"
            ? "2026-02-07"
            : "2025-03-01",
    scoutingSummary: teamSeason.scoutingSummary ?? "",
    offense: teamSeason.offense ?? "",
    defense: teamSeason.defense ?? "",
    press: teamSeason.press ?? "",
    teamTendencies: teamSeason.teamTendencies ?? "",
    scoutingVideos: teamSeason.scoutingVideos ?? [],
    keysToWinning: teamSeason.keysToWinning ?? "",
    actionsToWatch: teamSeason.actionsToWatch ?? "",
  };
});

export const playerRows = rosterMemberships.map((membership) => {
  const player = players.find((item) => item.id === membership.playerId);
  const teamSeason = teamSeasons.find((item) => item.id === membership.teamSeasonId);
  const program = programs.find((item) => item.id === teamSeason?.programId);
  const season = seasons.find((item) => item.id === teamSeason?.seasonId);

  return {
    id: membership.id,
    playerId: membership.playerId,
    teamSeasonId: membership.teamSeasonId,
    name: `${player?.firstName ?? ""} ${player?.lastName ?? ""}`.trim(),
    jersey: membership.jerseyNumber,
    position: membership.position,
    height: membership.height,
    team: program?.name ?? "",
    teamType: teamSeason?.teamType ?? "opponent",
    season: season?.name ?? season?.schoolYear ?? teamSeason?.seasonId ?? "",
    isStarter: membership.isStarter ?? false,
    tendencies: membership.tendencies ?? "",
    strengths: membership.strengths ?? "",
    weaknesses: membership.weaknesses ?? "",
    matchupNotes: membership.matchupNotes ?? "",
    active: membership.isActive,
  };
});

export const plays = [
  {
    id: "horns",
    name: "Horns",
    family: "Half Court",
    side: "offense",
    owner: "ours",
    team: "Pikesville Varsity",
    teamSeasonId: "pikesville-2025-26-varsity",
    tags: ["half court", "elbow action"],
    notes: "Primary early-clock organizer.",
    imageUrl: "",
    embedCode: "",
  },
  {
    id: "zoom",
    name: "Zoom",
    family: "Half Court",
    side: "offense",
    owner: "ours",
    team: "Pikesville Varsity",
    teamSeasonId: "pikesville-2025-26-varsity",
    tags: ["guard action", "handoff"],
    notes: "Best for creating catch-and-go downhill touches.",
    imageUrl: "",
    embedCode: "",
  },
  {
    id: "man-to-man",
    name: "Man to Man",
    family: "Base Defense",
    side: "defense",
    owner: "ours",
    team: "Pikesville Varsity",
    teamSeasonId: "pikesville-2025-26-varsity",
    tags: ["man"],
    notes: "Default coverage.",
    imageUrl: "",
    embedCode: "",
  },
  {
    id: "2-3-zone",
    name: "2-3 Zone",
    family: "Zone",
    side: "defense",
    owner: "opponent",
    team: "Dulaney",
    teamSeasonId: "dulaney-2025-26-varsity",
    tags: ["zone"],
    notes: "Often used after dead balls and made free throws.",
    imageUrl: "",
    embedCode: "",
  },
  {
    id: "pistol",
    name: "Pistol",
    family: "Transition",
    side: "offense",
    owner: "opponent",
    team: "Dulaney",
    teamSeasonId: "dulaney-2025-26-varsity",
    tags: ["transition"],
    notes: "Flows quickly into slot ball screen.",
    imageUrl: "",
    embedCode: "",
  },
];

export const drills: DrillLibraryRecord[] = [
  {
    id: "villanova-wildcat-shooting-series",
    legacyId: "786",
    title: "Villanova Wildcat Shooting Series",
    drillType: "Shooting",
    playType: "",
    tags: ["Shooting"],
    description:
      "A five-spot shooting drill emphasizing footwork, quick release, and movement off the ball.",
    instructions:
      "Step 1: Place cones or markers at five perimeter spots (corners, wings, top).\nStep 2: Player starts in the corner, sprints to top, receives pass, shoots in rhythm.\n- Progress through all five spots.\n- 1 point per make. Goal: 20 total points.\n- Add shot fakes or one-dribble pull-ups for advanced version.",
    videoUrl: "",
    imageUrl: "",
    notes: "",
    isActive: true,
  },
  {
    id: "shell-drill-stunt-recover",
    legacyId: "787",
    title: "Shell Drill + Stunt and Recover",
    drillType: "Defense",
    playType: "",
    tags: ["Defense"],
    description:
      "Classic defensive positioning drill with added emphasis on stunting at the ball and recovering to closeouts.",
    instructions:
      "Step 1: Set up 4-on-4 shell with offense on perimeter.\nStep 2: On each pass, defenders must stunt toward the ball, then recover in stance.\n- Coach may call \"Drive!\" to initiate help-and-rotate action.\n- Progress to live play after 3 clean rotations.",
    videoUrl: "",
    imageUrl: "",
    notes: "",
    isActive: true,
  },
  {
    id: "2-on-1-advantage-transition-drill",
    legacyId: "788",
    title: "2-on-1 Advantage Transition Drill",
    drillType: "Transition",
    playType: "",
    tags: ["Transition"],
    description:
      "Teaches decision-making in advantage transition situations with a trailing defender.",
    instructions:
      "Step 1: Two offensive players start at half court. Defender begins 3 steps behind.\nStep 2: Play live to basket. Offense must read defender and finish or dish.\n- Defender must sprint and recover without fouling.\n- Rotate roles every rep.",
    videoUrl: "",
    imageUrl: "",
    notes: "",
    isActive: true,
  },
];

export const practicePlans: PracticePlanRecord[] = [
  {
    id: "practice-2026-02-25-playoff-rd-1",
    seasonId: "2025-26",
    teamSeasonId: "pikesville-2025-26-varsity",
    teamSeasonIds: ["pikesville-2025-26-varsity"],
    title: "02-25-2026 Practice Plan",
    practiceDate: "2026-02-25",
    startTime: "17:00",
    lengthMinutes: 120,
    attendanceMode: "mandatory",
    practiceGoal: "Improve communication, movement, effort, and focus for the playoffs.",
    items: [
      {
        id: "practice-item-1",
        order: 1,
        itemType: "custom_drill",
        title: "Dynamic Warmup",
        durationMinutes: 5,
        focusTags: ["Warmup", "Movement"],
        instructions:
          "5 laps around the gym\nHigh knees\nButt kicks\nArm stretches\nFrankensteins\nWalking lunges",
        rating: "bad",
        isFinished: false,
        waterBreak: false,
        imageUrls: [],
        circuitItems: [],
      },
      {
        id: "practice-item-2",
        order: 2,
        itemType: "library_drill",
        drillLibraryId: "villanova-wildcat-shooting-series",
        durationMinutes: 15,
        focusTags: ["Shooting"],
        goal: "Build rhythm and footwork before live work.",
        rating: "ok",
        isFinished: false,
        waterBreak: false,
        imageUrls: [],
        circuitItems: [],
      },
      {
        id: "practice-item-3",
        order: 3,
        itemType: "circuit",
        title: "Circuit: Ball Security",
        durationMinutes: 10,
        focusTags: ["Ball Handling", "Pressure"],
        goal: "Simulate pressure and force clean decisions under chaos.",
        rating: "good",
        isFinished: false,
        waterBreak: false,
        imageUrls: [],
        circuitItems: [
          {
            id: "practice-circuit-1",
            title: "2-on-2 + 1 Trapper",
            durationMinutes: 5,
            focusTags: ["Ball Handling", "Pressure"],
          },
          {
            id: "practice-circuit-2",
            title: "Pressure Release Drill",
            durationMinutes: 5,
            focusTags: ["Ball Handling", "Passing"],
          },
        ],
      },
      {
        id: "practice-item-4",
        order: 4,
        itemType: "instruction",
        title: "Offensive Play Installation",
        durationMinutes: 15,
        focusTags: ["Offense", "Zone Attack"],
        goal: "Install zone attack spacing and reads against 3-2 and 2-3.",
        instructions:
          "Against 3-2: high post flash, short corner drift, skip opposite.\nAgainst 2-3: high-low, inside/outside screen, 4-out 1-in spacing.",
        rating: "ok",
        isFinished: false,
        waterBreak: false,
        imageUrls: [],
        circuitItems: [],
      },
    ],
  },
];

export const coachProfiles: CoachProfileRecord[] = [
  {
    id: "coach-mike",
    fullName: "Michael Wertlieb",
    displayName: "Coach Mike",
  },
  {
    id: "coach-tyra",
    fullName: "Tyra Hawkes",
    displayName: "Coach Tyra",
  },
  {
    id: "coach-craig",
    fullName: "Craig Copeland",
    displayName: "Coach Craig",
  },
];

export const coachResponsibilityTemplates: CoachResponsibilityTemplateRecord[] = [
  {
    id: "coach-responsibility-timeout-bench",
    label: "Timeout (Card Check) & Bench Setup",
    coachProfileId: "coach-mike",
    sortOrder: 1,
  },
  {
    id: "coach-responsibility-defensive-execution",
    label: "Defensive Execution",
    coachProfileId: "coach-tyra",
    sortOrder: 2,
  },
  {
    id: "coach-responsibility-possession-value-subs",
    label: "Possession Value/Subs",
    coachProfileId: "coach-mike",
    sortOrder: 3,
  },
  {
    id: "coach-responsibility-offball-movement",
    label: "Offball Movement",
    sortOrder: 4,
  },
  {
    id: "coach-responsibility-scout-adjustment",
    label: "Scout/Adjustment",
    coachProfileId: "coach-tyra",
    sortOrder: 5,
  },
  {
    id: "coach-responsibility-managers-table",
    label: "Managers/Table",
    coachProfileId: "coach-craig",
    sortOrder: 6,
  },
  {
    id: "coach-responsibility-between-quarter-possession",
    label: "In Between Quarter Possession",
    sortOrder: 7,
  },
  {
    id: "coach-responsibility-bench-energy",
    label: "Bench & Energy",
    sortOrder: 8,
  },
  {
    id: "coach-responsibility-late-game-to-strategy",
    label: "Late Game TO/Strategy",
    coachProfileId: "coach-craig",
    sortOrder: 9,
  },
];

export const managerProfiles: ManagerProfileRecord[] = [
  {
    id: "manager-jordan",
    fullName: "Jordan Thomas",
    displayName: "Manager Jordan",
  },
];

export const weekGoals: WeekGoalRecord[] = [
  {
    id: "week-goal-playoff-focus",
    title: "Playoff Focus Week",
    body:
      "Communicate early, sprint into spots, and bring playoff-level urgency to every rep this week.",
    startDate: "2026-04-20",
    endDate: "2026-04-26",
    targetRoles: ["player", "coach", "admin"],
    isActive: true,
  },
  {
    id: "week-goal-coach-alignment",
    title: "Coach Alignment",
    body: "Keep terminology tight across scouting, practice, and live bench communication.",
    startDate: "2026-04-20",
    endDate: "2026-04-26",
    targetRoles: ["coach", "admin"],
    isActive: true,
  },
];

export const programAssignments: ProgramAssignmentRecord[] = [
  {
    id: "assignment-play-review-horns",
    title: "Review Horns Package",
    body: "Be ready to talk through spacing, first read, and weak-side lift timing.",
    assignmentType: "play_review",
    dueAt: "2026-04-22T19:00:00-04:00",
    isActive: true,
    targetRoles: ["player"],
    targetRosterMembershipIds: ["kylan-2025-26", "jonah-2025-26"],
    targetCoachProfileIds: [],
    targetManagerProfileIds: [],
    relatedPlayIds: ["horns"],
    relatedPlayerIds: [],
    proofRequired: false,
  },
  {
    id: "assignment-shots-up",
    title: "Get 250 Shots Up",
    body: "Use the shooting machine and log your makes. Proof upload flow can come next.",
    assignmentType: "shooting_goal",
    dueAt: "2026-04-23T18:00:00-04:00",
    isActive: true,
    targetRoles: ["player"],
    targetRosterMembershipIds: ["kylan-2025-26"],
    targetCoachProfileIds: [],
    targetManagerProfileIds: [],
    relatedPlayIds: [],
    relatedPlayerIds: [],
    shotsTarget: 250,
    proofRequired: true,
  },
  {
    id: "assignment-scout-report-dulaney",
    title: "Read Dulaney Scouting Report",
    body: "Know the primary actions, personnel, and keys to winning before tomorrow's walkthrough.",
    assignmentType: "read_scouting_report",
    dueAt: "2026-04-21T20:00:00-04:00",
    isActive: true,
    targetRoles: ["player", "coach", "admin"],
    targetRosterMembershipIds: [],
    targetCoachProfileIds: [],
    targetManagerProfileIds: [],
    relatedPlayIds: [],
    relatedPlayerIds: [],
    relatedGameId: "2026-01-31-dulaney",
    proofRequired: false,
  },
  {
    id: "assignment-coach-eval-jonah",
    title: "Create Evaluation For Jonah Matz",
    body: "Add the latest evaluation after the next skill workout.",
    assignmentType: "create_evaluation",
    dueAt: "2026-04-24T12:00:00-04:00",
    isActive: true,
    targetRoles: ["coach", "admin"],
    targetRosterMembershipIds: [],
    targetCoachProfileIds: ["coach-mike"],
    targetManagerProfileIds: [],
    relatedPlayIds: [],
    relatedPlayerIds: ["jonah-matz"],
    relatedPlayerId: "jonah-matz",
    proofRequired: false,
  },
  {
    id: "assignment-team-message-video",
    title: "Watch Team Message",
    body: "Short film clip to reset the tone for the week.",
    assignmentType: "watch_video",
    dueAt: "2026-04-21T17:00:00-04:00",
    isActive: true,
    targetRoles: ["player", "coach", "admin"],
    targetRosterMembershipIds: [],
    targetCoachProfileIds: [],
    targetManagerProfileIds: [],
    relatedPlayIds: [],
    relatedPlayerIds: [],
    videoEmbedCode:
      "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/yxR0y-F2lF4\" title=\"Team Message\" frameborder=\"0\" allowfullscreen></iframe>",
    proofRequired: false,
  },
];

export const programAssignmentProofs: ProgramAssignmentProofRecord[] = [];
export const programAssignmentCompletions: ProgramAssignmentCompletionRecord[] = [];

export const eventAttendanceResponses: EventAttendanceRecord[] = [];

export const games: Array<{
  id: string;
  seasonId: string;
  startsAt: string;
  date: string;
  opponent: string;
  season: string;
  status: string;
  score: string;
  prepStatus: string;
  location: string;
  attendanceMode: "mandatory" | "voluntary";
  capacity?: number;
  homeTeamSeasonId: string;
  awayTeamSeasonId: string;
}> = [
  {
    id: "2026-01-31-dulaney",
    seasonId: "2025-26",
    startsAt: "2026-01-31T19:00:00-05:00",
    date: "2026-01-31 7:00 PM",
    opponent: "Dulaney",
    season: "2025-26 Varsity Season",
    status: "scheduled",
    score: "-",
    prepStatus: "ready",
    location: "Home",
    attendanceMode: "mandatory",
    homeTeamSeasonId: "pikesville-2025-26-varsity",
    awayTeamSeasonId: "dulaney-2025-26-varsity",
  },
  {
    id: "2026-02-07-liberty",
    seasonId: "2025-26",
    startsAt: "2026-02-07T19:30:00-05:00",
    date: "2026-02-07 7:30 PM",
    opponent: "Liberty",
    season: "2025-26 Varsity Season",
    status: "live",
    score: "48-42",
    prepStatus: "ready",
    location: "Away",
    attendanceMode: "mandatory",
    homeTeamSeasonId: "pikesville-2025-26-varsity",
    awayTeamSeasonId: "liberty-2025-26-varsity",
  },
];

export const prepSnapshot = {
  gameId: "2026-01-31-dulaney",
  overview: {
    opponentSummary:
      "Deliberate half-court group that prefers guard-led actions and zone coverages after stoppages.",
    keysToWinning:
      "Win the glass, touch the paint first, and do not allow rhythm pull-up threes off middle ball screen.",
    actionsToWatch:
      "Pistol, middle ball screen, baseline drift shooter, 2-3 zone after makes.",
  },
  playerFocus: playerRows.filter(
    (player) => player.team === "Dulaney" && player.season === "2025-26",
  ),
  overrides: {
    matchupEmphasis:
      "Crowd Chase Huber on all ball screens and tag Kelan Dennis early on shot release.",
    benchReminders:
      "Call out zone early. Run Horns to distort the top two defenders. No empty defensive possessions.",
    specialSituations:
      "Expect a quick set for Huber out of timeout and a late-quarter horn flare.",
  },
  plannedContext: {
    likelyOpponentActions: ["Pistol", "2-3 Zone", "Middle Ball Screen"],
    plannedOffense: ["Horns", "Zoom"],
    plannedDefense: ["Man to Man", "Switch late clock"],
  },
};

export const gameEventFeed = [
  {
    id: "event-1",
    gameId: "2026-02-07-liberty",
    sequenceNumber: 1,
    teamSide: "home",
    teamName: "Pikesville",
    eventType: "shot",
    summary: "Kylan Artis made a 3PT shot",
    quarter: 1,
    secondsRemaining: 436,
    shotX: 34,
    shotY: 62,
    shotResult: "make",
    shotValue: 3,
  },
  {
    id: "event-2",
    gameId: "2026-02-07-liberty",
    sequenceNumber: 2,
    teamSide: "away",
    teamName: "Liberty",
    eventType: "rebound_def",
    summary: "Liberty grabbed a defensive rebound",
    quarter: 1,
    secondsRemaining: 423,
    shotX: null,
    shotY: null,
    shotResult: null,
    shotValue: null,
  },
  {
    id: "event-3",
    gameId: "2026-02-07-liberty",
    sequenceNumber: 3,
    teamSide: "home",
    teamName: "Pikesville",
    eventType: "assist",
    summary: "Travon Anderson recorded an assist",
    quarter: 1,
    secondsRemaining: 401,
    shotX: null,
    shotY: null,
    shotResult: null,
    shotValue: null,
  },
];
