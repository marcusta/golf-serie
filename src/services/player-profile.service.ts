import { Database } from "bun:sqlite";
import { GOLF } from "../constants/golf";
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

// Internal row types for query results
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

interface TourEnrollmentRow {
  tour_id: number;
  tour_name: string;
  enrollment_status: string;
  category_name: string | null;
}

interface SeriesParticipationRow {
  series_id: number;
  series_name: string;
  competitions_played: number;
  last_played_date: string;
}

interface PlayerTourStatsRow {
  total_points: number | null;
  competitions_played: number;
}

interface TourStandingRow {
  player_id: number;
  total_points: number;
}

const VALID_VISIBILITY_VALUES = ["public", "friends", "private"] as const;

export class PlayerProfileService {
  constructor(private db: Database) {}

  // ============================================================
  // Query Methods (private, single SQL statement)
  // ============================================================

  private findProfileRowWithCourse(
    playerId: number
  ): (PlayerProfileRow & { home_course_name: string | null }) | null {
    return this.db
      .prepare(
        `
        SELECT pp.*, c.name as home_course_name
        FROM player_profiles pp
        LEFT JOIN courses c ON pp.home_course_id = c.id
        WHERE pp.player_id = ?
      `
      )
      .get(playerId) as (PlayerProfileRow & { home_course_name: string | null }) | null;
  }

  private findPlayerExists(playerId: number): boolean {
    const row = this.db
      .prepare("SELECT id FROM players WHERE id = ?")
      .get(playerId);
    return !!row;
  }

  private findCourseExists(courseId: number): boolean {
    const row = this.db
      .prepare("SELECT id FROM courses WHERE id = ?")
      .get(courseId);
    return !!row;
  }

  private insertDefaultProfileRow(playerId: number): void {
    this.db
      .prepare(
        `
        INSERT INTO player_profiles (player_id, visibility)
        VALUES (?, 'public')
      `
      )
      .run(playerId);
  }

  private updateProfileRow(
    playerId: number,
    updates: string[],
    values: (string | number | null)[]
  ): void {
    this.db
      .prepare(
        `
        UPDATE player_profiles
        SET ${updates.join(", ")}
        WHERE player_id = ?
      `
      )
      .run(...values, playerId);
  }

  private findPlayerRow(playerId: number): PlayerRow | null {
    return this.db
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(playerId) as PlayerRow | null;
  }

  private findPlayerStatsRow(playerId: number): StatsRow | null {
    return this.db
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
      .get(playerId) as StatsRow | null;
  }

  private findHandicapHistoryRows(
    playerId: number,
    limit?: number
  ): HandicapHistoryRow[] {
    const sql = `
      SELECT * FROM handicap_history
      WHERE player_id = ?
      ORDER BY effective_date DESC, created_at DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `;
    return this.db.prepare(sql).all(playerId) as HandicapHistoryRow[];
  }

  private findPlayerHandicap(playerId: number): { handicap: number } | null {
    return this.db
      .prepare("SELECT handicap FROM players WHERE id = ?")
      .get(playerId) as { handicap: number } | null;
  }

  private insertHandicapHistoryRow(
    playerId: number,
    handicapIndex: number,
    effectiveDate: string,
    notes: string | null
  ): HandicapHistoryRow {
    return this.db
      .prepare(
        `
        INSERT INTO handicap_history (player_id, handicap_index, effective_date, source, notes)
        VALUES (?, ?, ?, 'manual', ?)
        RETURNING *
      `
      )
      .get(playerId, handicapIndex, effectiveDate, notes) as HandicapHistoryRow;
  }

