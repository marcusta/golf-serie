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

const MAX_GROUP_SIZE = 4;

export class TourCompetitionRegistrationService {
  constructor(private db: Database) {}

  /**
   * Register a player for an open-start competition
   * Creates tee_time and participant automatically
   */
  async register(
    competitionId: number,
    playerId: number,
    mode: RegistrationMode
  ): Promise<RegistrationResponse> {
    // Verify competition exists and is open-start mode
    const competition = this.db
      .prepare(
        `SELECT c.*, t.id as tour_id
         FROM competitions c
         LEFT JOIN tours t ON c.tour_id = t.id
         WHERE c.id = ?`
      )
      .get(competitionId) as {
      id: number;
      tour_id: number | null;
      start_mode: string;
      open_start: string | null;
      open_end: string | null;
    } | null;

    if (!competition) {
      throw new Error("Competition not found");
    }

    if (!competition.tour_id) {
      throw new Error("Competition is not part of a tour");
    }

    if (competition.start_mode !== "open") {
      throw new Error("Competition is not in open-start mode");
    }

    // Check if competition is currently open
    const now = new Date();
    if (competition.open_start && new Date(competition.open_start) > now) {
      throw new Error("Competition has not opened yet");
    }
    if (competition.open_end && new Date(competition.open_end) < now) {
      throw new Error("Competition has closed");
    }

    // Verify player exists
    const player = this.db
      .prepare("SELECT id, name, handicap FROM players WHERE id = ?")
      .get(playerId) as { id: number; name: string; handicap: number } | null;

    if (!player) {
      throw new Error("Player not found");
    }

    // Verify player is enrolled in the tour
    const enrollment = this.db
      .prepare(
        `SELECT id FROM tour_enrollments
         WHERE tour_id = ? AND player_id = ? AND status = 'active'`
      )
      .get(competition.tour_id, playerId) as { id: number } | null;

    if (!enrollment) {
      throw new Error("Player is not enrolled in this tour");
    }

    // Check if already registered
    const existing = await this.getRegistration(competitionId, playerId);
    if (existing) {
      throw new Error("Player is already registered for this competition");
    }

    // Get or create the "Tour Players" team for this tour
    const teamId = await this.getOrCreateTourTeam(competition.tour_id);

    // Create a tee time for this player (empty teetime for open start)
    const teeTime = this.db
      .prepare(
        `INSERT INTO tee_times (teetime, competition_id, start_hole)
         VALUES ('', ?, 1)
         RETURNING *`
      )
      .get(competitionId) as { id: number };

    // Create participant linked to this player
    const participant = this.db
      .prepare(
        `INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score)
         VALUES (1, ?, ?, 'Player', ?, ?, '[]')
         RETURNING *`
      )
      .get(teamId, teeTime.id, playerId, player.name) as { id: number };

    // Determine initial status based on mode
    const status: RegistrationStatus =
      mode === "looking_for_group" ? "looking_for_group" : "registered";

    // Create registration record
    const registration = this.db
      .prepare(
        `INSERT INTO tour_competition_registrations
         (competition_id, player_id, enrollment_id, tee_time_id, participant_id, status, group_created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(
        competitionId,
        playerId,
        enrollment.id,
        teeTime.id,
        participant.id,
        status,
        mode === "create_group" ? playerId : null
      ) as TourCompetitionRegistration;

    // Build response
    const response: RegistrationResponse = {
      registration,
    };

    // Include group info for create_group and solo modes
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

    // Don't allow withdrawal if already playing or finished
    if (registration.status === "playing" || registration.status === "finished") {
      throw new Error("Cannot withdraw after starting to play");
    }

    // Delete participant
    if (registration.participant_id) {
      this.db
        .prepare("DELETE FROM participants WHERE id = ?")
        .run(registration.participant_id);
    }

    // Delete tee time if empty
    if (registration.tee_time_id) {
      const otherParticipants = this.db
        .prepare(
          "SELECT COUNT(*) as count FROM participants WHERE tee_time_id = ?"
        )
        .get(registration.tee_time_id) as { count: number };

      if (otherParticipants.count === 0) {
        this.db
          .prepare("DELETE FROM tee_times WHERE id = ?")
          .run(registration.tee_time_id);
      }
    }

    // Delete registration
    this.db
      .prepare("DELETE FROM tour_competition_registrations WHERE id = ?")
      .run(registration.id);
  }

  /**
   * Get a player's registration for a competition
   */
  async getRegistration(
    competitionId: number,
    playerId: number
  ): Promise<TourCompetitionRegistration | null> {
    const registration = this.db
      .prepare(
        `SELECT * FROM tour_competition_registrations
         WHERE competition_id = ? AND player_id = ?`
      )
      .get(competitionId, playerId) as TourCompetitionRegistration | null;

    return registration;
  }

  /**
   * Get all registrations for a competition
   */
  async getRegistrationsForCompetition(
    competitionId: number
  ): Promise<TourCompetitionRegistrationWithDetails[]> {
    const registrations = this.db
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

    return registrations;
  }

  /**
   * Get available players for group formation
   * Returns enrolled players with their current status
   */
  async getAvailablePlayers(competitionId: number): Promise<AvailablePlayer[]> {
    // Get competition's tour
    const competition = this.db
      .prepare("SELECT tour_id FROM competitions WHERE id = ?")
      .get(competitionId) as { tour_id: number } | null;

    if (!competition?.tour_id) {
      throw new Error("Competition not found or not part of a tour");
    }

    // Get all active enrollments with their registration status
    const players = this.db
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
      .all(competitionId, competition.tour_id) as {
      player_id: number;
      name: string;
      handicap: number | null;
      registration_status: RegistrationStatus | null;
      group_tee_time_id: number | null;
    }[];

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
    // Get the group creator's registration
    const creatorReg = await this.getRegistration(
      competitionId,
      groupCreatorPlayerId
    );
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }

    if (
      creatorReg.status === "playing" ||
      creatorReg.status === "finished"
    ) {
      throw new Error("Cannot modify group after starting to play");
    }

    // Check current group size
    const currentMembers = await this.getGroupMemberCount(creatorReg.tee_time_id);
    if (currentMembers + playerIdsToAdd.length > MAX_GROUP_SIZE) {
      throw new Error(
        `Cannot add ${playerIdsToAdd.length} players. Group would exceed ${MAX_GROUP_SIZE} players.`
      );
    }

    // Get competition info
    const competition = this.db
      .prepare("SELECT tour_id FROM competitions WHERE id = ?")
      .get(competitionId) as { tour_id: number };

    const teamId = await this.getOrCreateTourTeam(competition.tour_id);

    // Add each player
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
    // Get the creator's registration
    const creatorReg = await this.getRegistration(
      competitionId,
      groupCreatorPlayerId
    );
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }

    // Verify the player to remove is in the same group
    const targetReg = await this.getRegistration(competitionId, playerIdToRemove);
    if (!targetReg || targetReg.tee_time_id !== creatorReg.tee_time_id) {
      throw new Error("Player is not in your group");
    }

    if (targetReg.status === "playing" || targetReg.status === "finished") {
      throw new Error("Cannot remove player who has started playing");
    }

    // Can't remove yourself this way (use leaveGroup instead)
    if (playerIdToRemove === groupCreatorPlayerId) {
      throw new Error("Use leaveGroup to remove yourself");
    }

    // Move the player to their own group
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

    if (
      registration.status === "playing" ||
      registration.status === "finished"
    ) {
      throw new Error("Cannot leave group after starting to play");
    }

    // Move to solo group
    await this.movePlayerToSoloGroup(competitionId, playerId);

    // Get the new group (should be solo)
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
    const members = this.db
      .prepare(
        `SELECT r.player_id, p.name, COALESCE(te.playing_handicap, p.handicap) as handicap
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         JOIN tour_enrollments te ON r.enrollment_id = te.id
         WHERE r.tee_time_id = ?
         ORDER BY r.registered_at`
      )
      .all(teeTimeId) as {
      player_id: number;
      name: string;
      handicap: number | null;
    }[];

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

  /**
   * Get count of members in a group
   */
  async getGroupMemberCount(teeTimeId: number): Promise<number> {
    const result = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM tour_competition_registrations
         WHERE tee_time_id = ?`
      )
      .get(teeTimeId) as { count: number };
    return result.count;
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

    if (registration.status !== "registered" && registration.status !== "looking_for_group") {
      throw new Error("Invalid status for starting play");
    }

    // Update to playing status
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET status = 'playing', started_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(registration.id);

    // Return tee_time_id for navigation
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

    if (registration.status !== "playing") {
      throw new Error("Must be playing to finish");
    }

    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET status = 'finished', finished_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(registration.id);
  }

