import { Database } from "bun:sqlite";
import type {
  Game,
  GamePlayer,
  CreateGameDto,
  UpdateGameDto,
  AddGamePlayerDto,
  GameWithDetails,
  GameForDashboard,
  GameStatus,
} from "../types";
import { gameTypeRegistry } from "./game-strategies/registry";
import { getPlayerDisplayName } from "../utils/player-display";
import { GameScoreService } from "./game-score.service";

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface GameRow {
  id: number;
  owner_id: number;
  course_id: number;
  name: string | null;
  game_type: string;
  scoring_mode: string;
  status: string;
  custom_settings: string | null; // JSON string
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GamePlayerRow {
  id: number;
  game_id: number;
  player_id: number | null;
  guest_name: string | null;
  guest_handicap: number | null;
  guest_gender: string | null;
  tee_id: number | null;
  display_order: number;
  is_owner: number; // SQLite boolean
  created_at: string;
  updated_at: string;
}

interface GameWithDetailsRow extends GameRow {
  course_name: string;
  owner_name: string;
  player_count: number;
  group_count: number;
}

export class GameService {
  private gameScoreService: GameScoreService;

  constructor(private db: Database) {
    this.gameScoreService = new GameScoreService(db);
  }

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validateGameType(gameType: string): void {
    if (!gameTypeRegistry.has(gameType)) {
      throw new Error(
        `Invalid game type: ${gameType}. Available: ${gameTypeRegistry.listAvailable().join(", ")}`
      );
    }
  }

  private validateScoringMode(scoringMode: string): void {
    const validModes = ["gross", "net", "both"];
    if (!validModes.includes(scoringMode)) {
      throw new Error(
        `Invalid scoring mode: ${scoringMode}. Must be one of: ${validModes.join(", ")}`
      );
    }
  }

  private validateGameStatus(status: string): void {
    const validStatuses = ["setup", "ready", "active", "completed"];
    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid game status: ${status}. Must be one of: ${validStatuses.join(", ")}`
      );
    }
  }

  private validatePlayerData(data: AddGamePlayerDto): void {
    // Must have either player_id OR guest_name (XOR)
    const hasPlayerId = data.player_id !== undefined && data.player_id !== null;
    const hasGuestName = data.guest_name !== undefined && data.guest_name !== null;

    if (hasPlayerId && hasGuestName) {
      throw new Error("Cannot specify both player_id and guest_name");
    }

    if (!hasPlayerId && !hasGuestName) {
      throw new Error("Must specify either player_id or guest_name");
    }

    if (hasGuestName && !data.guest_name?.trim()) {
      throw new Error("Guest name cannot be empty");
    }
  }

  private validateGameStatusForModification(status: GameStatus): void {
    if (status !== "setup") {
      throw new Error("Game cannot be modified after it has started");
    }
  }

  // ============================================================================
  // Query Methods (private, single SQL)
  // ============================================================================

  private findGameRow(gameId: number): GameRow | null {
    const stmt = this.db.prepare("SELECT * FROM games WHERE id = ?");
    return stmt.get(gameId) as GameRow | null;
  }

  private findGameWithDetailsRow(gameId: number): GameWithDetailsRow | null {
    const stmt = this.db.prepare(`
      SELECT
        g.*,
        c.name as course_name,
        u.email as owner_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
        (SELECT COUNT(*) FROM game_groups WHERE game_id = g.id) as group_count
      FROM games g
      JOIN courses c ON c.id = g.course_id
      JOIN users u ON u.id = g.owner_id
      WHERE g.id = ?
    `);
    return stmt.get(gameId) as GameWithDetailsRow | null;
  }

  private findMyGamesRows(userId: number): GameWithDetailsRow[] {
    const stmt = this.db.prepare(`
      SELECT
        g.*,
        c.name as course_name,
        u.email as owner_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
        (SELECT COUNT(*) FROM game_groups WHERE game_id = g.id) as group_count
      FROM games g
      JOIN courses c ON c.id = g.course_id
      JOIN users u ON u.id = g.owner_id
      WHERE g.owner_id = ? OR g.id IN (
        SELECT game_id FROM game_players WHERE player_id = (
          SELECT id FROM players WHERE user_id = ?
        )
      )
      ORDER BY g.created_at DESC
    `);
    return stmt.all(userId, userId) as GameWithDetailsRow[];
  }

  private insertGameRow(
    ownerId: number,
    courseId: number,
    name: string | null,
    gameType: string,
    scoringMode: string,
    customSettings: string | null,
    scheduledDate: string | null
  ): GameRow {
    const stmt = this.db.prepare(`
      INSERT INTO games (owner_id, course_id, name, game_type, scoring_mode, custom_settings, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      ownerId,
      courseId,
      name,
      gameType,
      scoringMode,
      customSettings,
      scheduledDate
    ) as GameRow;
  }

  private updateGameStatusRow(gameId: number, status: string): void {
    const now = new Date().toISOString();
    const timestampField = status === "active" ? "started_at" : status === "completed" ? "completed_at" : null;

    if (timestampField) {
      const stmt = this.db.prepare(`
        UPDATE games
        SET status = ?, ${timestampField} = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(status, now, gameId);
    } else {
      const stmt = this.db.prepare(`
        UPDATE games
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(status, gameId);
    }
  }

  private deleteGameRow(gameId: number): void {
    const stmt = this.db.prepare("DELETE FROM games WHERE id = ?");
    stmt.run(gameId);
  }

  private updateGameCourseRow(gameId: number, courseId: number): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET course_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(courseId, gameId);
  }

  private updateGameTypeRow(gameId: number, gameType: string): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET game_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(gameType, gameId);
  }

  private updateGameScoringModeRow(gameId: number, scoringMode: string): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET scoring_mode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(scoringMode, gameId);
  }

  private updateGameCustomSettingsRow(gameId: number, customSettings: string | null): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET custom_settings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(customSettings, gameId);
  }

  private updateGameScheduledDateRow(gameId: number, scheduledDate: string | null): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(scheduledDate, gameId);
  }

  private updateGameNameRow(gameId: number, name: string | null): void {
    const stmt = this.db.prepare(`
      UPDATE games
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, gameId);
  }

  private insertGamePlayerRow(
    gameId: number,
    playerId: number | null,
    guestName: string | null,
    guestHandicap: number | null,
    guestGender: string | null,
    teeId: number | null,
    displayOrder: number,
    isOwner: boolean
  ): GamePlayerRow {
    const stmt = this.db.prepare(`
      INSERT INTO game_players (
        game_id, player_id, guest_name, guest_handicap, guest_gender, tee_id, display_order, is_owner
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      gameId,
      playerId,
      guestName,
      guestHandicap,
      guestGender,
      teeId,
      displayOrder,
      isOwner ? 1 : 0
    ) as GamePlayerRow;
  }

  private findGamePlayerRow(gamePlayerId: number): GamePlayerRow | null {
    const stmt = this.db.prepare("SELECT * FROM game_players WHERE id = ?");
    return stmt.get(gamePlayerId) as GamePlayerRow | null;
  }

  private findGamePlayersRows(gameId: number): GamePlayerRow[] {
    const stmt = this.db.prepare(
      "SELECT * FROM game_players WHERE game_id = ? ORDER BY display_order"
    );
    return stmt.all(gameId) as GamePlayerRow[];
  }

  private findGamePlayersWithNamesRows(gameId: number): Array<
    GamePlayerRow & {
      player_name?: string;
      player_display_name?: string;
      player_handicap?: number;
      player_gender?: string;
      course_pars?: string;
      tee_course_rating?: number;
      tee_slope_rating?: number;
    }
  > {
    const stmt = this.db.prepare(`
      SELECT
        gp.*,
        p.name as player_name,
        pp.display_name as player_display_name,
        p.handicap as player_handicap,
        p.gender as player_gender,
        c.pars as course_pars,
        ctr.course_rating as tee_course_rating,
        ctr.slope_rating as tee_slope_rating
      FROM game_players gp
      LEFT JOIN players p ON gp.player_id = p.id
      LEFT JOIN player_profiles pp ON p.id = pp.player_id
      LEFT JOIN games g ON gp.game_id = g.id
      LEFT JOIN courses c ON g.course_id = c.id
      LEFT JOIN course_tee_ratings ctr ON gp.tee_id = ctr.tee_id
        AND ctr.gender = CASE
          WHEN gp.player_id IS NOT NULL THEN
            CASE p.gender
              WHEN 'male' THEN 'men'
              WHEN 'female' THEN 'women'
              ELSE NULL
            END
          ELSE
            CASE gp.guest_gender
              WHEN 'male' THEN 'men'
              WHEN 'female' THEN 'women'
              ELSE NULL
            END
        END
      WHERE gp.game_id = ?
      ORDER BY gp.display_order
    `);
    return stmt.all(gameId) as Array<
      GamePlayerRow & {
        player_name?: string;
        player_display_name?: string;
        player_handicap?: number;
        player_gender?: string;
        course_pars?: string;
        tee_course_rating?: number;
        tee_slope_rating?: number;
      }
    >;
  }

  private deleteGamePlayerRow(gamePlayerId: number): void {
    const stmt = this.db.prepare("DELETE FROM game_players WHERE id = ?");
    stmt.run(gamePlayerId);
  }

  private updateGamePlayerTeeRow(gamePlayerId: number, teeId: number): void {
    const stmt = this.db.prepare(`
      UPDATE game_players
      SET tee_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(teeId, gamePlayerId);
  }

  private getNextPlayerDisplayOrder(gameId: number): number {
    const stmt = this.db.prepare(
      "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM game_players WHERE game_id = ?"
    );
    const result = stmt.get(gameId) as { next_order: number };
    return result.next_order;
  }

  private findCourseExists(courseId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM courses WHERE id = ?");
    return stmt.get(courseId) !== null;
  }

  private findPlayerExists(playerId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM players WHERE id = ?");
    return stmt.get(playerId) !== null;
  }

  private findTeeExists(teeId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM course_tees WHERE id = ?");
    return stmt.get(teeId) !== null;
  }

  private findGamePlayerByPlayerId(gameId: number, playerId: number): GamePlayerRow | null {
    const stmt = this.db.prepare(
      "SELECT * FROM game_players WHERE game_id = ? AND player_id = ?"
    );
    return stmt.get(gameId, playerId) as GamePlayerRow | null;
  }

  private findOwnerGamePlayer(gameId: number): GamePlayerRow | null {
    const stmt = this.db.prepare(
      "SELECT * FROM game_players WHERE game_id = ? AND is_owner = 1"
    );
    return stmt.get(gameId) as GamePlayerRow | null;
  }

  private findPlayerIdByUserId(userId: number): number | null {
    const stmt = this.db.prepare("SELECT id FROM players WHERE user_id = ?");
    const result = stmt.get(userId) as { id: number } | null;
    return result?.id ?? null;
  }

  // ============================================================================
  // Logic Methods (private, no SQL)
  // ============================================================================

  private transformGameRow(row: GameRow): Game {
    return {
      ...row,
      name: row.name ?? undefined,
      custom_settings: row.custom_settings ? JSON.parse(row.custom_settings) : undefined,
      scheduled_date: row.scheduled_date ?? undefined,
      started_at: row.started_at ?? undefined,
      completed_at: row.completed_at ?? undefined,
    } as Game;
  }

  private transformGamePlayerRow(
    row: GamePlayerRow & {
      player_name?: string;
      player_display_name?: string;
      player_handicap?: number;
      player_gender?: string;
      course_pars?: string;
      tee_course_rating?: number;
      tee_slope_rating?: number;
    }
  ): GamePlayer {
    // Calculate play handicap (PHCP)
    let play_handicap: number | undefined = undefined;

    const handicapIndex = row.player_id ? row.player_handicap : row.guest_handicap;
    const courseRating = row.tee_course_rating;
    const slopeRating = row.tee_slope_rating;
    const pars = row.course_pars ? JSON.parse(row.course_pars) : [];
    const coursePar = pars.reduce((sum: number, par: number) => sum + par, 0);

    if (
      handicapIndex != null &&
      courseRating != null &&
      slopeRating != null &&
      coursePar > 0
    ) {
      // PHCP = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
      play_handicap = Math.round(
        handicapIndex * (slopeRating / 113) + (courseRating - coursePar)
      );
    }

    return {
      ...row,
      player_id: row.player_id ?? undefined,
      player_name: row.player_name ?? undefined,
      player_display_name: row.player_display_name ?? undefined,
      guest_name: row.guest_name ?? undefined,
      guest_handicap: row.guest_handicap ?? undefined,
      guest_gender: (row.guest_gender as "male" | "female" | null) ?? undefined,
      tee_id: row.tee_id ?? undefined,
      play_handicap,
      is_owner: Boolean(row.is_owner),
    };
  }

  private transformGameWithDetailsRow(row: GameWithDetailsRow): GameWithDetails {
    return {
      ...this.transformGameRow(row),
      course_name: row.course_name,
      owner_name: row.owner_name,
      player_count: row.player_count,
      group_count: row.group_count,
    };
  }

  // ============================================================================
  // Public API Methods (orchestration)
  // ============================================================================

  /**
   * Create a new casual game
   */
  createGame(ownerId: number, data: CreateGameDto): Game {
    const gameType = data.game_type ?? "stroke_play";
    const scoringMode = data.scoring_mode ?? "gross";

    // Validate before starting transaction
    this.validateGameType(gameType);
    this.validateScoringMode(scoringMode);

    if (!this.findCourseExists(data.course_id)) {
      throw new Error(`Course with id ${data.course_id} not found`);
    }

    // Validate custom settings with strategy
    if (data.custom_settings) {
      const strategy = gameTypeRegistry.get(gameType, this.db);
      strategy.validateSettings(data.custom_settings);
    }

    const customSettingsJson = data.custom_settings
      ? JSON.stringify(data.custom_settings)
      : null;

    return this.db.transaction(() => {
      const row = this.insertGameRow(
        ownerId,
        data.course_id,
        data.name ?? null,
        gameType,
        scoringMode,
        customSettingsJson,
        data.scheduled_date ?? null
      );

      // Automatically add the owner as a player
      this.insertGamePlayerRow(
        row.id,
        ownerId, // player_id (owner is a registered player)
        null,    // guest_name (not a guest)
        null,    // guest_handicap (not a guest)
        null,    // guest_gender (not a guest)
        null,    // tee_id (will be assigned later)
        1,       // display_order (first player)
        true     // is_owner
      );

      return this.transformGameRow(row);
    })();
  }

  /**
   * Get game by ID
   */
  findById(gameId: number): Game | null {
    const row = this.findGameRow(gameId);
    return row ? this.transformGameRow(row) : null;
  }

  /**
   * Get game with details (course name, owner name, counts)
   */
  findByIdWithDetails(gameId: number): GameWithDetails | null {
    const row = this.findGameWithDetailsRow(gameId);
    return row ? this.transformGameWithDetailsRow(row) : null;
  }

  /**
   * Find all games where user is owner or player
   */
  findMyGames(userId: number): GameWithDetails[] {
    const rows = this.findMyGamesRows(userId);
    return rows.map((row) => this.transformGameWithDetailsRow(row));
  }

  /**
   * Update game details with field-specific restrictions:
   * - name: can change at ANY status
   * - game_type: can change only if no scores entered
   * - course_id, scoring_mode, custom_settings, scheduled_date: setup status only
   */
  updateGame(gameId: number, data: UpdateGameDto, userId: number): Game {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can update the game");
    }

    const isSetupStatus = game.status === "setup";
    const hasScores = this.gameScoreService.gameHasAnyScores(gameId);

    // name: can always change
    if (data.name !== undefined) {
      this.updateGameNameRow(gameId, data.name);
    }

    // game_type: can change only if no scores entered
    if (data.game_type !== undefined) {
      if (hasScores) {
        throw new Error("Cannot change game type after scores entered");
      }
      this.validateGameType(data.game_type);
      this.updateGameTypeRow(gameId, data.game_type);
    }

    // course_id: setup status only
    if (data.course_id !== undefined) {
      if (!isSetupStatus) {
        throw new Error("Cannot change course after game has started");
      }
      if (!this.findCourseExists(data.course_id)) {
        throw new Error(`Course ${data.course_id} not found`);
      }
      this.updateGameCourseRow(gameId, data.course_id);
    }

    // scoring_mode: setup status only
    if (data.scoring_mode !== undefined) {
      if (!isSetupStatus) {
        throw new Error("Cannot change scoring mode after game has started");
      }
      this.validateScoringMode(data.scoring_mode);
      this.updateGameScoringModeRow(gameId, data.scoring_mode);
    }

    // custom_settings: setup status only
    if (data.custom_settings !== undefined) {
      if (!isSetupStatus) {
        throw new Error("Cannot change custom settings after game has started");
      }
      const gameType = data.game_type || game.game_type;
      const strategy = gameTypeRegistry.get(gameType, this.db);
      strategy.validateSettings(data.custom_settings);
      const customSettingsJson = JSON.stringify(data.custom_settings);
      this.updateGameCustomSettingsRow(gameId, customSettingsJson);
    }

    // scheduled_date: setup status only
    if (data.scheduled_date !== undefined) {
      if (!isSetupStatus) {
        throw new Error("Cannot change scheduled date after game has started");
      }
      this.updateGameScheduledDateRow(gameId, data.scheduled_date);
    }

    const updated = this.findGameRow(gameId);
    return this.transformGameRow(updated!);
  }

  /**
   * Update game status
   */
  updateGameStatus(gameId: number, status: GameStatus, userId: number): Game {
    this.validateGameStatus(status);

    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can update game status");
    }

    this.updateGameStatusRow(gameId, status);

    const updated = this.findGameRow(gameId);
    return this.transformGameRow(updated!);
  }

  /**
   * Delete a game (only if no scores have been entered)
   */
  deleteGame(gameId: number, userId: number): void {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can delete the game");
    }

    if (this.gameScoreService.gameHasAnyScores(gameId)) {
      throw new Error("Cannot delete game with scores. Use leave instead.");
    }

    this.deleteGameRow(gameId);
  }

  /**
   * Leave a game - removes the player, or deletes the game if owner and no scores
   * Returns { deleted: true } if the entire game was deleted, { deleted: false } if only the player was removed
   */
  leaveGame(gameId: number, userId: number): { deleted: boolean } {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Find the player record for this user
    const playerId = this.findPlayerIdByUserId(userId);
    if (!playerId) {
      throw new Error("User has no player profile");
    }

    const gamePlayer = this.findGamePlayerByPlayerId(gameId, playerId);
    if (!gamePlayer) {
      throw new Error("You are not a participant in this game");
    }

    // Check if user is the owner
    const isOwner = game.owner_id === userId;

    // If owner and game has no scores, delete the entire game
    if (isOwner && !this.gameScoreService.gameHasAnyScores(gameId)) {
      this.deleteGameRow(gameId);
      return { deleted: true };
    }

    // Otherwise, just remove this player (even if they have scores - they're leaving)
    // Note: we don't check for scores here because a player should be able to leave
    this.deleteGamePlayerRow(gamePlayer.id);
    return { deleted: false };
  }

  /**
   * Add a player to the game (registered or guest)
   * Can be done at any game status
   */
  addPlayer(gameId: number, data: AddGamePlayerDto, userId: number): GamePlayer {
    // Validate
    this.validatePlayerData(data);

    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can add players");
    }

    // Note: No status restriction - players can be added at any time

    // Validate player exists if player_id provided
    if (data.player_id && !this.findPlayerExists(data.player_id)) {
      throw new Error(`Player ${data.player_id} not found`);
    }

    // Validate tee exists if tee_id provided
    if (data.tee_id && !this.findTeeExists(data.tee_id)) {
      throw new Error(`Tee ${data.tee_id} not found`);
    }

    const displayOrder = this.getNextPlayerDisplayOrder(gameId);

    const row = this.insertGamePlayerRow(
      gameId,
      data.player_id ?? null,
      data.guest_name ?? null,
      data.guest_handicap ?? null,
      data.guest_gender ?? null,
      data.tee_id ?? null,
      displayOrder,
      false
    );

    return this.transformGamePlayerRow(row);
  }

  /**
   * Remove a player from the game
   * Can be done at any status, but not if the player has entered scores
   */
  removePlayer(gameId: number, gamePlayerId: number, userId: number): void {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can remove players");
    }

    // Note: No status restriction - players can be removed at any time

    const gamePlayer = this.findGamePlayerRow(gamePlayerId);
    if (!gamePlayer) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }

    if (gamePlayer.game_id !== gameId) {
      throw new Error("Player does not belong to this game");
    }

    // Check if player has entered any scores
    if (this.gameScoreService.playerHasScores(gamePlayerId)) {
      throw new Error("Cannot remove player with scores");
    }

    this.deleteGamePlayerRow(gamePlayerId);
  }

  /**
   * Assign a tee to a player
   */
  assignTee(gameId: number, gamePlayerId: number, teeId: number, userId: number): GamePlayer {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can assign tees");
    }

    if (!this.findTeeExists(teeId)) {
      throw new Error(`Tee ${teeId} not found`);
    }

    const gamePlayer = this.findGamePlayerRow(gamePlayerId);
    if (!gamePlayer) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }

    if (gamePlayer.game_id !== gameId) {
      throw new Error("Player does not belong to this game");
    }

    this.updateGamePlayerTeeRow(gamePlayerId, teeId);

    const updated = this.findGamePlayerRow(gamePlayerId);
    return this.transformGamePlayerRow(updated!);
  }

  /**
   * Get all players in a game (with player names from players table)
   */
  findGamePlayers(gameId: number): GamePlayer[] {
    const rows = this.findGamePlayersWithNamesRows(gameId);
    return rows.map((row) => this.transformGamePlayerRow(row));
  }

  /**
   * Check if user can modify the game (owner only)
   */
  canUserModifyGame(gameId: number, userId: number): boolean {
    const game = this.findGameRow(gameId);
    if (!game) return false;
    return game.owner_id === userId;
  }
}
