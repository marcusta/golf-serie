import { Database } from "bun:sqlite";
import type {
  CreateTeeTimeDto,
  Participant,
  TeeTime,
  TeeTimeWithParticipants,
  UpdateTeeTimeDto,
} from "../types";

export class TeeTimeService {
  constructor(private db: Database) {}

  async create(data: CreateTeeTimeDto): Promise<TeeTime> {
    if (!data.teetime?.trim()) {
      throw new Error("Tee time is required");
    }

    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(data.competition_id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const stmt = this.db.prepare(`
      INSERT INTO tee_times (teetime, competition_id)
      VALUES (?, ?)
      RETURNING *
    `);

    return stmt.get(data.teetime, data.competition_id) as TeeTime;
  }

  async findAllForCompetition(competitionId: number): Promise<TeeTime[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const stmt = this.db.prepare(
      "SELECT * FROM tee_times WHERE competition_id = ? order by teetime"
    );
    return stmt.all(competitionId) as TeeTime[];
  }

  async findAllForCompetitionWithParticipants(
    competitionId: number
  ): Promise<TeeTimeWithParticipants[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Get all tee times for the competition
    const teeTimesStmt = this.db.prepare(
      "SELECT * FROM tee_times WHERE competition_id = ? ORDER BY teetime"
    );
    const teeTimes = teeTimesStmt.all(competitionId) as TeeTime[];

    // Get all participants for each tee time
    const participantsStmt = this.db.prepare(`
      SELECT p.*, t.name as team_name 
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);

    const teeTimesWithParticipants: TeeTimeWithParticipants[] = teeTimes.map(
      (teeTime) => {
        const participants = participantsStmt.all(
          teeTime.id
        ) as (Participant & { team_name?: string })[];

        // Parse the score field for each participant
        const parsedParticipants = participants.map((p) => ({
          ...p,
          score:
            typeof p.score === "string" ? JSON.parse(p.score) : p.score || [],
        }));

        return {
          ...teeTime,
          participants: parsedParticipants,
        };
      }
    );

    return teeTimesWithParticipants;
  }

  async findById(id: number): Promise<TeeTime | null> {
    const stmt = this.db.prepare("SELECT * FROM tee_times WHERE id = ?");
    return stmt.get(id) as TeeTime | null;
  }

  async findByIdWithParticipants(
    id: number
  ): Promise<TeeTimeWithParticipants | null> {
    // Get tee time with course information
    const teeTimeStmt = this.db.prepare(`
      SELECT t.*, c.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.id = ?
    `);
    const teeTimeWithCourse = teeTimeStmt.get(id) as
      | (TeeTime & { course_name: string; pars: string })
      | null;
    if (!teeTimeWithCourse) return null;

    // Get all participants for this tee time
    const participantsStmt = this.db.prepare(`
      SELECT p.*, t.name as team_name 
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);

    const participants = participantsStmt.all(id) as (Participant & {
      team_name?: string;
    })[];

    // Parse the score field for each participant
    const parsedParticipants = participants.map((p) => ({
      ...p,
      score: typeof p.score === "string" ? JSON.parse(p.score) : p.score || [],
    }));

    // Parse course pars
    const pars = JSON.parse(teeTimeWithCourse.pars);

    return {
      ...teeTimeWithCourse,
      course_name: teeTimeWithCourse.course_name,
      pars,
      participants: parsedParticipants,
    };
  }

  async update(id: number, data: UpdateTeeTimeDto): Promise<TeeTime> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    if (data.teetime && !data.teetime.trim()) {
      throw new Error("Tee time cannot be empty");
    }

    if (data.competition_id) {
      const competitionStmt = this.db.prepare(
        "SELECT id FROM competitions WHERE id = ?"
      );
      const competition = competitionStmt.get(data.competition_id);
      if (!competition) {
        throw new Error("Competition not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.teetime) {
      updates.push("teetime = ?");
      values.push(data.teetime);
    }

    if (data.competition_id) {
      updates.push("competition_id = ?");
      values.push(data.competition_id);
    }

    if (updates.length === 0) {
      return teeTime;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tee_times 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values) as TeeTime;
  }

  async delete(id: number): Promise<void> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    const stmt = this.db.prepare("DELETE FROM tee_times WHERE id = ?");
    stmt.run(id);
  }
}