  /**
   * Get all active and recently finished rounds for a player across all tours
   * Includes rounds that are: registered, playing, looking_for_group, or finished (for open competitions)
   * Excludes DNF rounds (competition window closed and player didn't finish 18 holes)
   */
  async getActiveRounds(playerId: number): Promise<ActiveRound[]> {
    const rounds = this.db
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
      .all(playerId) as {
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
    }[];

    const activeRounds: ActiveRound[] = [];
    const now = new Date();

    for (const round of rounds) {
      // Calculate holes played
      const scores = JSON.parse(round.score || "[]") as number[];
      const holesPlayed = scores.filter((s) => s > 0).length;

      // Check if this is a DNF (competition window closed and didn't finish 18 holes)
      const isExpired = round.open_until && new Date(round.open_until) < now;
      const isFinished = round.registration_status === "finished" || holesPlayed === 18;

      // Skip DNF rounds - they'll appear on the leaderboard instead
      if (isExpired && !isFinished) {
        continue;
      }

      // Get group members with handicaps
      const groupMembers = this.db
        .prepare(
          `SELECT p.name, COALESCE(te.playing_handicap, p.handicap) as handicap
           FROM tour_competition_registrations r
           JOIN players p ON r.player_id = p.id
           JOIN tour_enrollments te ON r.enrollment_id = te.id
           WHERE r.tee_time_id = ? AND r.player_id != ?`
        )
        .all(round.tee_time_id, playerId) as { name: string; handicap: number | null }[];

      // Get pars for score calculation
      const courseInfo = this.db
        .prepare(
          `SELECT co.pars
           FROM competitions c
           JOIN courses co ON c.course_id = co.id
           WHERE c.id = ?`
        )
        .get(round.competition_id) as { pars: string };
      const pars = JSON.parse(courseInfo.pars);

      let relativeToPar = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > 0 && pars[i]) {
          relativeToPar += scores[i] - pars[i];
        }
      }

