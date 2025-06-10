// Types for the point calculation module
export interface TeamResultInput {
  teamName: string;
  participants: Array<{
    name: string;
    position: string;
    totalShots: number;
    relativeToPar: number;
  }>;
  totalShots: number;
  relativeToPar: number;
}

export interface TeamResultWithPoints extends TeamResultInput {
  position: number;
  rankingPoints: number;
  hasResults: boolean;
}

// Types for compatibility with existing leaderboard data
export interface ParticipantScore {
  participantId: number;
  participant: {
    id: number;
    team_name: string;
    position_name: string;
    player_names?: string | null;
  };
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
}

/**
 * Converts leaderboard data to TeamResultInput format for processing
 * @param leaderboard Array of participant scores from the leaderboard
 * @returns Array of TeamResultInput objects ready for processing
 */
export function convertLeaderboardToTeamInput(
  leaderboard: ParticipantScore[]
): TeamResultInput[] {
  // Group participants by team
  const teamGroups = leaderboard.reduce((acc, entry) => {
    const teamName = entry.participant.team_name;
    if (!acc[teamName]) {
      acc[teamName] = {
        teamName,
        participants: [],
        totalShots: 0,
        relativeToPar: 0,
      };
    }
    acc[teamName].participants.push({
      name: entry.participant.player_names || "",
      position: entry.participant.position_name,
      totalShots: entry.totalShots,
      relativeToPar: entry.relativeToPar,
    });
    acc[teamName].totalShots += entry.totalShots;
    acc[teamName].relativeToPar += entry.relativeToPar;
    return acc;
  }, {} as Record<string, TeamResultInput>);

  return Object.values(teamGroups);
}

/**
 * Main function to process team results with full sorting, tie-breaking, and point calculation
 * Takes raw team data and returns a fully sorted and point-assigned list
 *
 * @param teams Raw, unsorted array of team result objects
 * @param totalSeriesTeams Total number of teams in the series (not just teams with results)
 * @returns Final, sorted array with rankingPoints property added to each team
 */
export function processTeamResults(
  teams: TeamResultInput[],
  totalSeriesTeams?: number
): TeamResultWithPoints[] {
  if (!teams || teams.length === 0) {
    return [];
  }

  // Step A: Advanced Sorting with Custom Tie-Breaking
  const sortedTeams = [...teams].sort((teamA, teamB) => {
    // A team has valid results ONLY if all its participants have a valid round (no -1 scores)
    const teamAHasValidResults = !teamA.participants.some(
      (p) => p.totalShots === -1
    );
    const teamBHasValidResults = !teamB.participants.some(
      (p) => p.totalShots === -1
    );

    if (!teamAHasValidResults && !teamBHasValidResults) return 0;
    if (!teamAHasValidResults) return 1; // Team A has invalid results, goes to bottom
    if (!teamBHasValidResults) return -1; // Team B has invalid results, goes to bottom

    // Primary Sort: Compare main team scores (relativeToPar) in ascending order (lower is better)
    if (teamA.relativeToPar !== teamB.relativeToPar) {
      return teamA.relativeToPar - teamB.relativeToPar;
    }

    // Custom Tie-Breaker: Countback logic using individual player scores
    return performCountbackTieBreaker(teamA, teamB);
  });

  // Step B: Point Calculation using new logic
  const teamsWithResults = sortedTeams.filter(
    (team) =>
      !team.participants.some((p) => p.totalShots === -1) &&
      team.participants.some((p) => p.totalShots > 0)
  );

  // Use total series teams if provided, otherwise fall back to teams with results
  const totalTeamsInSeries = totalSeriesTeams || teamsWithResults.length;

  return sortedTeams.map((team, index) => {
    const hasResults =
      !team.participants.some((p) => p.totalShots === -1) &&
      team.participants.some((p) => p.totalShots > 0);
    const position = index + 1;

    let rankingPoints = 0;

    if (hasResults && totalTeamsInSeries > 0) {
      const positionInScoredTeams =
        teamsWithResults.findIndex((t) => t === team) + 1;

      // New point calculation logic based on total series teams
      if (positionInScoredTeams === 1) {
        // 1st place: Total series teams + 2
        rankingPoints = totalTeamsInSeries + 2;
      } else if (positionInScoredTeams === 2) {
        // 2nd place: 1st place points - 2
        const firstPlacePoints = totalTeamsInSeries + 2;
        rankingPoints = firstPlacePoints - 2;
      } else if (positionInScoredTeams === 3) {
        // 3rd place: 2nd place points - 2
        const firstPlacePoints = totalTeamsInSeries + 2;
        const secondPlacePoints = firstPlacePoints - 2;
        rankingPoints = secondPlacePoints - 2;
      } else {
        // 4th place and below: Previous position - 1
        const firstPlacePoints = totalTeamsInSeries + 2;
        const secondPlacePoints = firstPlacePoints - 2;
        const thirdPlacePoints = secondPlacePoints - 2;
        rankingPoints = thirdPlacePoints - (positionInScoredTeams - 3);
      }

      // Ensure points don't go below 1 for teams with results
      rankingPoints = Math.max(1, rankingPoints);
    }

    return {
      ...team,
      position,
      rankingPoints,
      hasResults,
    };
  });
}

