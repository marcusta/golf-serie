import { Database } from "bun:sqlite";
import type {
  TourCompetitionRegistration,
  TourCompetitionRegistrationWithDetails,
  RegistrationMode,
  RegistrationStatus,
  AvailablePlayer,
  PlayingGroup,
  RegistrationResponse,
  ActiveRound,
  CompetitionGroup,
  CompetitionGroupStatus,
  CompetitionGroupMember,
} from "../types";
import { GOLF } from "../constants/golf";
import { safeParseJson } from "../utils/parsing";

// ============================================================================
// Constants
// ============================================================================

const MAX_GROUP_SIZE = 4;

// ============================================================================
// Internal Types
// ============================================================================

interface CompetitionRow {
  id: number;
  tour_id: number | null;
  start_mode: string;
  open_start: string | null;
  open_end: string | null;
}

interface PlayerRow {
  id: number;
  name: string;
  handicap: number | null;
}

interface EnrollmentRow {
  id: number;
}

interface TeeTimeRow {
  id: number;
}

interface ParticipantRow {
  id: number;
}

interface RegistrationRoundRow {
  tour_id: number;
  tour_name: string;
  competition_id: number;
  competition_name: string;
  course_name: string;
  tee_time_id: number;
  participant_id: number;
  registration_status: string;
  open_until: string | null;
  score: string;
}

interface GroupParticipantRow {
  tee_time_id: number;
  participant_id: number;
  player_names: string | null;
  score: string | null;
  is_locked: boolean;
  is_dq: number | null;
  team_name: string | null;
  player_id: number | null;
  registration_status: RegistrationStatus | null;
  started_at: string | null;
  finished_at: string | null;
  handicap: number | null;
  category_name: string | null;
}

interface AvailablePlayerRow {
  player_id: number;
  name: string;
  handicap: number | null;
  registration_status: RegistrationStatus | null;
  group_tee_time_id: number | null;
}

interface GroupMemberRow {
  player_id: number;
  name: string;
  handicap: number | null;
}

interface GroupMemberWithHandicapRow {
  name: string;
  handicap: number | null;
}

export class TourCompetitionRegistrationService {
  constructor(private db: Database) {}

  // ==========================================================================
  // Query Methods (private, single SQL statement)
  // ==========================================================================

  private findCompetitionWithTour(competitionId: number): CompetitionRow | null {
    return this.db
      .prepare(
        `SELECT c.id, c.tour_id, c.start_mode, c.open_start, c.open_end
         FROM competitions c
         WHERE c.id = ?`
      )
      .get(competitionId) as CompetitionRow | null;
  }

  private findCompetitionTourId(competitionId: number): number | null {
    const row = this.db
      .prepare("SELECT tour_id FROM competitions WHERE id = ?")
      .get(competitionId) as { tour_id: number | null } | null;
    return row?.tour_id ?? null;
  }

  private findCoursePars(competitionId: number): string | null {
    const row = this.db
      .prepare(
        `SELECT co.pars
         FROM competitions c
         JOIN courses co ON c.course_id = co.id
         WHERE c.id = ?`
      )
      .get(competitionId) as { pars: string } | null;
    return row?.pars ?? null;
  }

  private findPlayerById(playerId: number): PlayerRow | null {
    return this.db
      .prepare("SELECT id, name, handicap FROM players WHERE id = ?")
      .get(playerId) as PlayerRow | null;
  }

  private findPlayerName(playerId: number): string | null {
    const row = this.db
      .prepare("SELECT name FROM players WHERE id = ?")
      .get(playerId) as { name: string } | null;
    return row?.name ?? null;
  }

  private findActiveEnrollment(
    tourId: number,
    playerId: number
  ): EnrollmentRow | null {
    return this.db
      .prepare(
        `SELECT id FROM tour_enrollments
         WHERE tour_id = ? AND player_id = ? AND status = 'active'`
      )
      .get(tourId, playerId) as EnrollmentRow | null;
  }

