import type {
  ParticipantScore,
  PlayerForRoundCheck,
  ScoreStatistics,
  TeamResult,
} from "../types";

// Re-export shared types for backward compatibility
export type {
  ParticipantScore,
  PlayerForRoundCheck,
  ScoreStatistics,
  TeamResult,
} from "../types";

/**
 * Calculate participant score statistics from their score array
 * @param scores Array of scores for each hole (0 = not reported, -1 = gave up, positive = actual score)
 * @param coursePars Array of par values for each hole
 * @returns Score statistics including total shots, relative to par, and holes played
 */
export function calculateParticipantScore(
  scores: number[],
  coursePars: number[]
): ScoreStatistics {
  // Check if player gave up on any hole - if so, invalidate entire round
  const hasGaveUp = scores.some((score) => score === -1);

  if (hasGaveUp) {
    return {
      totalShots: 0,
      relativeToPar: 0,
      holesPlayed: 0,
      isValidRound: false,
    };
  }

  let totalShots = 0;
  let totalPlayedPar = 0;
  let holesPlayed = 0;

  for (let i = 0; i < Math.min(scores.length, coursePars.length); i++) {
    const score = scores[i];
    const par = coursePars[i];

    // Only count holes that have been played (score > 0)
    // Exclude gave up (-1) and not reported (0) holes
    if (score && score > 0) {
      totalShots += score;
      totalPlayedPar += par;
      holesPlayed++;
    }
  }

  const relativeToPar = totalShots > 0 ? totalShots - totalPlayedPar : 0;

  return {
    totalShots,
    relativeToPar,
    holesPlayed,
    isValidRound: true,
  };
}

/**
 * Format score relative to par for display
 * @param toPar The score relative to par (positive = over par, negative = under par, 0 = even)
 * @returns Formatted string (e.g., "E", "+2", "-1")
 */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

/**
 * Get CSS color class based on score relative to par
 * @param toPar The score relative to par
 * @returns CSS color class string
 */
export function getToParColor(toPar: number): string {
  if (toPar === 0) return "text-turf";
  if (toPar < 0) return "text-flag";
  return "text-charcoal";
}

/**
 * Get position styling for leaderboard positions
 * @param position The position/rank (1st, 2nd, 3rd, etc.)
 * @returns CSS classes for position styling
 */
export function getPositionColor(position: number): string {
  switch (position) {
    case 1:
      return "text-fairway bg-scorecard border-l-[#FFD700]";
    case 2:
      return "text-fairway bg-scorecard border-l-[#C0C0C0]";
    case 3:
      return "text-fairway bg-scorecard border-l-[#CD7F32]";
    default:
      return "text-charcoal bg-scorecard border-l-soft-grey";
  }
}

/**
 * Calculate team results from individual participant scores
 * @param leaderboard Array of participant scores
 * @returns Array of team results with standings and points
 */
export function calculateTeamResults(
  leaderboard: ParticipantScore[]
): TeamResult[] {
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
  }, {} as Record<string, { teamName: string; participants: Array<{ name: string; position: string; totalShots: number; relativeToPar: number }>; totalShots: number; relativeToPar: number }>);

  // Sort teams by relativeToPar and assign points
  return Object.values(teamGroups)
    .sort((a, b) => a.relativeToPar - b.relativeToPar)
    .map((team, index, array) => {
      const position = index + 1;
      let points = array.length - position + 1; // Base points (last place gets 1 point)

      // Add extra points for top 3 positions
      if (position === 1) points += 2; // First place gets 2 extra points
      if (position === 2) points += 1; // Second place gets 1 extra point

      return {
        ...team,
        position,
        points,
      };
    });
}

/**
 * Format score for display in scorecard
 * @param score The raw score (-1 = gave up, 0 = not reported, positive = actual score)
 * @returns Formatted score string
 */
export function formatScoreDisplay(score: number): string {
  if (score === -1) return "-"; // Gave up
  if (score === 0) return "0"; // Not reported
  return score.toString(); // Actual score
}

/**
 * Format score for display in score entry (slightly different from scorecard)
 * @param score The raw score (-1 = gave up, 0 = not reported, positive = actual score)
 * @returns Formatted score string
 */
export function formatScoreEntryDisplay(score: number | null): string {
  if (score === -1 || score === null) return "-"; // Gave up
  if (score === 0) return "0"; // Not reported
  return score.toString(); // Actual score
}

/**
 * Calculate total number of participants across all tee times
 * @param teeTimes Array of tee time objects with participants
 * @returns Total participant count
 */
export function calculateTotalParticipants(
  teeTimes: Array<{ participants: unknown[] }> | undefined
): number {
  return (
    teeTimes?.reduce(
      (total, teeTime) => total + teeTime.participants.length,
      0
    ) || 0
  );
}

/**
 * Check if a score is valid for color coding and calculations
 * @param score The score to validate
 * @returns True if score is valid (positive number)
 */
export function isValidScore(score: number): boolean {
  return score > 0;
}

/**
 * Check if a participant has a valid score entered for a hole
 * @param score The score to check
 * @returns True if score has been entered (not 0)
 */
export function hasValidScore(score: number): boolean {
  return score !== 0;
}

/**
 * Calculate total shots for a subset of holes
 * @param playerScores Array of all player scores
 * @param holes Array of hole objects with number property
 * @returns Total shots for the specified holes
 */
export function calculateHoleTotal(
  playerScores: number[],
  holes: Array<{ number: number }>
): number {
  return holes.reduce((total, hole) => {
    const score = playerScores[hole.number - 1];
    // Only count actual scores (positive numbers) in totals
    // Exclude gave up (-1) and not reported (0) holes
    return total + (score && score > 0 ? score : 0);
  }, 0);
}

/**
 * Calculate par total for played holes only
 * @param playerScores Array of all player scores
 * @param holes Array of hole objects with number and par properties
 * @returns Total par for holes that have been played
 */
export function calculatePlayedPar(
  playerScores: number[],
  holes: Array<{ number: number; par: number }>
): number {
  return holes.reduce((totalPar, hole) => {
    const score = playerScores[hole.number - 1];
    // Only count par for holes that have been played (score > 0)
    // Exclude gave up (-1) and not reported (0) holes
    return totalPar + (score && score > 0 ? hole.par : 0);
  }, 0);
}

export function isRoundComplete(players: PlayerForRoundCheck[]): boolean {
  if (!players || players.length === 0) {
    return false;
  }

  // Check every player in the group
  for (const player of players) {
    if (!player.score || !Array.isArray(player.score)) {
      return false;
    }

    // Check all 18 holes for this player
    for (let holeIndex = 0; holeIndex < 18; holeIndex++) {
      const score = player.score[holeIndex];
      // A score of 0, null, or undefined indicates the hole is not yet played.
      if (score === 0 || score === null || score === undefined) {
        return false;
      }
    }
  }

  // If all loops complete, the round is finished.
  return true;
}