/**
 * Performs countback tie-breaking logic between two teams
 * Compares individual player scores from lowest to highest until tie is broken
 *
 * @param teamA First team to compare
 * @param teamB Second team to compare
 * @returns Negative if teamA wins, positive if teamB wins, 0 if still tied
 */
function performCountbackTieBreaker(
  teamA: TeamResultInput,
  teamB: TeamResultInput
): number {
  // Get individual player scores for each team and sort from lowest to highest
  const teamAScores = teamA.participants
    .filter((p) => p.totalShots > 0) // Only include players with valid scores
    .map((p) => p.relativeToPar)
    .sort((a, b) => a - b);

  const teamBScores = teamB.participants
    .filter((p) => p.totalShots > 0) // Only include players with valid scores
    .map((p) => p.relativeToPar)
    .sort((a, b) => a - b);

  // Compare scores starting from the best (lowest) score
  const maxComparisons = Math.max(teamAScores.length, teamBScores.length);

  for (let i = 0; i < maxComparisons; i++) {
    const scoreA = teamAScores[i] ?? Number.MAX_SAFE_INTEGER; // If team has fewer players, treat as worst score
    const scoreB = teamBScores[i] ?? Number.MAX_SAFE_INTEGER;

    if (scoreA !== scoreB) {
      return scoreA - scoreB; // Lower score wins
    }
  }

  // If all comparable scores are identical, teams remain tied
  return 0;
}

/**
 * Helper function to validate team result input
 * @param team Team result to validate
 * @returns True if team has valid structure
 */
export function isValidTeamResult(team: unknown): team is TeamResultInput {
  if (!team || typeof team !== "object") return false;

  const teamObj = team as Record<string, unknown>;

  return (
    "teamName" in teamObj &&
    "participants" in teamObj &&
    "totalShots" in teamObj &&
    "relativeToPar" in teamObj &&
    typeof teamObj.teamName === "string" &&
    Array.isArray(teamObj.participants) &&
    typeof teamObj.totalShots === "number" &&
    typeof teamObj.relativeToPar === "number" &&
    (teamObj.participants as unknown[]).every((p: unknown) => {
      if (!p || typeof p !== "object") return false;
      const participant = p as Record<string, unknown>;
      return (
        "name" in participant &&
        "position" in participant &&
        "totalShots" in participant &&
        "relativeToPar" in participant &&
        typeof participant.name === "string" &&
        typeof participant.position === "string" &&
        typeof participant.totalShots === "number" &&
        typeof participant.relativeToPar === "number"
      );
    })
  );
}

/**
 * Helper function to debug team ranking results
 * Useful for development and testing
 * @param teams Array of processed teams
 * @param totalSeriesTeams Total teams in series for context
 * @returns Debug information about the sorting
 */
export function debugTeamRanking(
  teams: TeamResultWithPoints[],
  totalSeriesTeams?: number
): string[] {
  const debugInfo = [
    `=== TEAM RANKING DEBUG ===`,
    `Total teams in series: ${totalSeriesTeams || "Not provided"}`,
    `Teams with results: ${teams.filter((t) => t.hasResults).length}`,
    `Teams without results: ${teams.filter((t) => !t.hasResults).length}`,
    ``,
  ];

  const teamDebug = teams.map((team, index) => {
    const hasResults = team.hasResults ? "Yes" : "No";
    const individualScores = team.participants
      .filter((p) => p.totalShots > 0)
      .map((p) => p.relativeToPar)
      .sort((a, b) => a - b)
      .join(", ");

    return `${index + 1}. ${team.teamName} - Score: ${
      team.relativeToPar
    } - Points: ${
      team.rankingPoints
    } - Has Results: ${hasResults} - Individual: [${individualScores}]`;
  });

  return [...debugInfo, ...teamDebug];
}
