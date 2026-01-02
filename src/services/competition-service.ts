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

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types (for database rows)
// ─────────────────────────────────────────────────────────────────────────────

interface CompetitionWithCourseRow extends Competition {
    course_name: string;
    participant_count?: number;
}

function isValidYYYYMMDD(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export class CompetitionService {
  private leaderboardService: LeaderboardService;

  constructor(private db: Database) {
    this.leaderboardService = new LeaderboardService(db);
  }

  async create(data: CreateCompetitionDto): Promise<Competition> {
    // Validation
    this.validateCompetitionName(data.name);
    this.validateCompetitionDate(data.date);

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

    return this.updateCompetitionRow(id, updates, values);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Logic Methods (pure business logic, no SQL)
  // ─────────────────────────────────────────────────────────────────────────────

  private transformCompetitionRowToResult(row: CompetitionWithCourseRow): Competition & { course: { id: number; name: string }; participant_count: number } {
    return {
      ...row,
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
      INSERT INTO competitions (name, date, course_id, series_id, tour_id, tee_id, manual_entry_format, points_multiplier, venue_type, start_mode, open_start, open_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null,
      data.tour_id || null,
      data.tee_id || null,
      data.manual_entry_format || "out_in_total",
      data.points_multiplier ?? 1,
      data.venue_type || "outdoor",
      data.start_mode || "scheduled",
      data.open_start || null,
      data.open_end || null
    ) as Competition;
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
    return stmt.get(...values) as Competition;
  }

  private deleteCompetitionRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }
}