  private findRegistrationRow(
    competitionId: number,
    playerId: number
  ): TourCompetitionRegistration | null {
    return this.db
      .prepare(
        `SELECT * FROM tour_competition_registrations
         WHERE competition_id = ? AND player_id = ?`
      )
      .get(competitionId, playerId) as TourCompetitionRegistration | null;
  }

  private findRegistrationsByCompetition(
    competitionId: number
  ): TourCompetitionRegistrationWithDetails[] {
    return this.db
      .prepare(
        `SELECT r.*, p.name as player_name, p.handicap, tc.name as category_name
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         LEFT JOIN tour_enrollments te ON r.enrollment_id = te.id
         LEFT JOIN tour_categories tc ON te.category_id = tc.id
         WHERE r.competition_id = ?
         ORDER BY r.registered_at`
      )
      .all(competitionId) as TourCompetitionRegistrationWithDetails[];
  }

  private findAvailablePlayersForCompetition(
    competitionId: number,
    tourId: number
  ): AvailablePlayerRow[] {
    return this.db
      .prepare(
        `SELECT
          p.id as player_id,
          p.name,
          COALESCE(te.playing_handicap, p.handicap) as handicap,
          r.status as registration_status,
          r.tee_time_id as group_tee_time_id
         FROM tour_enrollments te
         JOIN players p ON te.player_id = p.id
         LEFT JOIN tour_competition_registrations r
           ON r.competition_id = ? AND r.player_id = p.id
         WHERE te.tour_id = ? AND te.status = 'active' AND te.player_id IS NOT NULL
         ORDER BY
           CASE WHEN r.status = 'looking_for_group' THEN 0 ELSE 1 END,
           p.name`
      )
      .all(competitionId, tourId) as AvailablePlayerRow[];
  }

  private findTeamByName(name: string): { id: number } | null {
    return this.db
      .prepare("SELECT id FROM teams WHERE name = ?")
      .get(name) as { id: number } | null;
  }

  private insertTeamRow(name: string): { id: number } {
    return this.db
      .prepare("INSERT INTO teams (name) VALUES (?) RETURNING id")
      .get(name) as { id: number };
  }

  private insertTeeTimeRow(competitionId: number): TeeTimeRow {
    return this.db
      .prepare(
        `INSERT INTO tee_times (teetime, competition_id, start_hole)
         VALUES ('', ?, 1)
         RETURNING id`
      )
      .get(competitionId) as TeeTimeRow;
  }

  private insertParticipantRow(
    teamId: number,
    teeTimeId: number,
    playerId: number,
    playerName: string,
    teeOrder: number = 1
  ): ParticipantRow {
    return this.db
      .prepare(
        `INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score)
         VALUES (?, ?, ?, 'Player', ?, ?, '[]')
         RETURNING id`
      )
      .get(teeOrder, teamId, teeTimeId, playerId, playerName) as ParticipantRow;
  }

  private insertRegistrationRow(
    competitionId: number,
    playerId: number,
    enrollmentId: number,
    teeTimeId: number,
    participantId: number,
    status: RegistrationStatus,
    groupCreatedBy: number | null
  ): TourCompetitionRegistration {
    return this.db
      .prepare(
        `INSERT INTO tour_competition_registrations
         (competition_id, player_id, enrollment_id, tee_time_id, participant_id, status, group_created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(
        competitionId,
        playerId,
        enrollmentId,
        teeTimeId,
        participantId,
        status,
        groupCreatedBy
      ) as TourCompetitionRegistration;
  }

  private deleteParticipantRow(participantId: number): void {
    this.db.prepare("DELETE FROM participants WHERE id = ?").run(participantId);
  }

  private findParticipantCountByTeeTime(teeTimeId: number): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM participants WHERE tee_time_id = ?"
      )
      .get(teeTimeId) as { count: number };
    return row.count;
  }

  private findRegistrationCountByTeeTime(teeTimeId: number): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM tour_competition_registrations
         WHERE tee_time_id = ?`
      )
      .get(teeTimeId) as { count: number };
    return row.count;
  }

  private deleteTeeTimeRow(teeTimeId: number): void {
    this.db.prepare("DELETE FROM tee_times WHERE id = ?").run(teeTimeId);
  }

