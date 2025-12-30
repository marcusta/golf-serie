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
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, player_id, score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const participant = stmt.get(
      data.tee_order,
      data.team_id,
      data.tee_time_id,
      data.position_name,
      data.player_names || null,
      data.player_id || null,
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
    const stmt = this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN teams te ON p.team_id = te.id
      WHERE p.id = ?
    `);
    const participant = stmt.get(id) as (Participant & { handicap_index: number | null }) | null;
    if (!participant) return null;

    let score: number[] = [];
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
      handicap_index: participant.handicap_index ?? undefined,
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

    // Join with tee_times and teams to get participants for this competition with team names
    const stmt = this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams te ON p.team_id = te.id
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

    // Get the course to validate hole number, plus competition/tour info for handicap snapshot
    const courseStmt = this.db.prepare(`
      SELECT co.pars, c.tour_id, p.player_id, p.handicap_index
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.id = ?
    `);
    const courseInfo = courseStmt.get(id) as {
      pars: string;
      tour_id: number | null;
      player_id: number | null;
      handicap_index: number | null;
    } | null;
    if (!courseInfo) {
      throw new Error("Could not find course for participant");
    }

    const pars = JSON.parse(courseInfo.pars);
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

    // Check if this is the first score being entered (snapshot handicap at time of playing)
    // Only capture if: has player_id, no handicap_index yet, no scores entered yet
    let shouldCaptureHandicap = false;
    let capturedHandicapIndex: number | null = null;

    if (
      courseInfo.player_id &&
      courseInfo.handicap_index === null &&
      shots > 0 // Only capture on actual score entry, not clears
    ) {
      // Check if all existing scores are 0 (no scores entered yet)
      const hasExistingScores = score.some((s: number) => s > 0 || s === -1);
      if (!hasExistingScores) {
        // Look up current handicap from tour enrollment or player record
        if (courseInfo.tour_id) {
          const handicapStmt = this.db.prepare(`
            SELECT COALESCE(te.playing_handicap, pl.handicap) as handicap_index
            FROM players pl
            LEFT JOIN tour_enrollments te ON te.player_id = pl.id AND te.tour_id = ? AND te.status = 'active'
            WHERE pl.id = ?
          `);
          const handicapResult = handicapStmt.get(
            courseInfo.tour_id,
            courseInfo.player_id
          ) as { handicap_index: number | null } | null;
          if (handicapResult && handicapResult.handicap_index !== null) {
            shouldCaptureHandicap = true;
            capturedHandicapIndex = handicapResult.handicap_index;
          }
        } else {
          // Non-tour competition, just use player's default handicap
          const handicapStmt = this.db.prepare(
            "SELECT handicap FROM players WHERE id = ?"
          );
          const handicapResult = handicapStmt.get(courseInfo.player_id) as {
            handicap: number | null;
          } | null;
          if (handicapResult && handicapResult.handicap !== null) {
            shouldCaptureHandicap = true;
            capturedHandicapIndex = handicapResult.handicap;
          }
        }
      }
    }

    score[hole - 1] = shots;

    // Update score and optionally capture handicap snapshot
    if (shouldCaptureHandicap && capturedHandicapIndex !== null) {
      const stmt = this.db.prepare(`
        UPDATE participants
        SET score = ?, handicap_index = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(JSON.stringify(score), capturedHandicapIndex, id);
    } else {
      const stmt = this.db.prepare(`
        UPDATE participants
        SET score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(JSON.stringify(score), id);
    }

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

  async updateManualScore(
    participantId: number,
    scores: { out?: number | null; in?: number | null; total: number | null }
  ): Promise<Participant> {
    // Validate that the participant exists
    const participant = await this.findById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Validate total score (allow null for clearing, otherwise non-negative integer)
    if (
      scores.total !== null &&
      (scores.total < 0 || !Number.isInteger(scores.total))
    ) {
      throw new Error(
        "Total score must be a non-negative integer or null to clear"
      );
    }

    // Validate optional out/in scores if provided (allow null for clearing)
    if (
      scores.out !== undefined &&
      scores.out !== null &&
      (scores.out < 0 || !Number.isInteger(scores.out))
    ) {
      throw new Error(
        "Out score must be a non-negative integer or null to clear"
      );
    }
    if (
      scores.in !== undefined &&
      scores.in !== null &&
      (scores.in < 0 || !Number.isInteger(scores.in))
    ) {
      throw new Error(
        "In score must be a non-negative integer or null to clear"
      );
    }

    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (scores.out !== undefined) {
      updates.push("manual_score_out = ?");
      values.push(scores.out);
    }

    if (scores.in !== undefined) {
      updates.push("manual_score_in = ?");
      values.push(scores.in);
    }

    // Total is always updated (including null for clearing)
    updates.push("manual_score_total = ?");
    values.push(scores.total);

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(participantId);

    // Execute UPDATE SQL query
    const stmt = this.db.prepare(`
      UPDATE participants 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Fetch the updated participant with team name using JOIN
    const selectStmt = this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN teams te ON p.team_id = te.id
      WHERE p.id = ?
    `);

    const updated = selectStmt.get(participantId) as Participant;
    return {
      ...updated,
      is_locked: Boolean(updated.is_locked),
      score: JSON.parse(updated.score as unknown as string),
    };
  }
}
