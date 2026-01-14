import type { Database } from "bun:sqlite";
import type { GameScoringMode } from "../../types";

/**
 * Result of game score calculation for a single player/member
 */
export interface GameScoreResult {
  memberId: number;
  memberName: string;
  grossTotal: number;
  netTotal?: number;
  relativeToPar: number;
  netRelativeToPar?: number;
  holesPlayed: number;
  position: number;
  /**
   * Game-specific display data for frontend rendering
   *
   * Examples:
   * - Stableford: { points: 36, pointsPerHole: [2,3,1,...] }
   * - Skins: { skinsWon: 3, holeNumbers: [2,7,14] }
   * - Scramble: { teamId: 5, teamName: "Team Alpha" }
   *
   * See docs/backend/game-types.md for complete examples.
   */
  customDisplayData?: Record<string, any>;
}

/**
 * Tee-specific rating information for a player
 */
export interface PlayerTeeRating {
  courseRating: number;
  slopeRating: number;
  par: number;
}

/**
 * Context provided to strategy for leaderboard calculation
 */
export interface GameLeaderboardContext {
  gameId: number;
  pars: number[];
  strokeIndex: number[];
  scoringMode: GameScoringMode;
  customSettings?: Record<string, any>;
  /**
   * Map of member_id to tee-specific rating data
   * Used for accurate course handicap calculations
   */
  playerTeeRatings?: Map<number, PlayerTeeRating>;
}

/**
 * Base class for game type strategies
 *
 * Enables support for multiple golf scoring formats with different rules:
 * - Stroke Play: Total shots determine winner (currently implemented)
 * - Stableford: Points awarded per hole based on score (planned)
 * - Scramble: Team format, best shot selected (planned)
 * - Skins: Winner-take-all per hole (planned)
 * - Match Play: Hole-by-hole competition vs opponent (planned)
 *
 * Each game type extends this class and implements:
 * - validateSettings(): Check game-specific configuration during game creation
 * - calculateResults(): Apply scoring rules for leaderboard calculation
 * - validateScore(): Enforce game-specific constraints on score entry
 * - getDefaultSettings(): Provide default configuration for the game type
 *
 * See docs/backend/game-types.md for complete architecture documentation,
 * frontend extension points, and implementation examples.
 */
export abstract class GameTypeStrategy {
  abstract readonly typeName: string;
  abstract readonly displayName: string;

  constructor(protected db: Database) {}

  /**
   * Validate game-specific settings during game creation
   * @throws Error if settings are invalid
   */
  abstract validateSettings(settings: Record<string, any>): void;

  /**
   * Calculate leaderboard results using game-specific rules
   *
   * @param scores - Map of member_id to 18-hole score array
   * @param handicaps - Map of member_id to handicap_index
   * @param context - Game context (pars, stroke index, scoring mode, etc.)
   * @returns Array of results sorted by position
   */
  abstract calculateResults(
    scores: Map<number, number[]>,
    handicaps: Map<number, number>,
    context: GameLeaderboardContext
  ): GameScoreResult[];

  /**
   * Validate a score entry (e.g., stableford max score per hole)
   *
   * Default implementation: Allow any positive score or -1 (gave up) or 0 (cleared)
   * Override for game-specific validation.
   */
  validateScore(hole: number, shots: number, par: number): void {
    // Default: Allow UNREPORTED_HOLE (-1), 0 (clear), or positive scores
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error("Invalid score value");
    }
  }

  /**
   * Get default settings for this game type
   * Override to provide game-specific defaults
   */
  getDefaultSettings(): Record<string, any> {
    return {};
  }
}
