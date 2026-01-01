import { Database } from "bun:sqlite";
import type {
  CreateTeeTimeDto,
  Participant,
  TeeTime,
  TeeTimeWithParticipants,
  UpdateTeeTimeDto,
} from "../types";

type VenueType = "outdoor" | "indoor";

interface CompetitionVenueInfo {
  id: number;
  venue_type: VenueType;
}

interface TeeTimeWithCourseRow extends TeeTime {
  course_name: string;
  pars: string;
}

interface ParticipantWithTeamRow extends Participant {
  team_name?: string;
}

export class TeeTimeService {
  constructor(private db: Database) {}

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private validateTeeTimeRequired(teetime: string | undefined): void {
    if (!teetime?.trim()) {
      throw new Error("Tee time is required");
    }
  }

  private validateTeeTimeNotEmpty(teetime: string | undefined): void {
    if (teetime !== undefined && !teetime.trim()) {
      throw new Error("Tee time cannot be empty");
    }
  }

  private validateCreateForVenueType(data: CreateTeeTimeDto, venueType: VenueType): void {
    if (venueType === "indoor") {
      if (!data.hitting_bay) {
        throw new Error("Hitting bay is required for indoor competitions");
      }
      if (data.hitting_bay < 1) {
        throw new Error("Hitting bay must be a positive number");
      }
    } else {
      const startHole = data.start_hole ?? 1;
      if (startHole !== 1 && startHole !== 10) {
        throw new Error("start_hole must be 1 or 10");
      }
      if (data.hitting_bay) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
      }
    }
  }

  private validateUpdateForVenueType(data: UpdateTeeTimeDto, venueType: VenueType): void {
    if (venueType === "indoor") {
      if (typeof data.hitting_bay !== "undefined") {
        if (!data.hitting_bay) {
          throw new Error("Hitting bay is required for indoor competitions");
        }
        if (data.hitting_bay < 1) {
          throw new Error("Hitting bay must be a positive number");
        }
      }
      if (typeof data.start_hole !== "undefined" && data.start_hole !== 1) {
        throw new Error("Start hole is not applicable for indoor competitions");
      }
    } else {
      if (typeof data.start_hole !== "undefined") {
        if (data.start_hole !== 1 && data.start_hole !== 10) {
          throw new Error("start_hole must be 1 or 10");
        }
      }
      if (typeof data.hitting_bay !== "undefined" && data.hitting_bay !== null) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
      }
    }
  }

  private transformParticipantRow(row: ParticipantWithTeamRow): ParticipantWithTeamRow {
    return {
      ...row,
      score: typeof row.score === "string" ? JSON.parse(row.score) : row.score || [],
    };
  }

  private transformTeeTimeWithParticipants(
    teeTimeRow: TeeTimeWithCourseRow,
    participantRows: ParticipantWithTeamRow[]
  ): TeeTimeWithParticipants {
    const parsedParticipants = participantRows.map((p) => this.transformParticipantRow(p));
    const pars = JSON.parse(teeTimeRow.pars);

    return {
      ...teeTimeRow,
      course_name: teeTimeRow.course_name,
      pars,
      participants: parsedParticipants,
    };
  }

  private validateParticipantIds(newOrder: number[], validIds: number[]): void {
    const invalidIds = newOrder.filter((id) => !validIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid participant IDs: ${invalidIds.join(", ")}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private findCompetitionVenueInfo(competitionId: number): CompetitionVenueInfo | null {
    const stmt = this.db.prepare("SELECT id, venue_type FROM competitions WHERE id = ?");
    return stmt.get(competitionId) as CompetitionVenueInfo | null;
  }

  private findCompetitionExists(competitionId: number): boolean {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE id = ?");
    return stmt.get(competitionId) !== null;
  }

  private insertTeeTimeRow(
    teetime: string,
    competitionId: number,
    startHole: number,
    hittingBay: number | null
  ): TeeTime {
    const stmt = this.db.prepare(`
      INSERT INTO tee_times (teetime, competition_id, start_hole, hitting_bay)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(teetime, competitionId, startHole, hittingBay) as TeeTime;
  }

  private findTeeTimeRowsByCompetition(competitionId: number): TeeTime[] {
    const stmt = this.db.prepare(
      "SELECT * FROM tee_times WHERE competition_id = ? ORDER BY teetime"
    );
    return stmt.all(competitionId) as TeeTime[];
  }

  private findTeeTimeRowsWithCourseByCompetition(competitionId: number): TeeTimeWithCourseRow[] {
    const stmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime
    `);
    return stmt.all(competitionId) as TeeTimeWithCourseRow[];
  }

  private findTeeTimeRowById(id: number): TeeTime | null {
    const stmt = this.db.prepare("SELECT * FROM tee_times WHERE id = ?");
    return stmt.get(id) as TeeTime | null;
  }

  private findTeeTimeRowWithCourse(id: number): TeeTimeWithCourseRow | null {
    const stmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.id = ?
    `);
    return stmt.get(id) as TeeTimeWithCourseRow | null;
  }

  private findParticipantRowsByTeeTime(teeTimeId: number): ParticipantWithTeamRow[] {
    const stmt = this.db.prepare(`
      SELECT p.*, t.name as team_name, p.player_id, p.is_dq
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);
    return stmt.all(teeTimeId) as ParticipantWithTeamRow[];
  }

  private findParticipantIdsByTeeTime(teeTimeId: number): number[] {
    const stmt = this.db.prepare("SELECT id FROM participants WHERE tee_time_id = ?");
    const rows = stmt.all(teeTimeId) as { id: number }[];
    return rows.map((r) => r.id);
  }

  private updateTeeTimeRow(
    id: number,
    teetime: string,
    competitionId: number,
    startHole: number,
    hittingBay: number | null
  ): TeeTime {
    const stmt = this.db.prepare(`
      UPDATE tee_times
      SET teetime = ?, competition_id = ?, start_hole = ?, hitting_bay = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(teetime, competitionId, startHole, hittingBay, id) as TeeTime;
  }

  private deleteTeeTimeRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM tee_times WHERE id = ?");
    stmt.run(id);
  }

  private updateParticipantOrderRow(participantId: number, order: number): void {
    const stmt = this.db.prepare("UPDATE participants SET tee_order = ? WHERE id = ?");
    stmt.run(order, participantId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateTeeTimeDto): Promise<TeeTime> {
    this.validateTeeTimeRequired(data.teetime);

    const competition = this.findCompetitionVenueInfo(data.competition_id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    this.validateCreateForVenueType(data, competition.venue_type);

    const startHole = data.start_hole ?? 1;
    return this.insertTeeTimeRow(data.teetime, data.competition_id, startHole, data.hitting_bay ?? null);
  }

  async findAllForCompetition(competitionId: number): Promise<TeeTime[]> {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    return this.findTeeTimeRowsByCompetition(competitionId);
  }

  async findAllForCompetitionWithParticipants(competitionId: number): Promise<TeeTimeWithParticipants[]> {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }

    const teeTimeRows = this.findTeeTimeRowsWithCourseByCompetition(competitionId);

    return teeTimeRows.map((teeTimeRow) => {
      const participantRows = this.findParticipantRowsByTeeTime(teeTimeRow.id);
      return this.transformTeeTimeWithParticipants(teeTimeRow, participantRows);
    });
  }

  async findById(id: number): Promise<TeeTime | null> {
    return this.findTeeTimeRowById(id);
  }

  async findByIdWithParticipants(id: number): Promise<TeeTimeWithParticipants | null> {
    const teeTimeRow = this.findTeeTimeRowWithCourse(id);
    if (!teeTimeRow) return null;

    const participantRows = this.findParticipantRowsByTeeTime(id);
    return this.transformTeeTimeWithParticipants(teeTimeRow, participantRows);
  }

  async update(id: number, data: UpdateTeeTimeDto): Promise<TeeTime> {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }

    this.validateTeeTimeNotEmpty(data.teetime);

    const competitionId = data.competition_id ?? existingTeeTime.competition_id;
    const competition = this.findCompetitionVenueInfo(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    this.validateUpdateForVenueType(data, competition.venue_type);

    // Check if there are any changes
    const hasChanges =
      data.teetime !== undefined ||
      data.competition_id !== undefined ||
      data.start_hole !== undefined ||
      data.hitting_bay !== undefined;

    if (!hasChanges) {
      return existingTeeTime;
    }

    // Merge with existing values
    const teetime = data.teetime ?? existingTeeTime.teetime;
    const startHole = data.start_hole ?? existingTeeTime.start_hole;
    const hittingBay = data.hitting_bay !== undefined ? (data.hitting_bay ?? null) : (existingTeeTime.hitting_bay ?? null);

    return this.updateTeeTimeRow(id, teetime, competitionId, startHole, hittingBay);
  }

  async delete(id: number): Promise<void> {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }
    this.deleteTeeTimeRow(id);
  }

  async updateParticipantsOrder(id: number, newOrder: number[]): Promise<TeeTimeWithParticipants> {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }

    const validParticipantIds = this.findParticipantIdsByTeeTime(id);
    this.validateParticipantIds(newOrder, validParticipantIds);

    // Update each participant's order
    newOrder.forEach((participantId, index) => {
      this.updateParticipantOrderRow(participantId, index + 1);
    });

    const updatedTeeTime = await this.findByIdWithParticipants(id);
    if (!updatedTeeTime) {
      throw new Error("Failed to retrieve updated tee time");
    }
    return updatedTeeTime;
  }
}
