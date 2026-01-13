import { Database } from "bun:sqlite";
import type { GameScore, GameLeaderboardEntry } from "../types";
import { gameTypeRegistry } from "./game-strategies/registry";
import type { GameLeaderboardContext } from "./game-strategies/base";
import { safeParseJsonWithDefault } from "../utils/parsing";
import { GOLF } from "../constants/golf";

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
        COALESCE(p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        p.handicap as handicap_index_from_player
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      LEFT JOIN players p ON p.id = gp.player_id
      WHERE ggm.game_group_id = ?
      ORDER BY ggm.tee_order
    `);
    return stmt.all(groupId) as GameScoreWithDetailsRow[];
  }

  private findAllScoresForGameRows(gameId: number): GameScoreWithDetailsRow[] {
    const stmt = this.db.prepare(`
      SELECT
        gs.*,
        COALESCE(p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        p.handicap as handicap_index_from_player
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      LEFT JOIN players p ON p.id = gp.player_id
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

  private parseScoreJson(json: string | null): number[] {
    return safeParseJsonWithDefault<number[]>(json, []);
  }

  private parseParsArray(json: string): number[] {
    try {
      const parsed = JSON.parse(json);
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

  private calculateHolesPlayed(scores: number[]): number {
    return scores.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
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

    // Get all scores for the game
    const scoreRows = this.findAllScoresForGameRows(gameId);

    // Build scores map (member_id -> score array)
    const scores = new Map<number, number[]>();
    const handicaps = new Map<number, number>();
    const memberNames = new Map<number, string>();
    const memberPlayerIds = new Map<number, number>();
    const isLockedMap = new Map<number, boolean>();

    for (const row of scoreRows) {
      const scoreArray = this.parseScoreJson(row.score);
      scores.set(row.game_group_member_id, scoreArray);
      memberNames.set(row.game_group_member_id, row.member_name);
      memberPlayerIds.set(row.game_group_member_id, row.game_player_id);
      isLockedMap.set(row.game_group_member_id, Boolean(row.is_locked));

      // Use handicap snapshot if available, otherwise use current
      if (row.handicap_index !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index);
      } else if (row.handicap_index_from_player !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index_from_player);
      }
    }

    // Get strategy and calculate results
    const strategy = gameTypeRegistry.get(contextRow.game_type, this.db);

    const context: GameLeaderboardContext = {
      gameId,
      pars,
      strokeIndex,
      scoringMode: contextRow.scoring_mode as any,
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
}
