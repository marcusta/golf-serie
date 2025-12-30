import { Database } from "bun:sqlite";
import type {
  HandicapHistoryEntry,
  HandicapSource,
  HandicapWithHistory,
  PlayerProfile,
  PlayerProfileFull,
  PlayerRoundHistory,
  ProfileVisibility,
  RecordHandicapDto,
  UpdatePlayerProfileDto,
} from "../types";

interface PlayerProfileRow {
  player_id: number;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  home_course_id: number | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

interface HandicapHistoryRow {
  id: number;
  player_id: number;
  handicap_index: number;
  effective_date: string;
  source: string;
  notes: string | null;
  created_at: string;
}

interface PlayerRow {
  id: number;
  name: string;
  handicap: number;
  user_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface StatsRow {
  competitions_played: number;
  total_rounds: number;
  best_score: number | null;
  average_score: number | null;
}

interface RoundRow {
  participant_id: number;
  competition_id: number;
  competition_name: string;
  competition_date: string;
  course_id: number;
  course_name: string;
  total_score: number;
  par_total: number;
  holes_played: number;
}

export class PlayerProfileService {
  constructor(private db: Database) {}

  /**
   * Get profile for a player (basic profile data only)
   */
  getProfile(playerId: number): PlayerProfile | null {
    const row = this.db
      .prepare(
        `
        SELECT pp.*, c.name as home_course_name
        FROM player_profiles pp
        LEFT JOIN courses c ON pp.home_course_id = c.id
        WHERE pp.player_id = ?
      `
      )
      .get(playerId) as (PlayerProfileRow & { home_course_name: string | null }) | null;

    if (!row) {
      return null;
    }

    return this.parseProfileRow(row);
  }

  /**
   * Get or create profile for a player
   * Creates a default profile if one doesn't exist
   */
  getOrCreateProfile(playerId: number): PlayerProfile {
    const existing = this.getProfile(playerId);
    if (existing) {
      return existing;
    }

    // Verify player exists
    const player = this.db
      .prepare("SELECT id FROM players WHERE id = ?")
      .get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Create default profile
    this.db
      .prepare(
        `
        INSERT INTO player_profiles (player_id, visibility)
        VALUES (?, 'public')
      `
      )
      .run(playerId);

    return this.getProfile(playerId)!;
  }

  /**
   * Update player profile
   */
  updateProfile(playerId: number, data: UpdatePlayerProfileDto): PlayerProfile {
    // Ensure profile exists
    this.getOrCreateProfile(playerId);

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(data.display_name || null);
    }

    if (data.bio !== undefined) {
      updates.push("bio = ?");
      values.push(data.bio || null);
    }

    if (data.avatar_url !== undefined) {
      updates.push("avatar_url = ?");
      values.push(data.avatar_url || null);
    }

    if (data.home_course_id !== undefined) {
      // Validate course exists if provided
      if (data.home_course_id !== null) {
        const course = this.db
          .prepare("SELECT id FROM courses WHERE id = ?")
          .get(data.home_course_id);
        if (!course) {
          throw new Error("Course not found");
        }
      }
      updates.push("home_course_id = ?");
      values.push(data.home_course_id);
    }

    if (data.visibility !== undefined) {
      if (!["public", "friends", "private"].includes(data.visibility)) {
        throw new Error("Invalid visibility setting");
      }
      updates.push("visibility = ?");
      values.push(data.visibility);
    }

    if (updates.length === 0) {
      return this.getProfile(playerId)!;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(playerId);

    this.db
      .prepare(
        `
        UPDATE player_profiles
        SET ${updates.join(", ")}
        WHERE player_id = ?
      `
      )
      .run(...values);

    return this.getProfile(playerId)!;
  }

