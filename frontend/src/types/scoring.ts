/**
 * Scoring type definitions for calculations and team results
 *
 * Score Value Conventions:
 * - 0 = not reported (hole not yet played)
 * - -1 = gave up (disqualified from this round)
 * - positive number = actual strokes taken
 */

/**
 * Statistics calculated from a participant's scores
 */
export interface ScoreStatistics {
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
  isValidRound: boolean;
}

/**
 * Individual participant entry within a team result
 */
export interface TeamParticipantEntry {
  name: string;
  position: string;
  totalShots: number;
  relativeToPar: number;
}

/**
 * Input structure for team result processing
 * Used before points are calculated
 */
export interface TeamResultInput {
  teamName: string;
  participants: TeamParticipantEntry[];
  totalShots: number;
  relativeToPar: number;
}

/**
 * Team result from basic calculation (used in scoreCalculations.ts)
 * Includes position and simple points
 */
export interface TeamResult extends TeamResultInput {
  position: number;
  points: number;
}

/**
 * Team result with full ranking points (used in pointCalculation.ts)
 * Extended from TeamResultInput with series ranking points
 */
export interface TeamResultWithPoints extends TeamResultInput {
  position: number;
  rankingPoints: number;
  hasResults: boolean;
}