      const currentScore =
        relativeToPar === 0 ? "E" : relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;

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
   *
   * Queries all participants from tee_times/participants tables,
   * and merges in handicap/category from tour registrations where available.
   */
  async getCompetitionGroups(competitionId: number): Promise<CompetitionGroup[]> {
    // Get course pars for score calculation
    const courseInfo = this.db
      .prepare(
        `SELECT co.pars
         FROM competitions c
         JOIN courses co ON c.course_id = co.id
         WHERE c.id = ?`
      )
      .get(competitionId) as { pars: string } | null;

    if (!courseInfo) {
      throw new Error("Competition not found");
    }

    const pars = JSON.parse(courseInfo.pars) as number[];

    // Get ALL participants from tee_times (the source of truth for who's playing)
    // Join tour_enrollments directly via player_id + tour_id to get category for all enrolled players
    const participants = this.db
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
          COALESCE(te.playing_handicap, pl.handicap) as handicap,
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
      .all(competitionId) as {
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
    }[];

    // Group participants by tee_time_id
    const groupMap = new Map<number, typeof participants>();
    for (const p of participants) {
      if (!groupMap.has(p.tee_time_id)) {
        groupMap.set(p.tee_time_id, []);
      }
      groupMap.get(p.tee_time_id)!.push(p);
    }

    // Build CompetitionGroup array
    const groups: CompetitionGroup[] = [];

    for (const [teeTimeId, members] of groupMap) {
      // Determine group status based on members
      let groupStatus: CompetitionGroupStatus = "registered";
      let hasPlaying = false;
      let allFinished = true;
      let earliestStarted: string | undefined;
      let latestFinished: string | undefined;

      const groupMembers: CompetitionGroupMember[] = members.map((m) => {
        // Calculate holes played and score
        const scores = JSON.parse(m.score || "[]") as number[];
        const holesPlayed = scores.filter((s) => s > 0).length;

        let relativeToPar = 0;
        for (let i = 0; i < scores.length; i++) {
          if (scores[i] > 0 && pars[i]) {
            relativeToPar += scores[i] - pars[i];
          }
        }

        const currentScore =
          holesPlayed === 0
            ? "-"
            : relativeToPar === 0
              ? "E"
              : relativeToPar > 0
                ? `+${relativeToPar}`
                : `${relativeToPar}`;

        // Determine status from is_locked, registration_status, or scores
        let memberStatus: RegistrationStatus = "registered";
        if (m.is_locked) {
          memberStatus = "finished";
        } else if (m.registration_status === "playing" || holesPlayed > 0) {
          memberStatus = "playing";
          hasPlaying = true;
          allFinished = false;
        } else if (m.registration_status === "finished") {
          memberStatus = "finished";
        } else {
          allFinished = false;
        }

        if (m.started_at && (!earliestStarted || m.started_at < earliestStarted)) {
          earliestStarted = m.started_at;
        }
        if (m.finished_at && (!latestFinished || m.finished_at > latestFinished)) {
          latestFinished = m.finished_at;
        }

        return {
          player_id: m.player_id ?? m.participant_id,
          participant_id: m.participant_id,
          name: m.player_names || m.team_name,
          handicap: m.handicap ?? undefined,
          category_name: m.category_name ?? undefined,
          registration_status: memberStatus,
          holes_played: holesPlayed,
          current_score: currentScore,
          score: scores,
          is_dq: Boolean(m.is_dq),
        };
      });

      // Determine final group status
      if (allFinished && members.length > 0 && members.every(m => m.is_locked)) {
        groupStatus = "finished";
      } else if (hasPlaying) {
        groupStatus = "on_course";
      } else {
        groupStatus = "registered";
      }

      groups.push({
        tee_time_id: teeTimeId,
        status: groupStatus,
        members: groupMembers,
        started_at: earliestStarted,
        finished_at: latestFinished,
      });
    }

    // Sort groups: on_course first, then registered, then finished
    const statusOrder: Record<CompetitionGroupStatus, number> = {
      on_course: 0,
      registered: 1,
      finished: 2,
    };

    groups.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return groups;
  }

