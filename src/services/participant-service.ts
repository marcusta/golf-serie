import { Database } from "bun:sqlite";
import type {
  CreateParticipantDto,
  Participant,
  UpdateParticipantDto,
} from "../types";

export class ParticipantService {
  constructor(private db: Database) {}

  async create(data: CreateParticipantDto): Promise<Participant> {
    if (!data.position_name?.trim()) {
      throw new Error("Position name is required");
    }

    if (data.tee_order < 1) {
      throw new Error("Tee order must be greater than 0");
    }

    // Verify team exists
    const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
    const team = teamStmt.get(data.team_id);
    if (!team) {
      throw new Error("Team not found");
    }

    // Verify tee time exists
    const teeTimeStmt = this.db.prepare(
      "SELECT id FROM tee_times WHERE id = ?"
    );
    const teeTime = teeTimeStmt.get(data.tee_time_id);
    if (!teeTime) {
      throw new Error("Tee time not found");
    }

    const stmt = this.db.prepare(`
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, score)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const participant = stmt.get(
      data.tee_order,
      data.team_id,
      data.tee_time_id,
      data.position_name,
      data.player_names || null,
      JSON.stringify([])
    ) as Participant;

    return {
      ...participant,
      is_locked: Boolean(participant.is_locked),
      score: JSON.parse(participant.score as unknown as string),
    };
  }

  async findAll(): Promise<Participant[]> {
    const stmt = this.db.prepare("SELECT * FROM participants");
    const participants = stmt.all() as Participant[];
    return participants.map((p) => ({
      ...p,
      is_locked: Boolean(p.is_locked),
      score: JSON.parse(p.score as unknown as string),
    }));
  }

  async findById(id: number): Promise<Participant | null> {
    const stmt = this.db.prepare("SELECT * FROM participants WHERE id = ?");
    const participant = stmt.get(id) as Participant | null;
    if (!participant) return null;

    let score: any[] = [];
    try {
      score = participant.score
        ? JSON.parse(participant.score as unknown as string)
        : [];
    } catch (e) {
      score = [];
    }

    return {
      ...participant,
      is_locked: Boolean(participant.is_locked),
      score,
    };
  }

  async update(id: number, data: UpdateParticipantDto): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    if (data.position_name && !data.position_name.trim()) {
      throw new Error("Position name cannot be empty");
    }

    if (data.tee_order && data.tee_order < 1) {
      throw new Error("Tee order must be greater than 0");
    }

    if (data.team_id) {
      const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
      const team = teamStmt.get(data.team_id);
      if (!team) {
        throw new Error("Team not found");
      }
    }

    if (data.tee_time_id) {
      const teeTimeStmt = this.db.prepare(
        "SELECT id FROM tee_times WHERE id = ?"
      );
      const teeTime = teeTimeStmt.get(data.tee_time_id);
      if (!teeTime) {
        throw new Error("Tee time not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.tee_order) {
      updates.push("tee_order = ?");
      values.push(data.tee_order);
    }

    if (data.team_id) {
      updates.push("team_id = ?");
      values.push(data.team_id);
    }

    if (data.tee_time_id) {
      updates.push("tee_time_id = ?");
      values.push(data.tee_time_id);
    }

    if (data.position_name) {
      updates.push("position_name = ?");
      values.push(data.position_name);
    }

    if (data.player_names !== undefined) {
      updates.push("player_names = ?");
      values.push(data.player_names);
    }

    if (updates.length === 0) {
      return participant;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(...values) as Participant;
    return {
      ...updated,
      is_locked: Boolean(updated.is_locked),
      score: JSON.parse(updated.score as unknown as string),
    };
  }

  async findAllForCompetition(competitionId: number): Promise<Participant[]> {
    // Verify competition exists
    const competitionStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE id = ?"
    );
    const competition = competitionStmt.get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Join with tee_times to get participants for this competition
    const stmt = this.db.prepare(`
      SELECT p.* 
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = stmt.all(competitionId) as Participant[];
    return participants.map((p) => ({
      ...p,
      is_locked: Boolean(p.is_locked),
      score: JSON.parse(p.score as unknown as string),
    }));
  }

  async updateScore(
    id: number,
    hole: number,
    shots: number
  ): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Check if scorecard is locked
    if (participant.is_locked) {
      throw new Error("Scorecard is locked and cannot be modified.");
    }

    // Get the course to validate hole number
    const courseStmt = this.db.prepare(`
      SELECT co.pars
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.id = ?
    `);
    const course = courseStmt.get(id) as { pars: string } | null;
    if (!course) {
      throw new Error("Could not find course for participant");
    }

    const pars = JSON.parse(course.pars);
    if (hole < 1 || hole > pars.length) {
      throw new Error(`Hole number must be between 1 and ${pars.length}`);
    }

    // Allow -1 (gave up) and 0 (unreported/cleared score) as special values
    // Regular shots must be positive
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error(
        "Shots must be greater than 0, or -1 (gave up), or 0 (clear score)"
      );
    }

    // Initialize score array with zeros if null or empty
    let score = participant.score || [];
    if (!Array.isArray(score)) {
      score = new Array(pars.length).fill(0);
    } else {
      for (let i = 0; i < pars.length; i++) {
        if (score[i] === null || score[i] === undefined) {
          score[i] = 0;
        }
      }
    }

    score[hole - 1] = shots;

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const stringifiedScore = JSON.stringify(score);
    stmt.run(stringifiedScore, id);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Participant not found");
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const stmt = this.db.prepare("DELETE FROM participants WHERE id = ?");
    stmt.run(id);
  }

  async lock(id: number): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET is_locked = 1, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(id) as Participant;
    return {
      ...updated,
      is_locked: Boolean(updated.is_locked),
      score: JSON.parse(updated.score as unknown as string),
    };
  }

  async unlock(id: number): Promise<Participant> {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const stmt = this.db.prepare(`
      UPDATE participants 
      SET is_locked = 0, locked_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(id) as Participant;
    return {
      ...updated,
      is_locked: Boolean(updated.is_locked),
      score: JSON.parse(updated.score as unknown as string),
    };
  }
}