  /**
   * Get full profile with stats and handicap history
   */
  getFullProfile(playerId: number): PlayerProfileFull | null {
    // Get player base data
    const player = this.db
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(playerId) as PlayerRow | null;

    if (!player) {
      return null;
    }

    // Get or create profile
    const profile = this.getOrCreateProfile(playerId);

    // Get stats
    const stats = this.getPlayerStats(playerId);

    // Get handicap history
    const handicapHistory = this.getHandicapHistory(playerId, 10);

    return {
      // Player base
      id: player.id,
      name: player.name,
      handicap: player.handicap,
      user_id: player.user_id ?? undefined,

      // Profile extended
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      home_course_id: profile.home_course_id,
      home_course_name: profile.home_course_name,
      visibility: profile.visibility,

      // Stats
      competitions_played: stats.competitions_played,
      total_rounds: stats.total_rounds,
      best_score: stats.best_score ?? undefined,
      average_score: stats.average_score ?? undefined,

      // Handicap history
      handicap_history: handicapHistory,
    };
  }

  /**
   * Get public profile (respects visibility settings)
   */
  getPublicProfile(playerId: number, viewerId?: number): PlayerProfileFull | null {
    const fullProfile = this.getFullProfile(playerId);
    if (!fullProfile) {
      return null;
    }

    // Check visibility
    if (fullProfile.visibility === "private") {
      // Only the owner can see private profiles
      if (!viewerId || fullProfile.user_id !== viewerId) {
        return null;
      }
    }

    // For "friends" visibility, we'd check friend relationship here
    // For MVP, treat "friends" same as "public"
    if (fullProfile.visibility === "friends") {
      // TODO: Check friend relationship when friends feature is implemented
      // For now, allow access
    }

    return fullProfile;
  }

  /**
   * Get player stats from participants table
   */
  private getPlayerStats(playerId: number): StatsRow {
    try {
      const stats = this.db
        .prepare(
          `
          SELECT
            COUNT(DISTINCT p.competition_id) as competitions_played,
            COUNT(p.id) as total_rounds,
            MIN(p.total_score) as best_score,
            AVG(p.total_score) as average_score
          FROM participants p
          WHERE p.player_id = ? AND p.total_score IS NOT NULL
        `
        )
        .get(playerId) as StatsRow;

      return {
        competitions_played: stats?.competitions_played || 0,
        total_rounds: stats?.total_rounds || 0,
        best_score: stats?.best_score || null,
        average_score: stats?.average_score
          ? Math.round(stats.average_score * 10) / 10
          : null,
      };
    } catch {
      return {
        competitions_played: 0,
        total_rounds: 0,
        best_score: null,
        average_score: null,
      };
    }
  }

  /**
   * Get handicap history for a player
   */
  getHandicapHistory(playerId: number, limit?: number): HandicapHistoryEntry[] {
    const sql = `
      SELECT * FROM handicap_history
      WHERE player_id = ?
      ORDER BY effective_date DESC, created_at DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `;

    const rows = this.db.prepare(sql).all(playerId) as HandicapHistoryRow[];
    return rows.map((row) => this.parseHistoryRow(row));
  }

  /**
   * Get current handicap with history
   */
  getHandicapWithHistory(playerId: number): HandicapWithHistory | null {
    const player = this.db
      .prepare("SELECT handicap FROM players WHERE id = ?")
      .get(playerId) as { handicap: number } | null;

    if (!player) {
      return null;
    }

    const history = this.getHandicapHistory(playerId);

    return {
      current: player.handicap,
      history,
    };
  }

