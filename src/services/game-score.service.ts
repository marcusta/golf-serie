import { Database } from "bun:sqlite";
import type { GameScore, GameScoreWithDetails, GameLeaderboardEntry } from "../types";
import { gameTypeRegistry } from "./game-strategies/registry";
import type { GameLeaderboardContext } from "./game-strategies/base";
import { safeParseJsonWithDefault } from "../utils/parsing";
import { GOLF } from "../constants/golf";
import { calculateCourseHandicap, distributeHandicapStrokes } from "../utils/handicap";
import { calculateHolesPlayed } from "../utils/golf-scoring";

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface GameScoreRow {
  id: number;
  game_group_member_id: number;
  score: string; // JSON string
  handicap_index: number | null;
  is_locked: number; // SQLite boolean
  locked_at: string | null;
  custom_data: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

interface GameScoreWithDetailsRow extends GameScoreRow {
  member_name: string;
  game_player_id: number;
  player_id: number | null;
  guest_name: string | null;
  handicap_index_from_player: number | null;
  start_hole: number;
  tee_id: number | null;
  guest_gender: string | null;
  course_rating: number | null;
  slope_rating: number | null;
  stroke_index: string | null; // JSON string from tee or course
  pars: string; // JSON string from course
}

interface PlayerTeeRatingRow {
  game_group_member_id: number;
  tee_id: number | null;
  gender: string; // 'male' or 'female'
  course_rating: number | null;
  slope_rating: number | null;
}

interface GameContextRow {
  game_id: number;
  game_type: string;
  scoring_mode: string;
  pars: string; // JSON string
  stroke_index: string | null; // JSON string
  course_rating: number;
  slope_rating: number;
}

export class GameScoreService {
  constructor(private db: Database) {}

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validateHoleNumber(hole: number): void {
    if (hole < 1 || hole > GOLF.HOLES_PER_ROUND) {
      throw new Error(`Hole number must be between 1 and ${GOLF.HOLES_PER_ROUND}`);
    }
  }

  private validateShotsValue(shots: number): void {
    // Allow UNREPORTED_HOLE (-1 gave up), 0 (clear score), or positive
    if (shots !== GOLF.UNREPORTED_HOLE && shots !== 0 && shots < 1) {
      throw new Error(
        "Shots must be greater than 0, or -1 (gave up), or 0 (clear score)"
      );
    }
  }

  // ============================================================================
  // Query Methods (private, single SQL)
  // ============================================================================

  private findGameScoreRow(memberId: number): GameScoreRow | null {
    const stmt = this.db.prepare(
      "SELECT * FROM game_scores WHERE game_group_member_id = ?"
    );
    return stmt.get(memberId) as GameScoreRow | null;
  }

  private findScoresForGroupRows(groupId: number): GameScoreWithDetailsRow[] {
    const stmt = this.db.prepare(`
      SELECT
        gs.*,
        COALESCE(pp.display_name, p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        p.handicap as handicap_index_from_player,
        gg.start_hole,
        gp.tee_id,
        gp.guest_gender,
        ctr.course_rating,
        ctr.slope_rating,
        COALESCE(ct.stroke_index, c.stroke_index) as stroke_index,
        c.pars
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      JOIN games g ON g.id = gg.game_id
      JOIN courses c ON c.id = g.course_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      LEFT JOIN course_tees ct ON ct.id = gp.tee_id
      LEFT JOIN course_tee_ratings ctr ON ctr.tee_id = gp.tee_id
        AND ctr.gender = CASE
          WHEN p.gender = 'female' THEN 'women'
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END
      WHERE ggm.game_group_id = ?
      ORDER BY ggm.tee_order
    `);
    return stmt.all(groupId) as GameScoreWithDetailsRow[];
  }

  private findAllScoresForGameRows(gameId: number): GameScoreWithDetailsRow[] {
    const stmt = this.db.prepare(`
      SELECT
        gs.*,
        COALESCE(pp.display_name, p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        gp.tee_id,
        gp.guest_gender,
        p.handicap as handicap_index_from_player,
        gg.start_hole
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      WHERE gg.game_id = ?
    `);
    return stmt.all(gameId) as GameScoreWithDetailsRow[];
  }

  private findGameContextRow(gameId: number): GameContextRow | null {
    const stmt = this.db.prepare(`
      SELECT
        g.id as game_id,
        g.game_type,
        g.scoring_mode,
        c.pars,
        c.stroke_index,
        113 as slope_rating,
        72 as course_rating
      FROM games g
      JOIN courses c ON c.id = g.course_id
      WHERE g.id = ?
    `);
    return stmt.get(gameId) as GameContextRow | null;
  }

  private findPlayerTeeRatingsForGameRows(gameId: number): PlayerTeeRatingRow[] {
    const stmt = this.db.prepare(`
      SELECT
        ggm.id as game_group_member_id,
        gp.tee_id,
        CASE
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END as gender,
        ctr.course_rating,
        ctr.slope_rating
      FROM game_group_members ggm
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      LEFT JOIN course_tee_ratings ctr ON ctr.tee_id = gp.tee_id
        AND ctr.gender = CASE
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END
      WHERE gg.game_id = ?
    `);
    return stmt.all(gameId) as PlayerTeeRatingRow[];
  }

  private insertGameScoreRow(memberId: number): GameScoreRow {
    const stmt = this.db.prepare(`
      INSERT INTO game_scores (game_group_member_id, score)
      VALUES (?, '[]')
      RETURNING *
    `);
    return stmt.get(memberId) as GameScoreRow;
  }

  private updateScoreArrayRow(memberId: number, scoreJson: string): void {
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_group_member_id = ?
    `);
    stmt.run(scoreJson, memberId);
  }

  private updateHandicapSnapshotRow(memberId: number, handicapIndex: number): void {
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET handicap_index = ?
      WHERE game_group_member_id = ?
    `);
    stmt.run(handicapIndex, memberId);
  }

  private updateLockStatusRow(memberId: number, isLocked: boolean): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET is_locked = ?, locked_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_group_member_id = ?
    `);
    stmt.run(isLocked ? 1 : 0, isLocked ? now : null, memberId);
  }

  private findGroupMemberExists(memberId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM game_group_members WHERE id = ?");
    return stmt.get(memberId) !== null;
  }

  private findPlayerIdForMember(memberId: number): number | null {
    const stmt = this.db.prepare(`
      SELECT gp.player_id
      FROM game_group_members ggm
      JOIN game_players gp ON gp.id = ggm.game_player_id
      WHERE ggm.id = ?
    `);
    const result = stmt.get(memberId) as { player_id: number | null } | null;
    return result?.player_id ?? null;
  }

  private findPlayerHandicap(playerId: number): number | null {
    const stmt = this.db.prepare("SELECT handicap FROM players WHERE id = ?");
    const result = stmt.get(playerId) as { handicap: number } | null;
    return result?.handicap ?? null;
  }

  // ============================================================================
  // Logic Methods (private, no SQL)
  // ============================================================================

  private transformGameScoreRow(row: GameScoreRow): GameScore {
    return {
      ...row,
      score: this.parseScoreJson(row.score),
      is_locked: Boolean(row.is_locked),
      locked_at: row.locked_at ?? undefined,
      handicap_index: row.handicap_index ?? undefined,
      custom_data: row.custom_data ? JSON.parse(row.custom_data) : undefined,
    };
  }

  private transformGameScoreWithDetailsRow(row: GameScoreWithDetailsRow): GameScoreWithDetails {
    const baseScore = this.transformGameScoreRow(row);

    // Calculate handicap data if all required fields are available
    let courseHandicap: number | null = null;
    let strokeIndex: number[] | null = null;
    let handicapStrokesPerHole: number[] | null = null;

    // Get handicap index (use snapshot if available, otherwise current)
    const handicapIndex = row.handicap_index ?? row.handicap_index_from_player;

    // Calculate handicap data if player has tee assignment and handicap
    if (row.tee_id && handicapIndex !== null && row.course_rating !== null && row.slope_rating !== null) {
      // Parse pars to get total par
      const pars = this.parseParsArray(row.pars);
      const totalPar = pars.reduce((sum, par) => sum + par, 0);

      // Parse stroke index (fallback to default if not available)
      strokeIndex = this.parseStrokeIndex(row.stroke_index);

      // Calculate course handicap
      courseHandicap = calculateCourseHandicap(
        handicapIndex,
        row.slope_rating,
        row.course_rating,
        totalPar
      );

      // Distribute strokes per hole
      handicapStrokesPerHole = distributeHandicapStrokes(courseHandicap, strokeIndex);
    }

    return {
      ...baseScore,
      member_name: row.member_name,
      game_player_id: row.game_player_id,
      player_id: row.player_id,
      guest_name: row.guest_name,
      course_handicap: courseHandicap,
      stroke_index: strokeIndex,
      handicap_strokes_per_hole: handicapStrokesPerHole,
      tee_id: row.tee_id,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
    };
  }

  private parseScoreJson(json: string | null): number[] {
    return safeParseJsonWithDefault<number[]>(json, []);
  }

  private parseParsArray(json: string): number[] {
    try {
      const parsed = JSON.parse(json);
      // Handle both flat array format [4,4,3,...] and object format {"holes": [4,4,3,...]}
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.holes)) {
        return parsed.holes;
      }
      throw new Error("Invalid pars format");
    } catch (e) {
      throw new Error(`Failed to parse pars: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  private parseStrokeIndex(json: string | null): number[] {
    if (!json) {
      // Return default stroke index if not available
      return Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1);
    }
    return safeParseJsonWithDefault<number[]>(json, Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1));
  }

  private buildPlayerTeeRatingsMap(
    rows: PlayerTeeRatingRow[],
    totalPar: number
  ): Map<number, import("./game-strategies/base").PlayerTeeRating> {
    const ratingsMap = new Map();

    for (const row of rows) {
      // Skip if player has no tee assigned or no ratings available
      if (!row.tee_id || row.course_rating === null || row.slope_rating === null) {
        continue;
      }

      ratingsMap.set(row.game_group_member_id, {
        courseRating: row.course_rating,
        slopeRating: row.slope_rating,
        par: totalPar,
      });
    }

    return ratingsMap;
  }

  // ============================================================================
  // Public API Methods (orchestration)
  // ============================================================================

  /**
   * Update a single hole score
   */
  updateScore(memberId: number, hole: number, shots: number): GameScore {
    this.validateHoleNumber(hole);
    this.validateShotsValue(shots);

    if (!this.findGroupMemberExists(memberId)) {
      throw new Error(`Group member ${memberId} not found`);
    }

    // Get or create score record
    let scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      scoreRow = this.insertGameScoreRow(memberId);
    }

    // Check if locked
    if (scoreRow.is_locked) {
      throw new Error("Cannot update a locked scorecard");
    }

    // Parse current scores
    const scores = this.parseScoreJson(scoreRow.score);

    // Ensure array has 18 elements
    while (scores.length < GOLF.HOLES_PER_ROUND) {
      scores.push(0);
    }

    // Check if this is the first actual score entry
    const isFirstScore = scores.every((s) => s === 0);
    const hasActualScore = shots > 0 || shots === GOLF.UNREPORTED_HOLE;

    // Update the score for this hole
    scores[hole - 1] = shots;

    // Save updated scores
    this.updateScoreArrayRow(memberId, JSON.stringify(scores));

    // Capture handicap snapshot if this is first score and player is registered
    if (isFirstScore && hasActualScore) {
      this.captureHandicapSnapshot(memberId);
    }

    // Return updated score
    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated!);
  }

  /**
   * Lock a scorecard (finalize)
   */
  lockScore(memberId: number): GameScore {
    const scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      throw new Error(`Score for member ${memberId} not found`);
    }

    if (scoreRow.is_locked) {
      throw new Error("Scorecard is already locked");
    }

    this.updateLockStatusRow(memberId, true);

    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated!);
  }

  /**
   * Unlock a scorecard (reopen for editing)
   */
  unlockScore(memberId: number): GameScore {
    const scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      throw new Error(`Score for member ${memberId} not found`);
    }

    if (!scoreRow.is_locked) {
      throw new Error("Scorecard is not locked");
    }

    this.updateLockStatusRow(memberId, false);

    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated!);
  }

  /**
   * Get all scores for a group
   */
  findScoresForGroup(groupId: number): GameScore[] {
    const rows = this.findScoresForGroupRows(groupId);
    return rows.map((row) => this.transformGameScoreRow(row));
  }

  /**
   * Get all scores for a group with enriched player details
   */
  findScoresForGroupWithDetails(groupId: number): GameScoreWithDetails[] {
    const rows = this.findScoresForGroupRows(groupId);
    return rows.map((row) => this.transformGameScoreWithDetailsRow(row));
  }

  /**
   * Calculate leaderboard for a game using game type strategy
   */
  getLeaderboard(gameId: number): GameLeaderboardEntry[] {
    // Get game context
    const contextRow = this.findGameContextRow(gameId);
    if (!contextRow) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Parse pars and stroke index
    const pars = this.parseParsArray(contextRow.pars);
    const strokeIndex = this.parseStrokeIndex(contextRow.stroke_index);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    // Get all scores for the game
    const scoreRows = this.findAllScoresForGameRows(gameId);

    // Build scores map (member_id -> score array)
    const scores = new Map<number, number[]>();
    const handicaps = new Map<number, number>();
    const memberNames = new Map<number, string>();
    const memberPlayerIds = new Map<number, number>();
    const isLockedMap = new Map<number, boolean>();
    const startHoles = new Map<number, number>();

    for (const row of scoreRows) {
      const scoreArray = this.parseScoreJson(row.score);
      scores.set(row.game_group_member_id, scoreArray);
      memberNames.set(row.game_group_member_id, row.member_name);
      memberPlayerIds.set(row.game_group_member_id, row.game_player_id);
      isLockedMap.set(row.game_group_member_id, Boolean(row.is_locked));
      startHoles.set(row.game_group_member_id, row.start_hole);

      // Use handicap snapshot if available, otherwise use current
      if (row.handicap_index !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index);
      } else if (row.handicap_index_from_player !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index_from_player);
      }
    }

    // Fetch tee ratings for all players
    const teeRatingRows = this.findPlayerTeeRatingsForGameRows(gameId);
    const playerTeeRatings = this.buildPlayerTeeRatingsMap(teeRatingRows, totalPar);

    // Get strategy and calculate results
    const strategy = gameTypeRegistry.get(contextRow.game_type, this.db);

    const context: GameLeaderboardContext = {
      gameId,
      pars,
      strokeIndex,
      scoringMode: contextRow.scoring_mode as any,
      playerTeeRatings,
    };

    const results = strategy.calculateResults(scores, handicaps, context);

    // Transform to leaderboard entries
    return results.map((result) => ({
      memberName: memberNames.get(result.memberId) ?? "Unknown",
      gamePlayerId: memberPlayerIds.get(result.memberId) ?? 0,
      grossTotal: result.grossTotal,
      netTotal: result.netTotal,
      relativeToPar: result.relativeToPar,
      netRelativeToPar: result.netRelativeToPar,
      holesPlayed: result.holesPlayed,
      position: result.position,
      isLocked: isLockedMap.get(result.memberId) ?? false,
      startHole: startHoles.get(result.memberId) ?? 1,
      customData: result.customDisplayData,
    }));
  }

  /**
   * Capture handicap snapshot for a player when they enter their first score
   * (private but called from updateScore)
   */
  private captureHandicapSnapshot(memberId: number): void {
    const playerId = this.findPlayerIdForMember(memberId);
    if (!playerId) {
      // Guest player, no handicap to capture
      return;
    }

    const handicap = this.findPlayerHandicap(playerId);
    if (handicap !== null) {
      this.updateHandicapSnapshotRow(memberId, handicap);
    }
  }

  // ============================================================================
  // Score Check Methods (public, for delete/leave operations)
  // ============================================================================

  /**
   * Check if any player in a game has entered any scores (non-zero values)
   * Returns true if ANY game_score for this game has at least one non-zero score
   */
  gameHasAnyScores(gameId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT gs.score
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      WHERE gg.game_id = ?
    `);
    const rows = stmt.all(gameId) as Array<{ score: string }>;

    for (const row of rows) {
      const scores = this.parseScoreJson(row.score);
      if (scores.some((s) => s > 0 || s === GOLF.UNREPORTED_HOLE)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific game_player has any non-zero scores
   * Checks game_scores for any game_group_member linked to this game_player
   */
  playerHasScores(gamePlayerId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT gs.score
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      WHERE ggm.game_player_id = ?
    `);
    const rows = stmt.all(gamePlayerId) as Array<{ score: string }>;

    for (const row of rows) {
      const scores = this.parseScoreJson(row.score);
      if (scores.some((s) => s > 0 || s === GOLF.UNREPORTED_HOLE)) {
        return true;
      }
    }
    return false;
  }
}
