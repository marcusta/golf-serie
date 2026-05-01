import { Database } from "bun:sqlite";
import type {
    Competition,
    CreateCompetitionDto,
    LeaderboardEntry,
    LeaderboardResponse,
    TeamLeaderboardEntry,
    UpdateCompetitionDto,
} from "../types";
import { LeaderboardService } from "./leaderboard.service";
import { CompetitionResultsService } from "./competition-results.service";
import { resolveCompetitionScoringFormat } from "../utils/scoring-format";
import { safeParseJsonWithDefault } from "../utils/parsing";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types (for database rows)
// ─────────────────────────────────────────────────────────────────────────────

interface CompetitionWithCourseRow extends Competition {
    course_name: string;
    participant_count?: number;
}

type EditableRoundType = "front_9" | "back_9";

interface ParticipantScoreRow {
  score: string | null;
  manual_score_out: number | null;
  manual_score_in: number | null;
  manual_score_total: number | null;
}

function isValidYYYYMMDD(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export class CompetitionService {
  private leaderboardService: LeaderboardService;
  private competitionResultsService: CompetitionResultsService;

  constructor(private db: Database) {
    this.leaderboardService = new LeaderboardService(db);
    this.competitionResultsService = new CompetitionResultsService(db);
  }

  async create(data: CreateCompetitionDto): Promise<Competition> {
    // Validation
    this.validateCompetitionName(data.name);
    this.validateCompetitionDate(data.date);
    this.validateScoringFormat(data.scoring_format);

    // Verify course exists
    if (!this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided
    if (data.series_id && !this.findSeriesExists(data.series_id)) {
      throw new Error("Series not found");
    }

    // Verify tour exists if provided
    if (data.tour_id && !this.findTourExists(data.tour_id)) {
      throw new Error("Tour not found");
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      if (tee.course_id !== data.course_id) {
        throw new Error("Tee must belong to the competition's course");
      }
    }

    return this.insertCompetitionRow(data);
  }

  async findAll(): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const rows = this.findAllCompetitionRows();
    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }

  async findById(
    id: number
  ): Promise<(Competition & { course: { id: number; name: string } }) | null> {
    const row = this.findCompetitionRowById(id);
    if (!row) return null;
    return this.transformCompetitionRowToResult(row);
  }

  async update(id: number, data: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Validation
    this.validateCompetitionNameNotEmpty(data.name);
    this.validateCompetitionDateFormat(data.date);
    this.validateScoringFormat(data.scoring_format);

    // Verify course exists if provided
    if (data.course_id && !this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided (null allowed to clear)
    if (data.series_id !== undefined && data.series_id !== null) {
      if (!this.findSeriesExists(data.series_id)) {
        throw new Error("Series not found");
      }
    }

    // Verify tour exists if provided (null allowed to clear)
    if (data.tour_id !== undefined && data.tour_id !== null) {
      if (!this.findTourExists(data.tour_id)) {
        throw new Error("Tour not found");
      }
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id !== undefined && data.tee_id !== null) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      const effectiveCourseId = data.course_id ?? competition.course_id;
      if (tee.course_id !== effectiveCourseId) {
        throw new Error("Tee must belong to the competition's course");
      }
    }

    const { updates, values } = this.buildUpdateFields(data);

    if (updates.length === 0) {
      return competition;
    }

    const requiresRecalculation = this.shouldRecalculateAfterUpdate(
      competition,
      data
    );

    return this.db.transaction(() => {
      const updatedCompetition = this.updateCompetitionRow(id, updates, values);

      if (requiresRecalculation) {
        this.competitionResultsService.recalculateResults(id);
      }

      return updatedCompetition;
    })();
  }

  async delete(id: number): Promise<void> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Check if competition has any tee times
    const teeTimes = this.findTeeTimesForCompetition(id);
    if (teeTimes.length > 0) {
      throw new Error("Cannot delete competition that has tee times");
    }

    this.deleteCompetitionRow(id);
  }

  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    return this.leaderboardService.getLeaderboard(competitionId);
  }

  async getLeaderboardWithDetails(competitionId: number): Promise<LeaderboardResponse> {
    return this.leaderboardService.getLeaderboardWithDetails(competitionId);
  }

  async getTeamLeaderboard(competitionId: number): Promise<TeamLeaderboardEntry[]> {
    return this.leaderboardService.getTeamLeaderboard(competitionId);
  }

  async updatePlayedHoles(id: number, roundType: EditableRoundType): Promise<Competition> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    if (this.hasRecordedScoresForCompetition(id)) {
      throw new Error("Cannot change played holes after scores have been recorded");
    }

    const startHole = this.getStartHoleForRoundType(roundType);

    return this.db.transaction(() => {
      const updatedCompetition = this.updateCompetitionRoundTypeRow(id, roundType);
      this.updateTeeTimesStartHoleForCompetition(id, startHole);
      return updatedCompetition;
    })();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Logic Methods (pure business logic, no SQL)
  // ─────────────────────────────────────────────────────────────────────────────

  private transformCompetitionRowToResult(row: CompetitionWithCourseRow): Competition & { course: { id: number; name: string }; participant_count: number } {
    return {
      ...row,
      self_organize: !!(row as unknown as { self_organize?: number | boolean }).self_organize,
      is_results_final: !!(row as unknown as { is_results_final?: number | boolean }).is_results_final,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
      participant_count: row.participant_count ?? 0,
    };
  }

  private validateCompetitionName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Competition name is required");
    }
  }

  private validateCompetitionDate(date: string | undefined): void {
    if (!date?.trim()) {
      throw new Error("Competition date is required");
    }
    if (!isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }

  private validateCompetitionNameNotEmpty(name: string | undefined): void {
    if (name && !name.trim()) {
      throw new Error("Competition name cannot be empty");
    }
  }

  private validateCompetitionDateFormat(date: string | undefined): void {
    if (date && !isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }

  private validateScoringFormat(
    scoringFormat: CreateCompetitionDto["scoring_format"] | UpdateCompetitionDto["scoring_format"]
  ): void {
    if (
      scoringFormat !== undefined &&
      scoringFormat !== null &&
      scoringFormat !== "stroke_play" &&
      scoringFormat !== "stableford"
    ) {
      throw new Error("Invalid scoring format. Must be 'stroke_play' or 'stableford'");
    }
  }

  private getStartHoleForRoundType(roundType: EditableRoundType): number {
    return roundType === "front_9" ? 1 : 10;
  }

  private hasRecordedScores(rows: ParticipantScoreRow[]): boolean {
    return rows.some((row) => {
      const scores = safeParseJsonWithDefault<number[]>(row.score, []);
      return (
        scores.some((shots) => shots !== 0) ||
        row.manual_score_out !== null ||
        row.manual_score_in !== null ||
        row.manual_score_total !== null
      );
    });
  }

  private shouldRecalculateAfterUpdate(
    competition: Competition,
    data: UpdateCompetitionDto
  ): boolean {
    if (!competition.is_results_final) {
      return false;
    }

    const previousTourScoringFormat = competition.tour_id
      ? this.findTourScoringFormat(competition.tour_id)
      : null;
    const nextTourId = data.tour_id !== undefined
      ? data.tour_id ?? undefined
      : competition.tour_id;
    const nextCompetitionScoringFormat = data.scoring_format !== undefined
      ? data.scoring_format
      : competition.scoring_format;
    const nextTourScoringFormat = nextTourId
      ? this.findTourScoringFormat(nextTourId)
      : null;

    const previousEffectiveFormat = resolveCompetitionScoringFormat(
      competition.scoring_format,
      previousTourScoringFormat
    );
    const nextEffectiveFormat = resolveCompetitionScoringFormat(
      nextCompetitionScoringFormat,
      nextTourScoringFormat
    );

    return previousEffectiveFormat !== nextEffectiveFormat;
  }

  private findTourScoringFormat(tourId: number): Competition["scoring_format"] {
    const row = this.db
      .prepare("SELECT scoring_format FROM tours WHERE id = ?")
      .get(tourId) as { scoring_format: Competition["scoring_format"] } | null;
    return row?.scoring_format ?? null;
  }

  private buildUpdateFields(data: UpdateCompetitionDto): { updates: string[]; values: (string | number | null)[] } {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.date) {
      updates.push("date = ?");
      values.push(data.date);
    }
    if (data.course_id) {
      updates.push("course_id = ?");
      values.push(data.course_id);
    }
    if (data.series_id !== undefined) {
      updates.push("series_id = ?");
      values.push(data.series_id);
    }
    if (data.tour_id !== undefined) {
      updates.push("tour_id = ?");
      values.push(data.tour_id);
    }
    if (data.tee_id !== undefined) {
      updates.push("tee_id = ?");
      values.push(data.tee_id);
    }
    if (data.point_template_id !== undefined) {
      updates.push("point_template_id = ?");
      values.push(data.point_template_id);
    }
    if (data.scoring_format !== undefined) {
      updates.push("scoring_format = ?");
      values.push(data.scoring_format);
    }
    if (data.manual_entry_format) {
      updates.push("manual_entry_format = ?");
      values.push(data.manual_entry_format);
    }
    if (data.points_multiplier !== undefined) {
      updates.push("points_multiplier = ?");
      values.push(data.points_multiplier);
    }
    if (data.venue_type !== undefined) {
      updates.push("venue_type = ?");
      values.push(data.venue_type);
    }
    if (data.start_mode !== undefined) {
      updates.push("start_mode = ?");
      values.push(data.start_mode);
    }
    if (data.open_start !== undefined) {
      updates.push("open_start = ?");
      values.push(data.open_start);
    }
    if (data.open_end !== undefined) {
      updates.push("open_end = ?");
      values.push(data.open_end);
    }
    if (data.round_type !== undefined) {
      updates.push("round_type = ?");
      values.push(data.round_type);
    }
    if (data.self_organize !== undefined) {
      updates.push("self_organize = ?");
      values.push(data.self_organize ? 1 : 0);
    }

    return { updates, values };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────────────────

  private findCourseExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM courses WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findSeriesExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM series WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findTourExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM tours WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findTeeWithCourse(id: number): { id: number; course_id: number } | null {
    const stmt = this.db.prepare("SELECT id, course_id FROM course_tees WHERE id = ?");
    return stmt.get(id) as { id: number; course_id: number } | null;
  }

  private findTeeTimesForCompetition(competitionId: number): { id: number }[] {
    const stmt = this.db.prepare("SELECT id FROM tee_times WHERE competition_id = ?");
    return stmt.all(competitionId) as { id: number }[];
  }

  private findParticipantScoreRowsForCompetition(competitionId: number): ParticipantScoreRow[] {
    const stmt = this.db.prepare(`
      SELECT p.score, p.manual_score_out, p.manual_score_in, p.manual_score_total
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      WHERE t.competition_id = ?
    `);
    return stmt.all(competitionId) as ParticipantScoreRow[];
  }

  private hasRecordedScoresForCompetition(competitionId: number): boolean {
    return this.hasRecordedScores(this.findParticipantScoreRowsForCompetition(competitionId));
  }

  private findAllCompetitionRows(): CompetitionWithCourseRow[] {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
    `);
    return stmt.all() as CompetitionWithCourseRow[];
  }

  private findCompetitionRowById(id: number): CompetitionWithCourseRow | null {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    return stmt.get(id) as CompetitionWithCourseRow | null;
  }

  private insertCompetitionRow(data: CreateCompetitionDto): Competition {
    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, date, course_id, series_id, tour_id, tee_id, point_template_id, scoring_format, manual_entry_format, points_multiplier, venue_type, start_mode, open_start, open_end, round_type, self_organize, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    const row = stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null,
      data.tour_id || null,
      data.tee_id || null,
      data.point_template_id || null,
      data.scoring_format ?? null,
      data.manual_entry_format || "out_in_total",
      data.points_multiplier ?? 1,
      data.venue_type || "outdoor",
      data.start_mode || "scheduled",
      data.open_start || null,
      data.open_end || null,
      data.round_type || "full_18",
      data.self_organize ? 1 : 0,
      data.owner_id || null
    ) as Competition & { self_organize: number | boolean };
    return {
      ...row,
      self_organize: !!row.self_organize,
      is_results_final: !!(row as Competition & { is_results_final?: number | boolean }).is_results_final,
    };
  }

  private updateCompetitionRow(id: number, updates: string[], values: (string | number | null)[]): Competition {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE competitions
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);
    const row = stmt.get(...values) as Competition & {
      self_organize: number | boolean;
    };
    return {
      ...row,
      self_organize: !!row.self_organize,
      is_results_final: !!(row as Competition & { is_results_final?: number | boolean }).is_results_final,
    };
  }

  private updateCompetitionRoundTypeRow(id: number, roundType: EditableRoundType): Competition {
    const stmt = this.db.prepare(`
      UPDATE competitions
      SET round_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    const row = stmt.get(roundType, id) as Competition & {
      self_organize: number | boolean;
    };
    return {
      ...row,
      self_organize: !!row.self_organize,
      is_results_final: !!(row as Competition & { is_results_final?: number | boolean }).is_results_final,
    };
  }

  private updateTeeTimesStartHoleForCompetition(competitionId: number, startHole: number): void {
    const stmt = this.db.prepare(`
      UPDATE tee_times
      SET start_hole = ?, updated_at = CURRENT_TIMESTAMP
      WHERE competition_id = ?
    `);
    stmt.run(startHole, competitionId);
  }

  private deleteCompetitionRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }

  private findUserRole(userId: number): string | null {
    const row = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | null;
    return row?.role ?? null;
  }

  private findStandAloneCompetitionRows(): CompetitionWithCourseRow[] {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.series_id IS NULL AND c.tour_id IS NULL
      ORDER BY c.date DESC
    `);
    return stmt.all() as CompetitionWithCourseRow[];
  }

  private findStandAloneCompetitionsForUserRows(
    userId: number
  ): CompetitionWithCourseRow[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN competition_admins ca ON c.id = ca.competition_id AND ca.user_id = ?
      WHERE c.series_id IS NULL
        AND c.tour_id IS NULL
        AND (c.owner_id = ? OR ca.user_id IS NOT NULL)
      ORDER BY c.date DESC
    `);
    return stmt.all(userId, userId) as CompetitionWithCourseRow[];
  }

  private findCompetitionsForUserRows(userId: number): CompetitionWithCourseRow[] {
    // Get competitions where user is:
    // 1. Direct owner or admin
    // 2. Series owner or admin (for series competitions)
    // 3. Tour owner or admin (for tour competitions)
    const stmt = this.db.prepare(`
      SELECT DISTINCT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN competition_admins ca ON c.id = ca.competition_id AND ca.user_id = ?
      LEFT JOIN series s ON c.series_id = s.id
      LEFT JOIN series_admins sa ON s.id = sa.series_id AND sa.user_id = ?
      LEFT JOIN tours t ON c.tour_id = t.id
      LEFT JOIN tour_admins ta ON t.id = ta.tour_id AND ta.user_id = ?
      WHERE
        c.owner_id = ?
        OR ca.user_id IS NOT NULL
        OR s.owner_id = ?
        OR sa.user_id IS NOT NULL
        OR t.owner_id = ?
        OR ta.user_id IS NOT NULL
      ORDER BY c.date DESC
    `);
    return stmt.all(userId, userId, userId, userId, userId, userId) as CompetitionWithCourseRow[];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API Methods for filtered competition access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all stand-alone competitions (not linked to any series or tour)
   * For SUPER_ADMIN: returns all stand-alone competitions
   * For regular users: returns only those they own or are admin of
   */
  async findStandAlone(userId: number): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const userRole = this.findUserRole(userId);
    const rows =
      userRole === "SUPER_ADMIN"
        ? this.findStandAloneCompetitionRows()
        : this.findStandAloneCompetitionsForUserRows(userId);

    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }

  /**
   * Get all competitions the user can manage
   * For SUPER_ADMIN: returns all competitions
   * For regular users: returns competitions they own, are admin of,
   *                    or are in series/tours they manage
   */
  async findForUser(userId: number): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const userRole = this.findUserRole(userId);
    const rows =
      userRole === "SUPER_ADMIN"
        ? this.findAllCompetitionRows()
        : this.findCompetitionsForUserRows(userId);

    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }
}
