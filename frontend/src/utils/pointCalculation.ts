import type {
  ParticipantScore,
  TeamResultInput,
  TeamResultWithPoints,
} from "../types";

// Re-export shared types for backward compatibility
export type { TeamResultInput, TeamResultWithPoints } from "../types";

/**
 * Extended ParticipantScore that requires the score array
 * Used in convertLeaderboardToTeamInput where we need to check for -1 values
 */
export interface ParticipantScoreWithScores extends Omit<ParticipantScore, "participant"> {
  participant: ParticipantScore["participant"] & {
    score: number[]; // Raw scorecard array - required for checking gave-up markers
  };
}

/**
 * Converts leaderboard data to TeamResultInput format for processing
 * @param leaderboard Array of participant scores from the leaderboard
 * @returns Array of TeamResultInput objects ready for processing
 */
export function convertLeaderboardToTeamInput(
  leaderboard: ParticipantScoreWithScores[]
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

    // Check if this participant has invalid score (-1 in score array)
    // This overrides the backend's calculated totalShots and relativeToPar
    const hasInvalidScore = entry.participant.score.includes(-1);

    acc[teamName].participants.push({
      name: entry.participant.player_names || "",
      position: entry.participant.position_name,
      totalShots: hasInvalidScore ? -1 : entry.totalShots,
      relativeToPar: hasInvalidScore ? 0 : entry.relativeToPar,
    });
    return acc;
  }, {} as Record<string, TeamResultInput>);

  // Calculate team totals after all participants are added
  return Object.values(teamGroups).map((team) => {
    // Check if any participant has an invalid round (-1)
    const hasInvalidParticipant = team.participants.some(
      (p) => p.totalShots === -1
    );

    if (hasInvalidParticipant) {
      // If any participant has -1, the team score is invalid
      return {
        ...team,
        totalShots: -1, // Mark team as invalid
        relativeToPar: 0, // Don't calculate relative to par for invalid teams
      };
    } else {
      // Only calculate totals for valid participants (exclude those with 0 or -1)
      const validParticipants = team.participants.filter(
        (p) => p.totalShots > 0
      );
      const totalShots = validParticipants.reduce(
        (sum, p) => sum + p.totalShots,
        0
      );
      const relativeToPar = validParticipants.reduce(
        (sum, p) => sum + p.relativeToPar,
        0
      );

      return {
        ...team,
        totalShots,
        relativeToPar,
      };
    }
  });
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
    // Determine team status for 3-tier sorting
    const teamAHasInvalidScores = teamA.participants.some(
      (p) => p.totalShots === -1
    );
    const teamAHasAnyScores = teamA.participants.some((p) => p.totalShots > 0);
    const teamBHasInvalidScores = teamB.participants.some(
      (p) => p.totalShots === -1
    );
    const teamBHasAnyScores = teamB.participants.some((p) => p.totalShots > 0);

    // Category 1: Valid teams (no -1 scores, has scores)
    const teamAIsValid = !teamAHasInvalidScores && teamAHasAnyScores;
    const teamBIsValid = !teamBHasInvalidScores && teamBHasAnyScores;

    // Category 2: Invalid teams (has -1 scores but still has some scores)
    const teamAIsInvalid = teamAHasInvalidScores && teamAHasAnyScores;
    const teamBIsInvalid = teamBHasInvalidScores && teamBHasAnyScores;

    // Category 3: No results teams (no scores at all)
    const teamANoResults = !teamAHasAnyScores;
    const teamBNoResults = !teamBHasAnyScores;

    // Sort by category priority: Valid first, then invalid, then no results
    if (teamAIsValid && !teamBIsValid) return -1;
    if (!teamAIsValid && teamBIsValid) return 1;

    if (teamAIsInvalid && teamBNoResults) return -1;
    if (teamANoResults && teamBIsInvalid) return 1;

    // Within valid teams: sort by performance
    if (teamAIsValid && teamBIsValid) {
      // Primary Sort: Compare main team scores (relativeToPar) in ascending order (lower is better)
      if (teamA.relativeToPar !== teamB.relativeToPar) {
        return teamA.relativeToPar - teamB.relativeToPar;
      }
      // Custom Tie-Breaker: Countback logic using individual player scores
      return performCountbackTieBreaker(teamA, teamB);
    }

    // Within invalid teams or no results teams: maintain original order
    return 0;
  });

  // Step B: Point Calculation using new logic
  // Only teams with valid scores get ranking points
  const teamsWithResults = sortedTeams.filter(
    (team) =>
      !team.participants.some((p) => p.totalShots === -1) &&
      team.participants.some((p) => p.totalShots > 0)
  );

  // Use total series teams if provided, otherwise fall back to teams with results
  const totalTeamsInSeries = totalSeriesTeams || teamsWithResults.length;

  return sortedTeams.map((team, index) => {
    // Determine team status
    const hasInvalidScores = team.participants.some((p) => p.totalShots === -1);
    const hasAnyScores = team.participants.some((p) => p.totalShots > 0);

    // Only teams with valid scores (no -1, has scores) get ranking points
    const hasResults = !hasInvalidScores && hasAnyScores;
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