  // ============ Private Helper Methods ============

  /**
   * Get or create a "Tour Players" team for the tour
   */
  private async getOrCreateTourTeam(tourId: number): Promise<number> {
    const teamName = `Tour ${tourId} Players`;

    // Try to find existing team
    let team = this.db
      .prepare("SELECT id FROM teams WHERE name = ?")
      .get(teamName) as { id: number } | null;

    if (!team) {
      // Create the team
      team = this.db
        .prepare("INSERT INTO teams (name) VALUES (?) RETURNING id")
        .get(teamName) as { id: number };
    }

    return team.id;
  }

  /**
   * Map registration status to available player status
   */
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
    // Check if player is enrolled
    const competition = this.db
      .prepare("SELECT tour_id FROM competitions WHERE id = ?")
      .get(competitionId) as { tour_id: number };

    const enrollment = this.db
      .prepare(
        `SELECT id FROM tour_enrollments
         WHERE tour_id = ? AND player_id = ? AND status = 'active'`
      )
      .get(competition.tour_id, playerId) as { id: number } | null;

    if (!enrollment) {
      throw new Error(`Player ${playerId} is not enrolled in this tour`);
    }

    // Get player info
    const player = this.db
      .prepare("SELECT name FROM players WHERE id = ?")
      .get(playerId) as { name: string };

