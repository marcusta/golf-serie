import { Database } from "bun:sqlite";
import type {
  Competition,
  CreateCompetitionDto,
  LeaderboardEntry,
  Participant,
  TeamLeaderboardEntry,
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
      INSERT INTO competitions (name, date, course_id, series_id, manual_entry_format, points_multiplier)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null,
      data.manual_entry_format || "out_in_total",
      data.points_multiplier ?? 1
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

    if (data.manual_entry_format) {
      updates.push("manual_entry_format = ?");
      values.push(data.manual_entry_format);
    }

    if (data.points_multiplier !== undefined) {
      updates.push("points_multiplier = ?");
      values.push(data.points_multiplier);
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
      SELECT p.*, tm.name as team_name, tm.id as team_id, t.teetime
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = participantsStmt.all(competitionId) as (Participant & {
      team_name: string;
      team_id: number;
      teetime: string;
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

      // Check if participant has manual scores
      if (
        participant.manual_score_total !== null &&
        participant.manual_score_total !== undefined
      ) {
        // Use manual scores
        const totalShots = participant.manual_score_total;
        const holesPlayed = 18; // Manual scores represent a full round

        // Calculate relative to par based on manual total
        const totalPar = pars.reduce(
          (sum: number, par: number) => sum + par,
          0
        );
        const relativeToPar = totalShots - totalPar;

        return {
          participant: {
            ...participant,
            score,
          },
          totalShots,
          holesPlayed,
          relativeToPar,
          startTime: participant.teetime,
        };
      } else {
        // Use existing logic for hole-by-hole scores
        // Count holes played: positive scores and -1 (gave up) count as played
        // 0 means unreported/cleared, so it doesn't count as played
        const holesPlayed = score.filter(
          (s: number) => s > 0 || s === -1
        ).length;

        // Calculate total shots: only count positive scores
        // -1 (gave up) and 0 (unreported) don't count towards total
        const totalShots = score.reduce(
          (sum: number, shots: number) => sum + (shots > 0 ? shots : 0),
          0
        );

        // Calculate relative to par: only count positive scores
        let relativeToPar = 0;
        try {
          for (let i = 0; i < score.length; i++) {
            if (score[i] > 0 && pars[i] !== undefined) {
              relativeToPar += score[i] - pars[i];
            }
            // Note: -1 (gave up) and 0 (unreported) don't contribute to par calculation
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
          startTime: participant.teetime,
        };
      }
    });
    // Sort by relative to par (ascending)
    return leaderboard.sort((a, b) => a.relativeToPar - b.relativeToPar);
  }

  async getTeamLeaderboard(
    competitionId: number
  ): Promise<TeamLeaderboardEntry[]> {
    // First get the regular leaderboard
    const leaderboard = await this.getLeaderboard(competitionId);

    // Get the competition to check if it belongs to a series
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

    // Get number of teams in the series (if competition belongs to a series)
    let numberOfTeams = 0;
    if (competition.series_id) {
      const teamsCountStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM series_teams
        WHERE series_id = ?
      `);
      const result = teamsCountStmt.get(competition.series_id) as {
        count: number;
      } | null;
      numberOfTeams = result?.count || 0;
    }

    // Transform leaderboard data into team leaderboard format
    return this.transformLeaderboardToTeamLeaderboard(
      leaderboard,
      numberOfTeams
    );
  }

  private transformLeaderboardToTeamLeaderboard(
    leaderboard: LeaderboardEntry[],
    numberOfTeams: number
  ): TeamLeaderboardEntry[] {
    interface TeamGroup {
      teamId: number;
      teamName: string;
      participants: LeaderboardEntry[];
      totalShots: number;
      totalRelativeScore: number;
      maxHolesCompleted: number;
      startTime: string | null;
    }

    // 1. Group participants by team and pre-calculate sums.
    const teamGroups = leaderboard.reduce((acc, entry) => {
      const teamId = entry.participant.team_id;
      const teamName = entry.participant.team_name;
      if (!acc[teamId]) {
        acc[teamId] = {
          teamId,
          teamName,
          participants: [],
          totalShots: 0,
          totalRelativeScore: 0,
          maxHolesCompleted: 0,
          startTime: null,
        };
      }

      const hasStarted = entry.holesPlayed > 0;
      const hasInvalidRound = entry.participant.score.includes(-1);

      acc[teamId].participants.push(entry);

      if (hasStarted && !hasInvalidRound) {
        acc[teamId].totalShots += entry.totalShots;
        acc[teamId].totalRelativeScore += entry.relativeToPar;
      }

      if (hasStarted) {
        acc[teamId].maxHolesCompleted = Math.max(
          acc[teamId].maxHolesCompleted,
          entry.holesPlayed
        );
      }

      return acc;
    }, {} as Record<number, TeamGroup>);

    // 2. Populate start times for each team.
    Object.values(teamGroups).forEach((team: TeamGroup) => {
      let earliestStartTime: string | null = null;
      team.participants.forEach((participant) => {
        if (participant.startTime) {
          if (!earliestStartTime || participant.startTime < earliestStartTime) {
            earliestStartTime = participant.startTime;
          }
        }
      });
      if (earliestStartTime) {
        team.startTime = earliestStartTime;
      }
    });

    // 3. Sort the teams with the tie-breaker logic.
    const sortedTeamGroups = Object.values(teamGroups).sort((a, b) => {
      const getStatus = (
        team: TeamGroup
      ): "NOT_STARTED" | "IN_PROGRESS" | "FINISHED" => {
        const anyStarted = team.participants.some((p) => p.holesPlayed > 0);
        if (!anyStarted) return "NOT_STARTED";
        const allFinished = team.participants.every(
          (p) => p.participant.is_locked && !p.participant.score.includes(-1)
        );
        if (allFinished) return "FINISHED";
        return "IN_PROGRESS";
      };

      const statusA = getStatus(a);
      const statusB = getStatus(b);

      // Primary sort: By status.
      if (statusA !== statusB) {
        const statusOrder = { FINISHED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };
        return statusOrder[statusA] - statusOrder[statusB];
      }

      // If status is the same and they haven't started, don't sort further.
      if (statusA === "NOT_STARTED") return 0;

      // Secondary sort: By total score.
      if (a.totalRelativeScore !== b.totalRelativeScore) {
        return a.totalRelativeScore - b.totalRelativeScore;
      }

      // Tie-breaker: Compare best individual scores, then next best, and so on.
      const sortedScoresA = a.participants
        .filter((p) => p.holesPlayed > 0 && !p.participant.score.includes(-1))
        .map((p) => p.relativeToPar)
        .sort((x, y) => x - y);

      const sortedScoresB = b.participants
        .filter((p) => p.holesPlayed > 0 && !p.participant.score.includes(-1))
        .map((p) => p.relativeToPar)
        .sort((x, y) => x - y);

      const maxPlayers = Math.max(sortedScoresA.length, sortedScoresB.length);
      for (let i = 0; i < maxPlayers; i++) {
        const scoreA = sortedScoresA[i];
        const scoreB = sortedScoresB[i];

        if (scoreA === undefined) return 1; // Team A has fewer valid scores, B wins.
        if (scoreB === undefined) return -1; // Team B has fewer valid scores, A wins.

        if (scoreA !== scoreB) {
          return scoreA - scoreB; // The first non-tied score determines the winner.
        }
      }

      return 0; // It's a perfect tie.
    });

    // 4. Map sorted groups to the final TeamLeaderboardEntry format.
    const sortedTeams = sortedTeamGroups.map(
      (team: TeamGroup): TeamLeaderboardEntry => {
        const anyStarted = team.participants.some((p) => p.holesPlayed > 0);
        const allFinished =
          anyStarted &&
          team.participants.every(
            (p) => p.participant.is_locked && !p.participant.score.includes(-1)
          );

        let status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
        let displayProgress: string;

        if (!anyStarted) {
          status = "NOT_STARTED";
          displayProgress = team.startTime
            ? `Starts ${team.startTime}`
            : "Starts TBD";
        } else if (allFinished) {
          status = "FINISHED";
          displayProgress = "F";
        } else {
          status = "IN_PROGRESS";
          displayProgress = `Thru ${team.maxHolesCompleted}`;
        }

        return {
          teamId: team.teamId,
          teamName: team.teamName,
          status,
          startTime: team.startTime,
          displayProgress,
          totalRelativeScore: anyStarted ? team.totalRelativeScore : null,
          totalShots: anyStarted ? team.totalShots : null,
          teamPoints: null, // Points are calculated next.
        };
      }
    );

    // 5. Calculate points based on the final sorted order.
    if (numberOfTeams > 0) {
      let currentPosition = 0;
      let lastScoreSignature: string | null = null;

      sortedTeams.forEach((team, index) => {
        if (team.status !== "NOT_STARTED") {
          // Create a signature of the score to handle ties correctly.
          // A simple score check isn't enough due to the individual tie-breaker.
          // The position in the sorted array is now the definitive rank.
          const scoreSignature = `${team.totalRelativeScore}-${index}`;

          if (scoreSignature !== lastScoreSignature) {
            currentPosition = index + 1;
          }
          team.teamPoints = this.calculateTeamPoints(
            currentPosition,
            numberOfTeams
          );
          lastScoreSignature = scoreSignature;
        }
      });
    }

    return sortedTeams;
  }

  private calculateTeamPoints(position: number, numberOfTeams: number): number {
    if (position <= 0) return 0;
    if (position === 1) {
      return numberOfTeams + 2;
    }
    if (position === 2) {
      return numberOfTeams;
    }
    // For position 3 and below, ensuring points don't go below 0.
    const points = numberOfTeams - (position - 1);
    return Math.max(0, points);
  }
}
