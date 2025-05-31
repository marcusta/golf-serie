import { Database } from "bun:sqlite";
import type {
  Competition,
  CreateCompetitionDto,
  LeaderboardEntry,
  Participant,
  UpdateCompetitionDto,
} from "../types";

function isValidYYYYMMDD(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export class CompetitionService {
  constructor(private db: Database) {}

  async create(data: CreateCompetitionDto): Promise<Competition> {
    if (!data.name?.trim()) {
      throw new Error("Competition name is required");
    }

    if (!data.date?.trim()) {
      throw new Error("Competition date is required");
    }

    // Validate YYYY-MM-DD format
    if (!isValidYYYYMMDD(data.date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }

    // Verify course exists
    const courseStmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
    const course = courseStmt.get(data.course_id);
    if (!course) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided
    if (data.series_id) {
      const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
      const series = seriesStmt.get(data.series_id);
      if (!series) {
        throw new Error("Series not found");
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, date, course_id, series_id)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null
    ) as Competition;
  }

  async findAll(): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*) 
         FROM participants p 
         JOIN tee_times t ON p.tee_time_id = t.id 
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
    `);
    return stmt.all().map((row: any) => ({
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
      participant_count: row.participant_count,
    }));
  }

  async findById(
    id: number
  ): Promise<(Competition & { course: { id: number; name: string } }) | null> {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
    };
  }

  async update(id: number, data: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    if (data.name && !data.name.trim()) {
      throw new Error("Competition name cannot be empty");
    }

    if (data.date && !isValidYYYYMMDD(data.date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }

    if (data.course_id) {
      const courseStmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
      const course = courseStmt.get(data.course_id);
      if (!course) {
        throw new Error("Course not found");
      }
    }

    if (data.series_id !== undefined) {
      if (data.series_id === null) {
        // Allow setting series_id to null
      } else {
        const seriesStmt = this.db.prepare(
          "SELECT id FROM series WHERE id = ?"
        );
        const series = seriesStmt.get(data.series_id);
        if (!series) {
          throw new Error("Series not found");
        }
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

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

    if (updates.length === 0) {
      return competition;
    }

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

  async delete(id: number): Promise<void> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Check if competition has any tee times
    const teeTimesStmt = this.db.prepare(
      "SELECT id FROM tee_times WHERE competition_id = ?"
    );
    const teeTimes = teeTimesStmt.all(id);
    if (teeTimes.length > 0) {
      throw new Error("Cannot delete competition that has tee times");
    }

    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }

  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    // Verify competition exists and get course info
    const competitionStmt = this.db.prepare(`
      SELECT c.*, co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const competition = competitionStmt.get(competitionId) as
      | (Competition & { pars: string })
      | null;
    if (!competition) {
      throw new Error("Competition not found");
    }
    console.log("competition leaderboard 1");
    // Get all participants for this competition
    const participantsStmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = participantsStmt.all(competitionId) as (Participant & {
      team_name: string;
    })[];
    // Parse course pars
    const coursePars = JSON.parse(competition.pars);
    if (!coursePars || coursePars.length === 0) {
      throw new Error("Invalid course pars data structure, no pars found");
    }
    const pars = coursePars;
    // Calculate leaderboard entries
    const leaderboard: LeaderboardEntry[] = participants.map((participant) => {
      // Parse the score field
      const score =
        typeof participant.score === "string"
          ? JSON.parse(participant.score)
          : Array.isArray(participant.score)
          ? participant.score
          : [];
      const holesPlayed = score.filter((s: number) => s > 0).length;
      const totalShots = score.reduce(
        (sum: number, shots: number) => sum + (shots || 0),
        0
      );
      // Calculate relative to par
      let relativeToPar = 0;
      try {
        for (let i = 0; i < score.length; i++) {
          if (score[i] > 0 && pars[i] !== undefined) {
            relativeToPar += score[i] - pars[i];
          }
        }
      } catch (error) {
        console.error("Error calculating relative to par", error);
        throw error;
      }
      return {
        participant: {
          ...participant,
          score,
        },
        totalShots,
        holesPlayed,
        relativeToPar,
      };
    });
    // Sort by relative to par (ascending)
    return leaderboard.sort((a, b) => a.relativeToPar - b.relativeToPar);
  }
}
