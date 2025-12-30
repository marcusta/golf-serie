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
  TourEnrollmentStatus,
  UpdatePlayerProfileDto,
} from "../types";

// Types for tours and series info
export interface PlayerTourInfo {
  tour_id: number;
  tour_name: string;
  enrollment_status: TourEnrollmentStatus;
  category_name?: string;
  position?: number;
  total_points?: number;
  competitions_played: number;
}

export interface PlayerSeriesInfo {
  series_id: number;
  series_name: string;
  competitions_played: number;
  last_played_date: string;
}

export interface PlayerToursAndSeries {
  tours: PlayerTourInfo[];
  series: PlayerSeriesInfo[];
}

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
      // Calculate total score from manual_score_total or sum of score array
      const stats = this.db
        .prepare(
          `
          SELECT
            COUNT(DISTINCT tt.competition_id) as competitions_played,
            COUNT(p.id) as total_rounds,
            MIN(
              CASE
                WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
                WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
                  SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
                )
                ELSE NULL
              END
            ) as best_score,
            AVG(
              CASE
                WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
                WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
                  SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
                )
                ELSE NULL
              END
            ) as average_score
          FROM participants p
          JOIN tee_times tt ON p.tee_time_id = tt.id
          WHERE p.player_id = ?
            AND (
              p.manual_score_total IS NOT NULL
              OR (p.score IS NOT NULL AND p.score != '[]' AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE value > 0))
            )
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
    } catch (error) {
      console.error("Error getting player stats:", error);
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
        CASE
          WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
          WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
            SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
          )
          ELSE NULL
        END as total_score,
        (SELECT SUM(value) FROM json_each(co.pars)) as par_total,
        (
          SELECT COUNT(*)
          FROM json_each(p.score)
          WHERE json_each.value > 0
        ) as holes_played
      FROM participants p
      JOIN tee_times tt ON p.tee_time_id = tt.id
      JOIN competitions c ON tt.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.player_id = ?
        AND (
          p.manual_score_total IS NOT NULL
          OR (p.score IS NOT NULL AND p.score != '[]' AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE value > 0))
        )
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

  /**
   * Get all tours and series for a player
   * Tours: Shows enrollment status and standings
   * Series: Shows participation history based on rounds played
   */
  getPlayerToursAndSeries(playerId: number): PlayerToursAndSeries {
    // Get tour enrollments with tour details
    const tourEnrollments = this.db
      .prepare(
        `
        SELECT
          te.tour_id,
          t.name as tour_name,
          te.status as enrollment_status,
          tc.name as category_name
        FROM tour_enrollments te
        JOIN tours t ON te.tour_id = t.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.player_id = ?
        ORDER BY t.name
      `
      )
      .all(playerId) as Array<{
        tour_id: number;
        tour_name: string;
        enrollment_status: string;
        category_name: string | null;
      }>;

    // Get standings info for each tour (position, points, competitions played)
    const tours: PlayerTourInfo[] = tourEnrollments.map((enrollment) => {
      // Get player's standing in this tour
      const standingInfo = this.getPlayerTourStanding(playerId, enrollment.tour_id);

      return {
        tour_id: enrollment.tour_id,
        tour_name: enrollment.tour_name,
        enrollment_status: enrollment.enrollment_status as TourEnrollmentStatus,
        category_name: enrollment.category_name ?? undefined,
        position: standingInfo?.position,
        total_points: standingInfo?.total_points,
        competitions_played: standingInfo?.competitions_played ?? 0,
      };
    });

    // Get series participation based on rounds played
    // A player has played if they have manual_score_total OR score array with values > 0
    const seriesParticipation = this.db
      .prepare(
        `
        SELECT
          s.id as series_id,
          s.name as series_name,
          COUNT(DISTINCT c.id) as competitions_played,
          MAX(c.date) as last_played_date
        FROM participants p
        JOIN tee_times tt ON p.tee_time_id = tt.id
        JOIN competitions c ON tt.competition_id = c.id
        JOIN series s ON c.series_id = s.id
        WHERE p.player_id = ?
          AND c.series_id IS NOT NULL
          AND (
            p.manual_score_total IS NOT NULL
            OR (
              p.score IS NOT NULL
              AND p.score != '[]'
              AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE json_each.value > 0)
            )
          )
        GROUP BY s.id, s.name
        ORDER BY last_played_date DESC
      `
      )
      .all(playerId) as Array<{
        series_id: number;
        series_name: string;
        competitions_played: number;
        last_played_date: string;
      }>;

    const series: PlayerSeriesInfo[] = seriesParticipation.map((s) => ({
      series_id: s.series_id,
      series_name: s.series_name,
      competitions_played: s.competitions_played,
      last_played_date: s.last_played_date,
    }));

    return { tours, series };
  }

  /**
   * Get a player's standing within a specific tour
   * Returns position, total points, and competitions played
   * Uses stored competition_results for finalized competitions
   */
  private getPlayerTourStanding(
    playerId: number,
    tourId: number
  ): { position: number; total_points: number; competitions_played: number } | null {
    try {
      // Get player's stats from stored competition results
      const playerStats = this.db
        .prepare(
          `
          SELECT
            SUM(cr.points) as total_points,
            COUNT(DISTINCT cr.competition_id) as competitions_played
          FROM competition_results cr
          JOIN competitions c ON cr.competition_id = c.id
          WHERE cr.player_id = ?
            AND c.tour_id = ?
            AND cr.scoring_type = 'gross'
            AND c.is_results_final = 1
        `
        )
        .get(playerId, tourId) as {
          total_points: number | null;
          competitions_played: number;
        } | null;

      if (!playerStats || playerStats.total_points === null) {
        return null;
      }

      // Calculate position among all players in this tour
      const allStandings = this.db
        .prepare(
          `
          SELECT
            cr.player_id,
            SUM(cr.points) as total_points
          FROM competition_results cr
          JOIN competitions c ON cr.competition_id = c.id
          WHERE c.tour_id = ?
            AND cr.scoring_type = 'gross'
            AND c.is_results_final = 1
          GROUP BY cr.player_id
          ORDER BY total_points DESC
        `
        )
        .all(tourId) as { player_id: number; total_points: number }[];

      // Find this player's position
      let position = 1;
      let previousPoints = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < allStandings.length; i++) {
        if (allStandings[i].total_points !== previousPoints) {
          position = i + 1;
        }
        previousPoints = allStandings[i].total_points;

        if (allStandings[i].player_id === playerId) {
          return {
            position,
            total_points: playerStats.total_points,
            competitions_played: playerStats.competitions_played,
          };
        }
      }

      return {
        position: allStandings.length + 1,
        total_points: playerStats.total_points,
        competitions_played: playerStats.competitions_played,
      };
    } catch {
      return null;
    }
  }
}

export function createPlayerProfileService(db: Database): PlayerProfileService {
  return new PlayerProfileService(db);
}