  /**
   * Record a new handicap entry
   * Updates both the history table and the current handicap in players
   */
  recordHandicap(playerId: number, data: RecordHandicapDto): HandicapHistoryEntry {
    // Verify player exists
    const player = this.db
      .prepare("SELECT id FROM players WHERE id = ?")
      .get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Validate handicap index
    if (data.handicap_index < -10 || data.handicap_index > 54) {
      throw new Error("Handicap index must be between -10 and 54");
    }

    // Default to today if no date provided
    const effectiveDate = data.effective_date || new Date().toISOString().split("T")[0];

    // Insert into history
    const historyEntry = this.db
      .prepare(
        `
        INSERT INTO handicap_history (player_id, handicap_index, effective_date, source, notes)
        VALUES (?, ?, ?, 'manual', ?)
        RETURNING *
      `
      )
      .get(playerId, data.handicap_index, effectiveDate, data.notes || null) as HandicapHistoryRow;

    // Update current handicap in players table
    this.db
      .prepare(
        `
        UPDATE players
        SET handicap = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      )
      .run(data.handicap_index, playerId);

    return this.parseHistoryRow(historyEntry);
  }

  /**
   * Get round history for a player
   */
  getRoundHistory(playerId: number, limit?: number, offset?: number): PlayerRoundHistory[] {
    const sql = `
      SELECT
        p.id as participant_id,
        c.id as competition_id,
        c.name as competition_name,
        c.date as competition_date,
        co.id as course_id,
        co.name as course_name,
        p.total_score,
        (SELECT SUM(value) FROM json_each(co.pars, '$.holes')) as par_total,
        (
          SELECT COUNT(*)
          FROM json_each(p.score)
          WHERE json_each.value > 0
        ) as holes_played
      FROM participants p
      JOIN tee_times tt ON p.tee_time_id = tt.id
      JOIN competitions c ON tt.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.player_id = ? AND p.total_score IS NOT NULL
      ORDER BY c.date DESC, c.id DESC
      ${limit ? `LIMIT ${limit}` : ""}
      ${offset ? `OFFSET ${offset}` : ""}
    `;

    const rows = this.db.prepare(sql).all(playerId) as RoundRow[];

    return rows.map((row) => ({
      participant_id: row.participant_id,
      competition_id: row.competition_id,
      competition_name: row.competition_name,
      competition_date: row.competition_date,
      course_id: row.course_id,
      course_name: row.course_name,
      gross_score: row.total_score,
      relative_to_par: row.total_score - (row.par_total || 72),
      holes_played: row.holes_played || 0,
    }));
  }

  /**
   * Parse a profile row from the database
   */
  private parseProfileRow(
    row: PlayerProfileRow & { home_course_name: string | null }
  ): PlayerProfile {
    return {
      player_id: row.player_id,
      display_name: row.display_name ?? undefined,
      bio: row.bio ?? undefined,
      avatar_url: row.avatar_url ?? undefined,
      home_course_id: row.home_course_id ?? undefined,
      home_course_name: row.home_course_name ?? undefined,
      visibility: row.visibility as ProfileVisibility,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Parse a handicap history row from the database
   */
  private parseHistoryRow(row: HandicapHistoryRow): HandicapHistoryEntry {
    return {
      id: row.id,
      player_id: row.player_id,
      handicap_index: row.handicap_index,
      effective_date: row.effective_date,
      source: row.source as HandicapSource,
      notes: row.notes ?? undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Check if two players are "friends" (enrolled in at least one common tour)
   * This determines whether one player can view another's profile
   */
  isFriend(viewerPlayerId: number, targetPlayerId: number): boolean {
    // Same player always has access
    if (viewerPlayerId === targetPlayerId) {
      return true;
    }

    // Check if both players are enrolled in at least one common tour (active status)
    const commonTour = this.db
      .prepare(
        `
        SELECT 1 FROM tour_enrollments e1
        JOIN tour_enrollments e2 ON e1.tour_id = e2.tour_id
        WHERE e1.player_id = ?
          AND e2.player_id = ?
          AND e1.status = 'active'
          AND e2.status = 'active'
        LIMIT 1
      `
      )
      .get(viewerPlayerId, targetPlayerId);

    return !!commonTour;
  }

  /**
   * Get the list of common tours between two players
   */
  getCommonTours(
    viewerPlayerId: number,
    targetPlayerId: number
  ): Array<{ id: number; name: string }> {
    const tours = this.db
      .prepare(
        `
        SELECT DISTINCT t.id, t.name
        FROM tours t
        JOIN tour_enrollments e1 ON t.id = e1.tour_id
        JOIN tour_enrollments e2 ON t.id = e2.tour_id
        WHERE e1.player_id = ?
          AND e2.player_id = ?
          AND e1.status = 'active'
          AND e2.status = 'active'
        ORDER BY t.name
      `
      )
      .all(viewerPlayerId, targetPlayerId) as Array<{ id: number; name: string }>;

    return tours;
  }
}

export function createPlayerProfileService(db: Database): PlayerProfileService {
  return new PlayerProfileService(db);
}
