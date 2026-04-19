import { Database } from "bun:sqlite";
import type {
  CreateParticipantDto,
  Participant,
  UpdateParticipantDto,
} from "../types";
import { GOLF } from "../constants/golf";
import { safeParseJsonWithDefault } from "../utils/parsing";

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface ParticipantRow {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names: string | null;
  player_id: number | null;
  score: string; // JSON string
  is_locked: number; // SQLite boolean
  locked_at: string | null;
  handicap_index: number | null;
  manual_score_out: number | null;
  manual_score_in: number | null;
  manual_score_total: number | null;
  is_dq: number | null;
  admin_notes: string | null;
  admin_modified_by: number | null;
  admin_modified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ParticipantRowWithTeam extends ParticipantRow {
  team_name: string;
}

interface ParticipantCourseInfo {
  pars: string;
  tour_id: number | null;
  player_id: number | null;
  handicap_index: number | null;
  effective_handicap_index: number | null;
}

export class ParticipantService {
  constructor(private db: Database) {}

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validatePositionName(name: string): void {
    if (!name?.trim()) {
      throw new Error("Position name is required");
    }
  }

  private validatePositionNameNotEmpty(name: string): void {
    if (!name.trim()) {
      throw new Error("Position name cannot be empty");
    }
  }

  private validateTeeOrder(order: number): void {
    if (order < 1) {
      throw new Error("Tee order must be greater than 0");
    }
  }

  private validateHoleNumber(hole: number, maxHoles: number): void {
    if (hole < 1 || hole > maxHoles) {
      throw new Error(`Hole number must be between 1 and ${maxHoles}`);
    }
  }

  private validateShotsValue(shots: number): void {
    // Allow UNREPORTED_HOLE (-1 gave up) and 0 (unreported/cleared score)
    // Regular shots must be positive
    if (shots !== GOLF.UNREPORTED_HOLE && shots !== 0 && shots < 1) {
      throw new Error(
        "Shots must be greater than 0, or -1 (gave up), or 0 (clear score)"
      );
    }
  }

  private validateTotalScore(score: number | null): void {
    if (score !== null && (score < 0 || !Number.isInteger(score))) {
      throw new Error(
        "Total score must be a non-negative integer or null to clear"
      );
    }
  }

  private validateOutInScore(score: number | null | undefined, fieldName: string): void {
    if (score !== undefined && score !== null && (score < 0 || !Number.isInteger(score))) {
      throw new Error(
        `${fieldName} score must be a non-negative integer or null to clear`
      );
    }
  }

  private validateScoreArray(score: number[]): void {
    if (!Array.isArray(score) || score.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Score must be an array of ${GOLF.HOLES_PER_ROUND} elements`);
    }

    for (let i = 0; i < score.length; i++) {
      const s = score[i];
      if (typeof s !== "number" || (s < GOLF.UNREPORTED_HOLE && s !== 0)) {
        throw new Error(`Invalid score at hole ${i + 1}: must be 0, ${GOLF.UNREPORTED_HOLE} (DNF), or positive`);
      }
    }
  }

  // ============================================================================
  // Transform Methods (private, no SQL)
  // ============================================================================

  private transformParticipantRow(row: ParticipantRow): Participant {
    return {
      ...row,
      player_name: row.player_names,
      score: this.parseScoreJson(row.score),
      is_locked: Boolean(row.is_locked),
      is_dq: Boolean(row.is_dq),
    };
  }

  private transformParticipantRowWithTeam(row: ParticipantRowWithTeam): Participant {
    return this.transformParticipantRow(row);
  }

  private parseScoreJson(json: string | null): number[] {
    return safeParseJsonWithDefault<number[]>(json, []);
  }

  private initializeScoreArray(existingScore: number[] | null | undefined, length: number): number[] {
    if (!existingScore || !Array.isArray(existingScore)) {
      return new Array(length).fill(0);
    }
    // Fill any null/undefined elements with 0
    const score = [...existingScore];
    for (let i = 0; i < length; i++) {
      if (score[i] === null || score[i] === undefined) {
        score[i] = 0;
      }
    }
    return score;
  }

  private hasRecordedHoleScores(score: number[]): boolean {
    return score.some((shots) => shots !== 0);
  }

  private hasAnyRecordedScores(participant: Participant): boolean {
    return (
      this.hasRecordedHoleScores(participant.score) ||
      participant.manual_score_out !== null ||
      participant.manual_score_in !== null ||
      participant.manual_score_total !== null
    );
  }

  private shouldCaptureHandicapSnapshot(
    courseInfo: ParticipantCourseInfo,
    participant: Participant,
    isScoringEntry: boolean
  ): boolean {
    if (courseInfo.handicap_index !== null) return false;
    if (!isScoringEntry) return false;
    return !this.hasAnyRecordedScores(participant);
  }

  private buildUpdateFields(
    data: UpdateParticipantDto
  ): { updates: string[]; values: (string | number | null)[] } {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

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

    if (data.handicap_index !== undefined) {
      updates.push("handicap_index = ?");
      values.push(data.handicap_index);
    }

    return { updates, values };
  }

  private buildManualScoreFields(
    scores: { out?: number | null; in?: number | null; total: number | null }
  ): { updates: string[]; values: (number | null)[] } {
    const updates: string[] = [];
    const values: (number | null)[] = [];

    if (scores.out !== undefined) {
      updates.push("manual_score_out = ?");
      values.push(scores.out);
    }

    if (scores.in !== undefined) {
      updates.push("manual_score_in = ?");
      values.push(scores.in);
    }

    // Total is always updated
    updates.push("manual_score_total = ?");
    values.push(scores.total);

    return { updates, values };
  }

  private determineHandicapToCapture(courseInfo: ParticipantCourseInfo): number | null {
    return courseInfo.effective_handicap_index;
  }

  // ============================================================================
  // Query Methods (private, single SQL statement each)
  // ============================================================================

  private findTeamExists(id: number): boolean {
    const row = this.db.prepare("SELECT id FROM teams WHERE id = ?").get(id);
    return row !== null;
  }

  private findTeeTimeExists(id: number): boolean {
    const row = this.db.prepare("SELECT id FROM tee_times WHERE id = ?").get(id);
    return row !== null;
  }

  private findCompetitionExists(id: number): boolean {
    const row = this.db.prepare("SELECT id FROM competitions WHERE id = ?").get(id);
    return row !== null;
  }

  private insertParticipantRow(
    teeOrder: number,
    teamId: number,
    teeTimeId: number,
    positionName: string,
    playerNames: string | null,
    playerId: number | null
  ): ParticipantRow {
    return this.db.prepare(`
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, player_id, score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      teeOrder,
      teamId,
      teeTimeId,
      positionName,
      playerNames,
      playerId,
      JSON.stringify([])
    ) as ParticipantRow;
  }

  private findAllParticipantRows(): ParticipantRow[] {
    return this.db.prepare("SELECT * FROM participants").all() as ParticipantRow[];
  }

  private findParticipantRowWithTeam(id: number): ParticipantRowWithTeam | null {
    return this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN teams te ON p.team_id = te.id
      WHERE p.id = ?
    `).get(id) as ParticipantRowWithTeam | null;
  }

  private updateParticipantRow(
    id: number,
    updates: string[],
    values: (string | number | null)[]
  ): ParticipantRow {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    return this.db.prepare(`
      UPDATE participants
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `).get(...values) as ParticipantRow;
  }

  private findParticipantRowsByCompetition(competitionId: number): ParticipantRowWithTeam[] {
    return this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams te ON p.team_id = te.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `).all(competitionId) as ParticipantRowWithTeam[];
  }

  private findParticipantCourseInfo(id: number): ParticipantCourseInfo | null {
    return this.db.prepare(`
      SELECT
        co.pars,
        c.tour_id,
        p.player_id,
        p.handicap_index,
        COALESCE(
          p.handicap_index,
          te_player.playing_handicap,
          pl.handicap,
          te_name.playing_handicap
        ) as effective_handicap_index
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN players pl ON p.player_id = pl.id
      LEFT JOIN tour_enrollments te_player
        ON p.player_id IS NOT NULL
        AND te_player.player_id = p.player_id
        AND te_player.tour_id = c.tour_id
        AND te_player.status = 'active'
      LEFT JOIN tour_enrollments te_name
        ON p.player_id IS NULL
        AND te_name.player_id IS NULL
        AND te_name.tour_id = c.tour_id
        AND te_name.status = 'active'
        AND LOWER(TRIM(COALESCE(te_name.name, ''))) =
            LOWER(TRIM(COALESCE(p.player_names, p.position_name, '')))
      WHERE p.id = ?
    `).get(id) as ParticipantCourseInfo | null;
  }

  private updateScoreRow(id: number, scoreJson: string): void {
    this.db.prepare(`
      UPDATE participants
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, id);
  }

  private updateScoreWithHandicapRow(id: number, scoreJson: string, handicapIndex: number): void {
    this.db.prepare(`
      UPDATE participants
      SET score = ?, handicap_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, handicapIndex, id);
  }

  private deleteParticipantRow(id: number): void {
    this.db.prepare("DELETE FROM participants WHERE id = ?").run(id);
  }

  private updateLockedRow(id: number, isLocked: boolean): ParticipantRow {
    if (isLocked) {
      return this.db.prepare(`
        UPDATE participants
        SET is_locked = 1, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(id) as ParticipantRow;
    } else {
      return this.db.prepare(`
        UPDATE participants
        SET is_locked = 0, locked_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(id) as ParticipantRow;
    }
  }

  private updateManualScoreRow(
    id: number,
    updates: string[],
    values: (number | null)[]
  ): void {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    this.db.prepare(`
      UPDATE participants
      SET ${updates.join(", ")}
      WHERE id = ?
    `).run(...values);
  }

  private updateManualScoreWithHandicapRow(
    id: number,
    updates: string[],
    values: (number | null)[],
    handicapIndex: number
  ): void {
    updates.push("handicap_index = ?");
    values.push(handicapIndex);
    this.updateManualScoreRow(id, updates, values);
  }

  private updateDQRow(
    id: number,
    isDQ: boolean,
    adminNotes: string | null,
    adminUserId: number
  ): void {
    this.db.prepare(`
      UPDATE participants
      SET is_dq = ?,
          admin_notes = ?,
          admin_modified_by = ?,
          admin_modified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(isDQ ? 1 : 0, adminNotes, adminUserId, id);
  }

  private updateAdminScoreRow(
    id: number,
    scoreJson: string,
    adminNotes: string | null,
    adminUserId: number
  ): void {
    this.db.prepare(`
      UPDATE participants
      SET score = ?,
          admin_notes = ?,
          admin_modified_by = ?,
          admin_modified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, adminNotes, adminUserId, id);
  }

  private updateAdminScoreWithHandicapRow(
    id: number,
    scoreJson: string,
    handicapIndex: number,
    adminNotes: string | null,
    adminUserId: number
  ): void {
    this.db.prepare(`
      UPDATE participants
      SET score = ?,
          handicap_index = ?,
          admin_notes = ?,
          admin_modified_by = ?,
          admin_modified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, handicapIndex, adminNotes, adminUserId, id);
  }

  // ============================================================================
  // Public API Methods (orchestration only)
  // ============================================================================

  async create(data: CreateParticipantDto): Promise<Participant> {
    this.validatePositionName(data.position_name);
    this.validateTeeOrder(data.tee_order);

    if (!this.findTeamExists(data.team_id)) {
      throw new Error("Team not found");
    }

    if (!this.findTeeTimeExists(data.tee_time_id)) {
      throw new Error("Tee time not found");
    }

    const row = this.insertParticipantRow(
      data.tee_order,
      data.team_id,
      data.tee_time_id,
      data.position_name,
      data.player_names || null,
      data.player_id || null
    );

    return this.transformParticipantRow(row);
  }

  async findAll(): Promise<Participant[]> {
    const rows = this.findAllParticipantRows();
    return rows.map((row) => this.transformParticipantRow(row));
  }

  async findById(id: number): Promise<Participant | null> {
    const row = this.findParticipantRowWithTeam(id);
    if (!row) return null;

    const participant = this.transformParticipantRowWithTeam(row);
    return {
      ...participant,
      handicap_index: row.handicap_index,
    };
  }

  async update(id: number, data: UpdateParticipantDto): Promise<Participant> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }

    if (data.position_name) {
      this.validatePositionNameNotEmpty(data.position_name);
    }

    if (data.tee_order) {
      this.validateTeeOrder(data.tee_order);
    }

    if (data.team_id && !this.findTeamExists(data.team_id)) {
      throw new Error("Team not found");
    }

    if (data.tee_time_id && !this.findTeeTimeExists(data.tee_time_id)) {
      throw new Error("Tee time not found");
    }

    const { updates, values } = this.buildUpdateFields(data);

    if (updates.length === 0) {
      return existing;
    }

    const row = this.updateParticipantRow(id, updates, values);
    return this.transformParticipantRow(row);
  }

  async findAllForCompetition(competitionId: number): Promise<Participant[]> {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }

    const rows = this.findParticipantRowsByCompetition(competitionId);
    return rows.map((row) => this.transformParticipantRowWithTeam(row));
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

    if (participant.is_locked) {
      throw new Error("Scorecard is locked and cannot be modified.");
    }

    const courseInfo = this.findParticipantCourseInfo(id);
    if (!courseInfo) {
      throw new Error("Could not find course for participant");
    }

    const pars = safeParseJsonWithDefault<number[]>(courseInfo.pars, []);
    this.validateHoleNumber(hole, pars.length);
    this.validateShotsValue(shots);

    const score = this.initializeScoreArray(participant.score, pars.length);

    // Determine if handicap should be captured on first score entry
    let capturedHandicapIndex: number | null = null;
    if (this.shouldCaptureHandicapSnapshot(courseInfo, participant, shots !== 0)) {
      capturedHandicapIndex = this.determineHandicapToCapture(courseInfo);
    }

    score[hole - 1] = shots;

    // Update score and optionally capture handicap snapshot
    if (capturedHandicapIndex !== null) {
      this.updateScoreWithHandicapRow(id, JSON.stringify(score), capturedHandicapIndex);
    } else {
      this.updateScoreRow(id, JSON.stringify(score));
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Participant not found");
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }

    this.deleteParticipantRow(id);
  }

  async lock(id: number): Promise<Participant> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }

    const row = this.updateLockedRow(id, true);
    return this.transformParticipantRow(row);
  }

  async unlock(id: number): Promise<Participant> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }

    const row = this.updateLockedRow(id, false);
    return this.transformParticipantRow(row);
  }

  async updateManualScore(
    participantId: number,
    scores: { out?: number | null; in?: number | null; total: number | null }
  ): Promise<Participant> {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }

    this.validateTotalScore(scores.total);
    this.validateOutInScore(scores.out, "Out");
    this.validateOutInScore(scores.in, "In");

    const { updates, values } = this.buildManualScoreFields(scores);
    const courseInfo = this.findParticipantCourseInfo(participantId);
    if (!courseInfo) {
      throw new Error("Could not find course for participant");
    }

    const capturedHandicapIndex = this.shouldCaptureHandicapSnapshot(
      courseInfo,
      existing,
      scores.total !== null
    )
      ? this.determineHandicapToCapture(courseInfo)
      : null;

    if (capturedHandicapIndex !== null) {
      this.updateManualScoreWithHandicapRow(
        participantId,
        updates,
        values,
        capturedHandicapIndex
      );
    } else {
      this.updateManualScoreRow(participantId, updates, values);
    }

    const row = this.findParticipantRowWithTeam(participantId);
    if (!row) {
      throw new Error("Participant not found after update");
    }
    return this.transformParticipantRowWithTeam(row);
  }

  async adminSetDQ(
    participantId: number,
    isDQ: boolean,
    adminNotes: string | undefined,
    adminUserId: number
  ): Promise<Participant> {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }

    this.updateDQRow(participantId, isDQ, adminNotes || null, adminUserId);

    const updated = await this.findById(participantId);
    if (!updated) {
      throw new Error("Participant not found after update");
    }
    return updated;
  }

  async adminUpdateScore(
    participantId: number,
    score: number[],
    adminNotes: string | undefined,
    adminUserId: number
  ): Promise<Participant> {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }

    this.validateScoreArray(score);
    const courseInfo = this.findParticipantCourseInfo(participantId);
    if (!courseInfo) {
      throw new Error("Could not find course for participant");
    }

    const capturedHandicapIndex = this.shouldCaptureHandicapSnapshot(
      courseInfo,
      existing,
      this.hasRecordedHoleScores(score)
    )
      ? this.determineHandicapToCapture(courseInfo)
      : null;

    if (capturedHandicapIndex !== null) {
      this.updateAdminScoreWithHandicapRow(
        participantId,
        JSON.stringify(score),
        capturedHandicapIndex,
        adminNotes || null,
        adminUserId
      );
    } else {
      this.updateAdminScoreRow(
        participantId,
        JSON.stringify(score),
        adminNotes || null,
        adminUserId
      );
    }

    const updated = await this.findById(participantId);
    if (!updated) {
      throw new Error("Participant not found after update");
    }
    return updated;
  }
}
