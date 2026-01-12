/**
 * Participant type definitions for score calculations and leaderboards
 */

/**
 * Core participant data used in scorecard and leaderboard contexts
 */
export interface ParticipantData {
  id: number;
  team_name: string;
  position_name: string;
  player_name?: string | null;
  /**
   * Raw scorecard array - one entry per hole
   * Only present when full score data is needed (e.g., for checking -1 values)
   */
  score?: number[];
}

/**
 * Participant score entry used in leaderboard calculations
 *
 * Used by both scoreCalculations.ts and pointCalculation.ts
 * The `participant.score` property is optional - only populated when
 * raw score array is needed (e.g., checking for gave-up markers)
 */
export interface ParticipantScore {
  participantId: number;
  participant: ParticipantData;
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
}

/**
 * Minimal player interface for round completion checks
 */
export interface PlayerForRoundCheck {
  score: number[];
}