  private deleteRegistrationRow(registrationId: number): void {
    this.db
      .prepare("DELETE FROM tour_competition_registrations WHERE id = ?")
      .run(registrationId);
  }

  private updateRegistrationStatusRow(
    registrationId: number,
    status: RegistrationStatus
  ): void {
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET status = ?
         WHERE id = ?`
      )
      .run(status, registrationId);
  }

  private updateRegistrationStartedRow(registrationId: number): void {
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET status = 'playing', started_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(registrationId);
  }

  private updateRegistrationFinishedRow(registrationId: number): void {
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET status = 'finished', finished_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(registrationId);
  }

  private findGroupMembersByTeeTime(teeTimeId: number): GroupMemberRow[] {
    return this.db
      .prepare(
        `SELECT r.player_id, p.name, COALESCE(te.playing_handicap, p.handicap) as handicap
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         JOIN tour_enrollments te ON r.enrollment_id = te.id
         WHERE r.tee_time_id = ?
         ORDER BY r.registered_at`
      )
      .all(teeTimeId) as GroupMemberRow[];
  }

  private findActiveRoundsForPlayer(playerId: number): RegistrationRoundRow[] {
    return this.db
      .prepare(
        `SELECT
          t.id as tour_id,
          t.name as tour_name,
          c.id as competition_id,
          c.name as competition_name,
          co.name as course_name,
          r.tee_time_id,
          r.participant_id,
          r.status as registration_status,
          c.open_end as open_until,
          p.score
         FROM tour_competition_registrations r
         JOIN competitions c ON r.competition_id = c.id
         JOIN tours t ON c.tour_id = t.id
         JOIN courses co ON c.course_id = co.id
         JOIN participants p ON r.participant_id = p.id
         WHERE r.player_id = ? AND r.status IN ('registered', 'playing', 'looking_for_group', 'finished')
         ORDER BY c.date DESC`
      )
      .all(playerId) as RegistrationRoundRow[];
  }

  private findGroupMembersExcludingPlayer(
    teeTimeId: number,
    excludePlayerId: number
  ): GroupMemberWithHandicapRow[] {
    return this.db
      .prepare(
        `SELECT p.name, COALESCE(te.playing_handicap, p.handicap) as handicap
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         JOIN tour_enrollments te ON r.enrollment_id = te.id
         WHERE r.tee_time_id = ? AND r.player_id != ?`
      )
      .all(teeTimeId, excludePlayerId) as GroupMemberWithHandicapRow[];
  }

  private findCompetitionGroupParticipants(
    competitionId: number
  ): GroupParticipantRow[] {
    return this.db
      .prepare(
        `SELECT
          tt.id as tee_time_id,
          par.id as participant_id,
          par.player_names,
          par.score,
          par.is_locked,
          par.is_dq,
          tm.name as team_name,
          par.player_id,
          r.status as registration_status,
          r.started_at,
          r.finished_at,
          COALESCE(par.handicap_index, te.playing_handicap, pl.handicap) as handicap,
          tc.name as category_name
         FROM tee_times tt
         JOIN competitions c ON tt.competition_id = c.id
         JOIN participants par ON par.tee_time_id = tt.id
         LEFT JOIN teams tm ON par.team_id = tm.id
         LEFT JOIN players pl ON par.player_id = pl.id
         LEFT JOIN tour_enrollments te ON par.player_id = te.player_id AND c.tour_id = te.tour_id
         LEFT JOIN tour_categories tc ON te.category_id = tc.id
         LEFT JOIN tour_competition_registrations r ON r.participant_id = par.id
         WHERE tt.competition_id = ?
         ORDER BY tt.id, par.tee_order`
      )
      .all(competitionId) as GroupParticipantRow[];
  }

  private findMaxTeeOrderForTeeTime(teeTimeId: number): number {
    const row = this.db
      .prepare(
        `SELECT MAX(tee_order) as max_order FROM participants WHERE tee_time_id = ?`
      )
      .get(teeTimeId) as { max_order: number | null };
    return row.max_order ?? 0;
  }

  private updateParticipantTeeTime(
    participantId: number,
    teeTimeId: number,
    teeOrder: number
  ): void {
    this.db
      .prepare(
        `UPDATE participants
         SET tee_time_id = ?, tee_order = ?
         WHERE id = ?`
      )
      .run(teeTimeId, teeOrder, participantId);
  }

  private updateRegistrationTeeTime(
    registrationId: number,
    teeTimeId: number,
    groupCreatedBy: number | null
  ): void {
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET tee_time_id = ?, status = 'registered', group_created_by = ?
         WHERE id = ?`
      )
      .run(teeTimeId, groupCreatedBy, registrationId);
  }

  private updateRegistrationTeeTimeOnly(
    registrationId: number,
    teeTimeId: number
  ): void {
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET tee_time_id = ?, group_created_by = NULL
         WHERE id = ?`
      )
      .run(teeTimeId, registrationId);
  }

  // ==========================================================================
  // Logic Methods (private, no SQL)
  // ==========================================================================

  private validateCompetitionOpen(competition: CompetitionRow): void {
    const now = new Date();
    if (competition.open_start && new Date(competition.open_start) > now) {
      throw new Error("Competition has not opened yet");
    }
    if (competition.open_end && new Date(competition.open_end) < now) {
      throw new Error("Competition has closed");
    }
  }

  private validateNotPlayingOrFinished(
    status: RegistrationStatus,
    action: string = "modify"
  ): void {
    if (status === "playing" || status === "finished") {
      throw new Error(`Cannot ${action} after starting to play`);
    }
  }

  private validateCanStartPlaying(status: RegistrationStatus): void {
    if (status !== "registered" && status !== "looking_for_group") {
      throw new Error("Invalid status for starting play");
    }
  }

  private validateCanFinishPlaying(status: RegistrationStatus): void {
    if (status !== "playing") {
      throw new Error("Must be playing to finish");
    }
  }

  private determineInitialStatus(mode: RegistrationMode): RegistrationStatus {
    return mode === "looking_for_group" ? "looking_for_group" : "registered";
  }

  private determineGroupCreatedBy(
    mode: RegistrationMode,
    playerId: number
  ): number | null {
    return mode === "create_group" ? playerId : null;
  }

  private mapToAvailableStatus(
    status: RegistrationStatus | null
  ): AvailablePlayer["status"] {
    if (!status) return "available";
    switch (status) {
      case "looking_for_group":
        return "looking_for_group";
      case "registered":
        return "in_group";
      case "playing":
        return "playing";
      case "finished":
        return "finished";
      case "withdrawn":
        return "available";
      default:
        return "available";
    }
  }

  private parseScoreArray(scoreJson: string | null): number[] {
    if (!scoreJson) return [];
    return safeParseJson<number[]>(scoreJson, []);
  }

  private calculateHolesPlayed(scores: number[]): number {
    return scores.filter((s) => s > 0).length;
  }

  private calculateRelativeToPar(scores: number[], pars: number[]): number {
    let relativeToPar = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0 && pars[i]) {
        relativeToPar += scores[i] - pars[i];
      }
    }
    return relativeToPar;
  }

  private formatScoreDisplay(relativeToPar: number): string {
    if (relativeToPar === 0) return "E";
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
  }

  private formatScoreDisplayWithDash(relativeToPar: number, holesPlayed: number): string {
    if (holesPlayed === 0) return "-";
    return this.formatScoreDisplay(relativeToPar);
  }

  private isRoundExpired(openUntil: string | null): boolean {
    if (!openUntil) return false;
    return new Date(openUntil) < new Date();
  }

  private isRoundFinished(
    registrationStatus: string,
    holesPlayed: number
  ): boolean {
    return (
      registrationStatus === "finished" ||
      holesPlayed === GOLF.HOLES_PER_ROUND
    );
  }

  private buildPlayingGroup(
    teeTimeId: number,
    members: GroupMemberRow[],
    currentPlayerId?: number
  ): PlayingGroup {
    return {
      tee_time_id: teeTimeId,
      players: members.map((m) => ({
        player_id: m.player_id,
        name: m.name,
        handicap: m.handicap ?? undefined,
        is_you: m.player_id === currentPlayerId,
      })),
      max_players: MAX_GROUP_SIZE,
    };
  }

  private groupParticipantsByTeeTime(
    participants: GroupParticipantRow[]
  ): Map<number, GroupParticipantRow[]> {
    const groupMap = new Map<number, GroupParticipantRow[]>();
    for (const p of participants) {
      if (!groupMap.has(p.tee_time_id)) {
        groupMap.set(p.tee_time_id, []);
      }
      groupMap.get(p.tee_time_id)!.push(p);
    }
    return groupMap;
  }

  private determineMemberStatus(
    member: GroupParticipantRow,
    holesPlayed: number
  ): { status: RegistrationStatus; isPlaying: boolean; isFinished: boolean } {
    let status: RegistrationStatus = "registered";
    let isPlaying = false;
    let isFinished = true;

    if (member.is_locked) {
      status = "finished";
    } else if (member.registration_status === "playing" || holesPlayed > 0) {
      status = "playing";
      isPlaying = true;
      isFinished = false;
    } else if (member.registration_status === "finished") {
      status = "finished";
    } else {
      isFinished = false;
    }

    return { status, isPlaying, isFinished };
  }

  private determineGroupStatus(
    hasPlaying: boolean,
    allFinished: boolean,
    allLocked: boolean
  ): CompetitionGroupStatus {
    if (allFinished && allLocked) {
      return "finished";
    } else if (hasPlaying) {
      return "on_course";
    }
    return "registered";
  }

  private sortGroupsByStatus(groups: CompetitionGroup[]): CompetitionGroup[] {
    const statusOrder: Record<CompetitionGroupStatus, number> = {
      on_course: 0,
      registered: 1,
      finished: 2,
    };
    return groups.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }

  private getTourTeamName(tourId: number): string {
    return `Tour ${tourId} Players`;
  }

  // ==========================================================================
  // Public API Methods (orchestration)
  // ==========================================================================

  /**
   * Register a player for an open-start competition
   * Creates tee_time and participant automatically
   */
  async register(
    competitionId: number,
    playerId: number,
    mode: RegistrationMode
  ): Promise<RegistrationResponse> {
    const competition = this.findCompetitionWithTour(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    if (!competition.tour_id) {
      throw new Error("Competition is not part of a tour");
    }

    if (competition.start_mode !== "open") {
      throw new Error("Competition is not in open-start mode");
    }

    this.validateCompetitionOpen(competition);

    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const enrollment = this.findActiveEnrollment(competition.tour_id, playerId);
    if (!enrollment) {
      throw new Error("Player is not enrolled in this tour");
    }

    const existing = await this.getRegistration(competitionId, playerId);
    if (existing) {
      throw new Error("Player is already registered for this competition");
    }

    const teamId = await this.getOrCreateTourTeam(competition.tour_id);
    const teeTime = this.insertTeeTimeRow(competitionId);
    const participant = this.insertParticipantRow(
      teamId,
      teeTime.id,
      playerId,
      player.name
    );

    const status = this.determineInitialStatus(mode);
    const groupCreatedBy = this.determineGroupCreatedBy(mode, playerId);

    const registration = this.insertRegistrationRow(
      competitionId,
      playerId,
      enrollment.id,
      teeTime.id,
      participant.id,
      status,
      groupCreatedBy
    );

    const response: RegistrationResponse = { registration };

    if (mode !== "looking_for_group") {
      response.group = await this.getGroupByTeeTime(teeTime.id, playerId);
    }

    return response;
  }

  /**
   * Withdraw a player from a competition
   */
  async withdraw(competitionId: number, playerId: number): Promise<void> {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    this.validateNotPlayingOrFinished(registration.status, "withdraw");

    if (registration.participant_id) {
      this.deleteParticipantRow(registration.participant_id);
    }

    if (registration.tee_time_id) {
      const remainingCount = this.findParticipantCountByTeeTime(
        registration.tee_time_id
      );
      if (remainingCount === 0) {
        this.deleteTeeTimeRow(registration.tee_time_id);
      }
    }

    this.deleteRegistrationRow(registration.id);
  }

  /**
   * Get a player's registration for a competition
   */
  async getRegistration(
    competitionId: number,
    playerId: number
  ): Promise<TourCompetitionRegistration | null> {
    return this.findRegistrationRow(competitionId, playerId);
  }

  /**
   * Get all registrations for a competition
   */
  async getRegistrationsForCompetition(
    competitionId: number
  ): Promise<TourCompetitionRegistrationWithDetails[]> {
    return this.findRegistrationsByCompetition(competitionId);
  }

  /**
   * Get available players for group formation
   * Returns enrolled players with their current status
   */
  async getAvailablePlayers(competitionId: number): Promise<AvailablePlayer[]> {
    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found or not part of a tour");
    }

    const players = this.findAvailablePlayersForCompetition(competitionId, tourId);

    return players.map((p) => ({
      player_id: p.player_id,
      name: p.name,
      handicap: p.handicap ?? undefined,
      status: this.mapToAvailableStatus(p.registration_status),
      group_tee_time_id: p.group_tee_time_id ?? undefined,
    }));
  }

  /**
   * Add player(s) to the current player's group
   */
  async addToGroup(
    competitionId: number,
    groupCreatorPlayerId: number,
    playerIdsToAdd: number[]
  ): Promise<PlayingGroup> {
    const creatorReg = await this.getRegistration(
      competitionId,
      groupCreatorPlayerId
    );
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }

    this.validateNotPlayingOrFinished(creatorReg.status, "modify group");

    const currentMembers = await this.getGroupMemberCount(creatorReg.tee_time_id);
    if (currentMembers + playerIdsToAdd.length > MAX_GROUP_SIZE) {
      throw new Error(
        `Cannot add ${playerIdsToAdd.length} players. Group would exceed ${MAX_GROUP_SIZE} players.`
      );
    }

    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found");
    }

    const teamId = await this.getOrCreateTourTeam(tourId);

    for (const playerId of playerIdsToAdd) {
      await this.addPlayerToGroup(
        competitionId,
        playerId,
        creatorReg.tee_time_id,
        teamId,
        groupCreatorPlayerId
      );
    }

    return this.getGroupByTeeTime(creatorReg.tee_time_id, groupCreatorPlayerId);
  }

  /**
   * Remove a player from the group (by group creator)
   */
  async removeFromGroup(
    competitionId: number,
    groupCreatorPlayerId: number,
    playerIdToRemove: number
  ): Promise<PlayingGroup> {
    const creatorReg = await this.getRegistration(
      competitionId,
      groupCreatorPlayerId
    );
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }

    const targetReg = await this.getRegistration(competitionId, playerIdToRemove);
    if (!targetReg || targetReg.tee_time_id !== creatorReg.tee_time_id) {
      throw new Error("Player is not in your group");
    }

    if (targetReg.status === "playing" || targetReg.status === "finished") {
      throw new Error("Cannot remove player who has started playing");
    }

    if (playerIdToRemove === groupCreatorPlayerId) {
      throw new Error("Use leaveGroup to remove yourself");
    }

    await this.movePlayerToSoloGroup(competitionId, playerIdToRemove);

    return this.getGroupByTeeTime(creatorReg.tee_time_id, groupCreatorPlayerId);
  }

  /**
   * Leave the current group and become solo
   */
  async leaveGroup(competitionId: number, playerId: number): Promise<PlayingGroup> {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    this.validateNotPlayingOrFinished(registration.status, "leave group");

    await this.movePlayerToSoloGroup(competitionId, playerId);

    const newReg = await this.getRegistration(competitionId, playerId);
    return this.getGroupByTeeTime(newReg!.tee_time_id!, playerId);
  }

  /**
   * Get group members by tee time
   */
  async getGroupByTeeTime(
    teeTimeId: number,
    currentPlayerId?: number
  ): Promise<PlayingGroup> {
    const members = this.findGroupMembersByTeeTime(teeTimeId);
    return this.buildPlayingGroup(teeTimeId, members, currentPlayerId);
  }

  /**
   * Get count of members in a group
   */
  async getGroupMemberCount(teeTimeId: number): Promise<number> {
    return this.findRegistrationCountByTeeTime(teeTimeId);
  }

  /**
   * Start playing - mark registration as playing
   * Returns the tee_time_id for navigation to scorecard
   */
  async startPlaying(competitionId: number, playerId: number): Promise<{ tee_time_id: number }> {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    this.validateCanStartPlaying(registration.status);
    this.updateRegistrationStartedRow(registration.id);

    return { tee_time_id: registration.tee_time_id! };
  }

  /**
   * Finish playing - mark registration as finished
   */
  async finishPlaying(competitionId: number, playerId: number): Promise<void> {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    this.validateCanFinishPlaying(registration.status);
    this.updateRegistrationFinishedRow(registration.id);
  }

  /**
   * Get all active and recently finished rounds for a player across all tours
   * Includes rounds that are: registered, playing, looking_for_group, or finished (for open competitions)
   * Excludes DNF rounds (competition window closed and player didn't finish 18 holes)
   */
  async getActiveRounds(playerId: number): Promise<ActiveRound[]> {
    const rounds = this.findActiveRoundsForPlayer(playerId);
    const activeRounds: ActiveRound[] = [];

    for (const round of rounds) {
      const scores = this.parseScoreArray(round.score);
      const holesPlayed = this.calculateHolesPlayed(scores);

      const isExpired = this.isRoundExpired(round.open_until);
      const isFinished = this.isRoundFinished(round.registration_status, holesPlayed);

      // Skip DNF rounds - they'll appear on the leaderboard instead
      if (isExpired && !isFinished) {
        continue;
      }

      const groupMembers = this.findGroupMembersExcludingPlayer(
        round.tee_time_id,
        playerId
      );

      const parsJson = this.findCoursePars(round.competition_id);
      const pars = this.parseScoreArray(parsJson);

      const relativeToPar = this.calculateRelativeToPar(scores, pars);
      const currentScore = this.formatScoreDisplay(relativeToPar);

      // Determine status for the card
      const status = round.registration_status === "finished" ? "finished" : "playing";

      activeRounds.push({
        tour_id: round.tour_id,
        tour_name: round.tour_name,
        competition_id: round.competition_id,
        competition_name: round.competition_name,
        course_name: round.course_name,
        tee_time_id: round.tee_time_id,
        participant_id: round.participant_id,
        holes_played: holesPlayed,
        current_score: currentScore,
        group: groupMembers.map((m) => ({
          name: m.name,
          handicap: m.handicap ?? undefined,
        })),
        open_until: round.open_until ?? undefined,
        status,
      });
    }

    return activeRounds;
  }

  /**
   * Get all groups for a competition with their members and status
   * Used for "Who's Playing" / Groups Overview views
   */
  async getCompetitionGroups(competitionId: number): Promise<CompetitionGroup[]> {
    const parsJson = this.findCoursePars(competitionId);
    if (!parsJson) {
      throw new Error("Competition not found");
    }

    const pars = this.parseScoreArray(parsJson);
    const participants = this.findCompetitionGroupParticipants(competitionId);
    const groupMap = this.groupParticipantsByTeeTime(participants);

    const groups: CompetitionGroup[] = [];

    for (const [teeTimeId, members] of groupMap) {
      let hasPlaying = false;
      let allFinished = true;
      let earliestStarted: string | undefined;
      let latestFinished: string | undefined;

      const groupMembers: CompetitionGroupMember[] = members.map((m) => {
        const scores = this.parseScoreArray(m.score);
        const holesPlayed = this.calculateHolesPlayed(scores);
        const relativeToPar = this.calculateRelativeToPar(scores, pars);
        const currentScore = this.formatScoreDisplayWithDash(relativeToPar, holesPlayed);

        const memberInfo = this.determineMemberStatus(m, holesPlayed);
        if (memberInfo.isPlaying) hasPlaying = true;
        if (!memberInfo.isFinished) allFinished = false;

        if (m.started_at && (!earliestStarted || m.started_at < earliestStarted)) {
          earliestStarted = m.started_at;
        }
        if (m.finished_at && (!latestFinished || m.finished_at > latestFinished)) {
          latestFinished = m.finished_at;
        }

        return {
          player_id: m.player_id ?? m.participant_id,
          participant_id: m.participant_id,
          name: m.player_names || m.team_name || "",
          handicap: m.handicap ?? undefined,
          category_name: m.category_name ?? undefined,
          registration_status: memberInfo.status,
          holes_played: holesPlayed,
          current_score: currentScore,
          score: scores,
          is_dq: Boolean(m.is_dq),
        };
      });

      const allLocked = members.length > 0 && members.every((m) => m.is_locked);
      const groupStatus = this.determineGroupStatus(hasPlaying, allFinished, allLocked);

      groups.push({
        tee_time_id: teeTimeId,
        status: groupStatus,
        members: groupMembers,
        started_at: earliestStarted,
        finished_at: latestFinished,
      });
    }

    return this.sortGroupsByStatus(groups);
  }

  // ============ Private Helper Methods ============

  /**
   * Get or create a "Tour Players" team for the tour
   */
  private async getOrCreateTourTeam(tourId: number): Promise<number> {
    const teamName = this.getTourTeamName(tourId);

    let team = this.findTeamByName(teamName);
    if (!team) {
      team = this.insertTeamRow(teamName);
    }

    return team.id;
  }

  /**
   * Add a player to an existing group
   */
  private async addPlayerToGroup(
    competitionId: number,
    playerId: number,
    targetTeeTimeId: number,
    teamId: number,
    groupCreatedBy: number
  ): Promise<void> {
    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found");
    }

    const enrollment = this.findActiveEnrollment(tourId, playerId);
    if (!enrollment) {
      throw new Error(`Player ${playerId} is not enrolled in this tour`);
    }

    const playerName = this.findPlayerName(playerId);
    if (!playerName) {
      throw new Error(`Player ${playerId} not found`);
    }

    const existingReg = await this.getRegistration(competitionId, playerId);

    if (existingReg) {
      if (existingReg.status === "playing" || existingReg.status === "finished") {
        throw new Error(`Player ${playerName} has already started playing`);
      }

      if (existingReg.tee_time_id === targetTeeTimeId) {
        throw new Error(`Player ${playerName} is already in this group`);
      }

      const nextOrder = this.findMaxTeeOrderForTeeTime(targetTeeTimeId) + 1;
      this.updateParticipantTeeTime(
        existingReg.participant_id!,
        targetTeeTimeId,
        nextOrder
      );

      if (existingReg.tee_time_id) {
        const remaining = this.findParticipantCountByTeeTime(existingReg.tee_time_id);
        if (remaining === 0) {
          this.deleteTeeTimeRow(existingReg.tee_time_id);
        }
      }

      this.updateRegistrationTeeTime(existingReg.id, targetTeeTimeId, groupCreatedBy);
    } else {
      const nextOrder = this.findMaxTeeOrderForTeeTime(targetTeeTimeId) + 1;
      const participant = this.insertParticipantRow(
        teamId,
        targetTeeTimeId,
        playerId,
        playerName,
        nextOrder
      );

      this.insertRegistrationRow(
        competitionId,
        playerId,
        enrollment.id,
        targetTeeTimeId,
        participant.id,
        "registered",
        groupCreatedBy
      );
    }
  }

  /**
   * Move a player to their own solo group
   */
  private async movePlayerToSoloGroup(
    competitionId: number,
    playerId: number
  ): Promise<void> {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration || !registration.tee_time_id) {
      throw new Error("Registration not found");
    }

    const oldTeeTimeId = registration.tee_time_id;
    const newTeeTime = this.insertTeeTimeRow(competitionId);

    this.updateParticipantTeeTime(registration.participant_id!, newTeeTime.id, 1);
    this.updateRegistrationTeeTimeOnly(registration.id, newTeeTime.id);

    const remaining = this.findParticipantCountByTeeTime(oldTeeTimeId);
    if (remaining === 0) {
      this.deleteTeeTimeRow(oldTeeTimeId);
    }
  }
}

export function createTourCompetitionRegistrationService(db: Database) {
  return new TourCompetitionRegistrationService(db);
}