  private updatePlayerHandicapRow(playerId: number, handicap: number): void {
    this.db
      .prepare(
        `
        UPDATE players
        SET handicap = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      )
      .run(handicap, playerId);
  }

  private findRoundHistoryRows(
    playerId: number,
    limit?: number,
    offset?: number
  ): RoundRow[] {
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
    return this.db.prepare(sql).all(playerId) as RoundRow[];
  }

  private findCommonTourExists(
    viewerPlayerId: number,
    targetPlayerId: number
  ): boolean {
    const row = this.db
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
    return !!row;
  }

  private findCommonToursRows(
    viewerPlayerId: number,
    targetPlayerId: number
  ): Array<{ id: number; name: string }> {
    return this.db
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
  }

  private findTourEnrollmentRows(playerId: number): TourEnrollmentRow[] {
    return this.db
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
      .all(playerId) as TourEnrollmentRow[];
  }

  private findSeriesParticipationRows(playerId: number): SeriesParticipationRow[] {
    return this.db
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
      .all(playerId) as SeriesParticipationRow[];
  }

  private findPlayerTourStatsRow(
    playerId: number,
    tourId: number
  ): PlayerTourStatsRow | null {
    return this.db
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
      .get(playerId, tourId) as PlayerTourStatsRow | null;
  }

  private findAllTourStandingsRows(tourId: number): TourStandingRow[] {
    return this.db
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
      .all(tourId) as TourStandingRow[];
  }

  // ============================================================
  // Logic Methods (private, no SQL)
  // ============================================================

  private transformProfileRow(
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

  private transformHistoryRow(row: HandicapHistoryRow): HandicapHistoryEntry {
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

  private transformStatsRow(stats: StatsRow | null): StatsRow {
    return {
      competitions_played: stats?.competitions_played || 0,
      total_rounds: stats?.total_rounds || 0,
      best_score: stats?.best_score || null,
      average_score: this.calculateRoundedAverage(stats?.average_score),
    };
  }

  private transformRoundRow(row: RoundRow): PlayerRoundHistory {
    const parTotal = row.par_total || GOLF.STANDARD_COURSE_RATING;
    return {
      participant_id: row.participant_id,
      competition_id: row.competition_id,
      competition_name: row.competition_name,
      competition_date: row.competition_date,
      course_id: row.course_id,
      course_name: row.course_name,
      gross_score: row.total_score,
      relative_to_par: row.total_score - parTotal,
      holes_played: row.holes_played || 0,
    };
  }

  private transformToFullProfile(
    player: PlayerRow,
    profile: PlayerProfile,
    stats: StatsRow,
    handicapHistory: HandicapHistoryEntry[]
  ): PlayerProfileFull {
    return {
      id: player.id,
      name: player.name,
      handicap: player.handicap,
      user_id: player.user_id ?? undefined,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      home_course_id: profile.home_course_id,
      home_course_name: profile.home_course_name,
      visibility: profile.visibility,
      competitions_played: stats.competitions_played,
      total_rounds: stats.total_rounds,
      best_score: stats.best_score ?? undefined,
      average_score: stats.average_score ?? undefined,
      handicap_history: handicapHistory,
    };
  }

  private transformTourEnrollmentRow(
    enrollment: TourEnrollmentRow,
    standingInfo: { position: number; total_points: number; competitions_played: number } | null
  ): PlayerTourInfo {
    return {
      tour_id: enrollment.tour_id,
      tour_name: enrollment.tour_name,
      enrollment_status: enrollment.enrollment_status as TourEnrollmentStatus,
      category_name: enrollment.category_name ?? undefined,
      position: standingInfo?.position,
      total_points: standingInfo?.total_points,
      competitions_played: standingInfo?.competitions_played ?? 0,
    };
  }

  private transformSeriesParticipationRow(row: SeriesParticipationRow): PlayerSeriesInfo {
    return {
      series_id: row.series_id,
      series_name: row.series_name,
      competitions_played: row.competitions_played,
      last_played_date: row.last_played_date,
    };
  }

  private calculateRoundedAverage(
    avgScore: number | null | undefined
  ): number | null {
    if (avgScore === null || avgScore === undefined) {
      return null;
    }
    return Math.round(avgScore * 10) / 10;
  }

  private validateVisibility(visibility: string): void {
    if (!VALID_VISIBILITY_VALUES.includes(visibility as ProfileVisibility)) {
      throw new Error("Invalid visibility setting");
    }
  }

  private validateHandicapIndex(handicapIndex: number): void {
    if (
      handicapIndex < GOLF.MIN_HANDICAP_INDEX ||
      handicapIndex > GOLF.MAX_HANDICAP_INDEX
    ) {
      throw new Error(
        `Handicap index must be between ${GOLF.MIN_HANDICAP_INDEX} and ${GOLF.MAX_HANDICAP_INDEX}`
      );
    }
  }

  private buildProfileUpdateFields(data: UpdatePlayerProfileDto): {
    updates: string[];
    values: (string | number | null)[];
  } {
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
      updates.push("home_course_id = ?");
      values.push(data.home_course_id);
    }

    if (data.visibility !== undefined) {
      updates.push("visibility = ?");
      values.push(data.visibility);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }

    return { updates, values };
  }

  private calculatePlayerPosition(
    allStandings: TourStandingRow[],
    playerId: number,
    playerTotalPoints: number,
    competitionsPlayed: number
  ): { position: number; total_points: number; competitions_played: number } {
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
          total_points: playerTotalPoints,
          competitions_played: competitionsPlayed,
        };
      }
    }

    return {
      position: allStandings.length + 1,
      total_points: playerTotalPoints,
      competitions_played: competitionsPlayed,
    };
  }

  private canViewPrivateProfile(
    profileUserId: number | undefined,
    viewerId: number | undefined
  ): boolean {
    return !!viewerId && profileUserId === viewerId;
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  // ============================================================
  // Public API Methods (orchestration)
  // ============================================================

  getProfile(playerId: number): PlayerProfile | null {
    const row = this.findProfileRowWithCourse(playerId);
    if (!row) {
      return null;
    }
    return this.transformProfileRow(row);
  }

  getOrCreateProfile(playerId: number): PlayerProfile {
    const existing = this.getProfile(playerId);
    if (existing) {
      return existing;
    }

    if (!this.findPlayerExists(playerId)) {
      throw new Error("Player not found");
    }

    this.insertDefaultProfileRow(playerId);
    return this.getProfile(playerId)!;
  }

  updateProfile(playerId: number, data: UpdatePlayerProfileDto): PlayerProfile {
    this.getOrCreateProfile(playerId);

    if (data.home_course_id !== undefined && data.home_course_id !== null) {
      if (!this.findCourseExists(data.home_course_id)) {
        throw new Error("Course not found");
      }
    }

    if (data.visibility !== undefined) {
      this.validateVisibility(data.visibility);
    }

    const { updates, values } = this.buildProfileUpdateFields(data);

    if (updates.length === 0) {
      return this.getProfile(playerId)!;
    }

    this.updateProfileRow(playerId, updates, values);
    return this.getProfile(playerId)!;
  }

  getFullProfile(playerId: number): PlayerProfileFull | null {
    const player = this.findPlayerRow(playerId);
    if (!player) {
      return null;
    }

    const profile = this.getOrCreateProfile(playerId);
    const stats = this.getPlayerStats(playerId);
    const handicapHistory = this.getHandicapHistory(playerId, 10);

    return this.transformToFullProfile(player, profile, stats, handicapHistory);
  }

  getPublicProfile(playerId: number, viewerId?: number): PlayerProfileFull | null {
    const fullProfile = this.getFullProfile(playerId);
    if (!fullProfile) {
      return null;
    }

    if (fullProfile.visibility === "private") {
      if (!this.canViewPrivateProfile(fullProfile.user_id, viewerId)) {
        return null;
      }
    }

    return fullProfile;
  }

  private getPlayerStats(playerId: number): StatsRow {
    try {
      const stats = this.findPlayerStatsRow(playerId);
      return this.transformStatsRow(stats);
    } catch (error) {
      console.error("Error getting player stats:", error);
      return this.transformStatsRow(null);
    }
  }

  getHandicapHistory(playerId: number, limit?: number): HandicapHistoryEntry[] {
    const rows = this.findHandicapHistoryRows(playerId, limit);
    return rows.map((row) => this.transformHistoryRow(row));
  }

  getHandicapWithHistory(playerId: number): HandicapWithHistory | null {
    const player = this.findPlayerHandicap(playerId);
    if (!player) {
      return null;
    }

    const history = this.getHandicapHistory(playerId);
    return {
      current: player.handicap,
      history,
    };
  }

  recordHandicap(playerId: number, data: RecordHandicapDto): HandicapHistoryEntry {
    if (!this.findPlayerExists(playerId)) {
      throw new Error("Player not found");
    }

    this.validateHandicapIndex(data.handicap_index);

    const effectiveDate = data.effective_date || this.getTodayDateString();

    const historyEntry = this.insertHandicapHistoryRow(
      playerId,
      data.handicap_index,
      effectiveDate,
      data.notes || null
    );

    this.updatePlayerHandicapRow(playerId, data.handicap_index);

    return this.transformHistoryRow(historyEntry);
  }

  getRoundHistory(
    playerId: number,
    limit?: number,
    offset?: number
  ): PlayerRoundHistory[] {
    const rows = this.findRoundHistoryRows(playerId, limit, offset);
    return rows.map((row) => this.transformRoundRow(row));
  }

  isFriend(viewerPlayerId: number, targetPlayerId: number): boolean {
    if (viewerPlayerId === targetPlayerId) {
      return true;
    }
    return this.findCommonTourExists(viewerPlayerId, targetPlayerId);
  }

  getCommonTours(
    viewerPlayerId: number,
    targetPlayerId: number
  ): Array<{ id: number; name: string }> {
    return this.findCommonToursRows(viewerPlayerId, targetPlayerId);
  }

  getPlayerToursAndSeries(playerId: number): PlayerToursAndSeries {
    const tourEnrollments = this.findTourEnrollmentRows(playerId);

    const tours: PlayerTourInfo[] = tourEnrollments.map((enrollment) => {
      const standingInfo = this.getPlayerTourStanding(playerId, enrollment.tour_id);
      return this.transformTourEnrollmentRow(enrollment, standingInfo);
    });

    const seriesRows = this.findSeriesParticipationRows(playerId);
    const series = seriesRows.map((row) => this.transformSeriesParticipationRow(row));

    return { tours, series };
  }

  private getPlayerTourStanding(
    playerId: number,
    tourId: number
  ): { position: number; total_points: number; competitions_played: number } | null {
    try {
      const playerStats = this.findPlayerTourStatsRow(playerId, tourId);

      if (!playerStats || playerStats.total_points === null) {
        return null;
      }

      const allStandings = this.findAllTourStandingsRows(tourId);

      return this.calculatePlayerPosition(
        allStandings,
        playerId,
        playerStats.total_points,
        playerStats.competitions_played
      );
    } catch {
      return null;
    }
  }
}

export function createPlayerProfileService(db: Database): PlayerProfileService {
  return new PlayerProfileService(db);
}