    // Check if player already has a registration
    const existingReg = await this.getRegistration(competitionId, playerId);

    if (existingReg) {
      // Player already registered - check if they can be added
      if (
        existingReg.status === "playing" ||
        existingReg.status === "finished"
      ) {
        throw new Error(`Player ${player.name} has already started playing`);
      }

      if (existingReg.tee_time_id === targetTeeTimeId) {
        throw new Error(`Player ${player.name} is already in this group`);
      }

      // Move participant to the new tee time
      const currentTeeOrder = this.db
        .prepare(
          `SELECT MAX(tee_order) as max_order FROM participants WHERE tee_time_id = ?`
        )
        .get(targetTeeTimeId) as { max_order: number | null };

      this.db
        .prepare(
          `UPDATE participants
           SET tee_time_id = ?, tee_order = ?
           WHERE id = ?`
        )
        .run(targetTeeTimeId, (currentTeeOrder.max_order || 0) + 1, existingReg.participant_id);

      // Clean up old empty tee time
      if (existingReg.tee_time_id) {
        const remaining = this.db
          .prepare(
            "SELECT COUNT(*) as count FROM participants WHERE tee_time_id = ?"
          )
          .get(existingReg.tee_time_id) as { count: number };

        if (remaining.count === 0) {
          this.db
            .prepare("DELETE FROM tee_times WHERE id = ?")
            .run(existingReg.tee_time_id);
        }
      }

      // Update registration
      this.db
        .prepare(
          `UPDATE tour_competition_registrations
           SET tee_time_id = ?, status = 'registered', group_created_by = ?
           WHERE id = ?`
        )
        .run(targetTeeTimeId, groupCreatedBy, existingReg.id);
    } else {
      // Create new participant
      const currentTeeOrder = this.db
        .prepare(
          `SELECT MAX(tee_order) as max_order FROM participants WHERE tee_time_id = ?`
        )
        .get(targetTeeTimeId) as { max_order: number | null };

      const participant = this.db
        .prepare(
          `INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score)
           VALUES (?, ?, ?, 'Player', ?, ?, '[]')
           RETURNING id`
        )
        .get(
          (currentTeeOrder.max_order || 0) + 1,
          teamId,
          targetTeeTimeId,
          playerId,
          player.name
        ) as { id: number };

      // Create registration
      this.db
        .prepare(
          `INSERT INTO tour_competition_registrations
           (competition_id, player_id, enrollment_id, tee_time_id, participant_id, status, group_created_by)
           VALUES (?, ?, ?, ?, ?, 'registered', ?)`
        )
        .run(
          competitionId,
          playerId,
          enrollment.id,
          targetTeeTimeId,
          participant.id,
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

    // Create new tee time for solo play
    const newTeeTime = this.db
      .prepare(
        `INSERT INTO tee_times (teetime, competition_id, start_hole)
         VALUES ('', ?, 1)
         RETURNING id`
      )
      .get(competitionId) as { id: number };

    // Move participant to new tee time
    this.db
      .prepare(
        `UPDATE participants
         SET tee_time_id = ?, tee_order = 1
         WHERE id = ?`
      )
      .run(newTeeTime.id, registration.participant_id);

    // Update registration
    this.db
      .prepare(
        `UPDATE tour_competition_registrations
         SET tee_time_id = ?, group_created_by = NULL
         WHERE id = ?`
      )
      .run(newTeeTime.id, registration.id);

    // Clean up old tee time if empty
    const remaining = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM participants WHERE tee_time_id = ?"
      )
      .get(oldTeeTimeId) as { count: number };

    if (remaining.count === 0) {
      this.db.prepare("DELETE FROM tee_times WHERE id = ?").run(oldTeeTimeId);
    }
  }
}

export function createTourCompetitionRegistrationService(db: Database) {
  return new TourCompetitionRegistrationService(db);
}
