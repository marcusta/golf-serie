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

    // Verify competition exists and get venue_type
    const competitionStmt = this.db.prepare(
      "SELECT id, venue_type FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(data.competition_id) as {
      id: number;
      venue_type: "outdoor" | "indoor";
    } | null;
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Validate based on venue_type
    if (competition.venue_type === "indoor") {
      if (!data.hitting_bay) {
        throw new Error("Hitting bay is required for indoor competitions");
      }
      if (data.hitting_bay < 1) {
        throw new Error("Hitting bay must be a positive number");
      }
    } else {
      // Outdoor competition
      const startHole = data.start_hole ?? 1;
      if (startHole !== 1 && startHole !== 10) {
        throw new Error("start_hole must be 1 or 10");
      }
      if (data.hitting_bay) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
      }
    }

    const startHole = data.start_hole ?? 1;

    const stmt = this.db.prepare(`
      INSERT INTO tee_times (teetime, competition_id, start_hole, hitting_bay)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      data.teetime,
      data.competition_id,
      startHole,
      data.hitting_bay ?? null
    ) as TeeTime;
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

    // Get all tee times for the competition with course info
    const teeTimesStmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime
    `);
    const teeTimes = teeTimesStmt.all(competitionId) as (TeeTime & {
      course_name: string;
      pars: string;
    })[];

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

        // Parse course pars
        const pars = JSON.parse(teeTime.pars);

        return {
          ...teeTime,
          course_name: teeTime.course_name,
          pars,
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
      SELECT t.*, co.name as course_name, co.pars
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

    // Get competition venue_type for validation
    const competitionId = data.competition_id ?? teeTime.competition_id;
    const competitionStmt = this.db.prepare(
      "SELECT id, venue_type FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId) as {
      id: number;
      venue_type: "outdoor" | "indoor";
    } | null;
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Validate based on venue_type
    if (competition.venue_type === "indoor") {
      if (typeof data.hitting_bay !== "undefined") {
        if (!data.hitting_bay) {
          throw new Error("Hitting bay is required for indoor competitions");
        }
        if (data.hitting_bay < 1) {
          throw new Error("Hitting bay must be a positive number");
        }
      }
      if (typeof data.start_hole !== "undefined" && data.start_hole !== 1) {
        // Indoor competitions typically don't use start_hole, but we'll allow it to be 1
        throw new Error("Start hole is not applicable for indoor competitions");
      }
    } else {
      // Outdoor competition
      if (typeof data.start_hole !== "undefined") {
        if (data.start_hole !== 1 && data.start_hole !== 10) {
          throw new Error("start_hole must be 1 or 10");
        }
      }
      if (typeof data.hitting_bay !== "undefined" && data.hitting_bay !== null) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
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

    if (typeof data.start_hole !== "undefined") {
      updates.push("start_hole = ?");
      values.push(data.start_hole);
    }

    if (typeof data.hitting_bay !== "undefined") {
      updates.push("hitting_bay = ?");
      values.push(data.hitting_bay ?? null);
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

  async updateParticipantsOrder(
    id: number,
    newOrder: number[]
  ): Promise<TeeTimeWithParticipants> {
    const teeTime = await this.findById(id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    // Verify that all participant IDs in newOrder belong to this tee time
    const participantsStmt = this.db.prepare(`
      SELECT id FROM participants WHERE tee_time_id = ?
    `);
    const participants = participantsStmt.all(id) as { id: number }[];
    const participantIds = participants.map((p) => p.id);
    const invalidIds = newOrder.filter((id) => !participantIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid participant IDs: ${invalidIds.join(", ")}`);
    }

    // Update the tee_order for each participant
    const updateStmt = this.db.prepare(`
      UPDATE participants SET tee_order = ? WHERE id = ?
    `);
    newOrder.forEach((participantId, index) => {
      updateStmt.run(index + 1, participantId);
    });

    // Return the updated tee time with participants
    const updatedTeeTime = await this.findByIdWithParticipants(id);
    if (!updatedTeeTime) {
      throw new Error("Failed to retrieve updated tee time");
    }
    return updatedTeeTime;
  }
}
