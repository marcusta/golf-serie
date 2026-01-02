import { Database } from "bun:sqlite";
import type {
    Competition,
    CreateCompetitionDto,
    LeaderboardEntry,
    LeaderboardResponse,
    Participant,
    TeamLeaderboardEntry,
    TourScoringMode,
    UpdateCompetitionDto,
} from "../types";
import {
    calculateCourseHandicap,
    distributeHandicapStrokes,
    getDefaultStrokeIndex,
} from "../utils/handicap";
import { GOLF } from "../constants/golf";
import { parseParsArray, safeParseJsonWithDefault } from "../utils/parsing";
import { calculateDefaultPoints } from "../utils/points";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types (for database rows)
// ─────────────────────────────────────────────────────────────────────────────

interface CompetitionRow extends Competition {
    pars: string;
    is_results_final?: number;
    point_template_id?: number;
}

interface CompetitionWithCourseRow extends Competition {
    course_name: string;
    participant_count?: number;
}

interface TeeRow {
    id: number;
    name: string;
    color?: string;
    course_rating: number | null;
    slope_rating: number | null;
    stroke_index: string | null;
    ratings_json: string | null;
}

interface TeeRating {
    gender: string;
    course_rating: number;
    slope_rating: number;
}

// Row type for participant with joined details (uses null for nullable DB fields)
interface ParticipantWithDetailsRow {
    // Core participant fields
    id: number;
    tee_order: number;
    team_id: number;
    tee_time_id: number;
    position_name: string;
    player_names: string | null;
    player_id: number | null;
    score: string | number[]; // Raw from DB is string, parsed is number[]
    is_locked: number; // SQLite boolean
    locked_at: string | null;
    handicap_index: number | null;
    manual_score_out: number | null;
    manual_score_in: number | null;
    manual_score_total: number | null;
    is_dq: number; // SQLite boolean
    admin_notes: string | null;
    admin_modified_by: number | null;
    admin_modified_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    team_name: string;
    teetime: string;
    category_id: number | null;
    category_name: string | null;
}

interface CategoryRow {
    id: number;
    tour_id: number;
    name: string;
    description?: string;
    sort_order: number;
    created_at: string;
}

interface CategoryTeeRow {
    category_id: number;
    tee_id: number;
    tee_name: string;
    stroke_index: string | null;
    legacy_course_rating: number | null;
    legacy_slope_rating: number | null;
    ratings_json: string | null;
}

interface CategoryTeeRating {
    categoryId: number;
    teeId: number;
    teeName: string;
    courseRating: number;
    slopeRating: number;
    strokeIndex: number[];
}

interface PlayerHandicapRow {
    player_id: number;
    handicap_index: number | null;
}

interface StoredResultRow {
    participant_id: number;
    position: number;
    points: number;
    scoring_type: "gross" | "net";
}

interface PointTemplateRow {
    id: number;
    name: string;
    points_structure: string;
}

function isValidYYYYMMDD(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export class CompetitionService {
  constructor(private db: Database) {}

  async create(data: CreateCompetitionDto): Promise<Competition> {
    // Validation
    this.validateCompetitionName(data.name);
    this.validateCompetitionDate(data.date);

    // Verify course exists
    if (!this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided
    if (data.series_id && !this.findSeriesExists(data.series_id)) {
      throw new Error("Series not found");
    }

    // Verify tour exists if provided
    if (data.tour_id && !this.findTourExists(data.tour_id)) {
      throw new Error("Tour not found");
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      if (tee.course_id !== data.course_id) {
        throw new Error("Tee must belong to the competition's course");
      }
    }

    return this.insertCompetitionRow(data);
  }

  async findAll(): Promise<
    (Competition & {
      course: { id: number; name: string };
      participant_count: number;
    })[]
  > {
    const rows = this.findAllCompetitionRows();
    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }

  async findById(
    id: number
  ): Promise<(Competition & { course: { id: number; name: string } }) | null> {
    const row = this.findCompetitionRowById(id);
    if (!row) return null;
    return this.transformCompetitionRowToResult(row);
  }

  async update(id: number, data: UpdateCompetitionDto): Promise<Competition> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Validation
    this.validateCompetitionNameNotEmpty(data.name);
    this.validateCompetitionDateFormat(data.date);

    // Verify course exists if provided
    if (data.course_id && !this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }

    // Verify series exists if provided (null allowed to clear)
    if (data.series_id !== undefined && data.series_id !== null) {
      if (!this.findSeriesExists(data.series_id)) {
        throw new Error("Series not found");
      }
    }

    // Verify tour exists if provided (null allowed to clear)
    if (data.tour_id !== undefined && data.tour_id !== null) {
      if (!this.findTourExists(data.tour_id)) {
        throw new Error("Tour not found");
      }
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id !== undefined && data.tee_id !== null) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      const effectiveCourseId = data.course_id ?? competition.course_id;
      if (tee.course_id !== effectiveCourseId) {
        throw new Error("Tee must belong to the competition's course");
      }
    }

    const { updates, values } = this.buildUpdateFields(data);

    if (updates.length === 0) {
      return competition;
    }

    return this.updateCompetitionRow(id, updates, values);
  }

  async delete(id: number): Promise<void> {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Check if competition has any tee times
    const teeTimes = this.findTeeTimesForCompetition(id);
    if (teeTimes.length > 0) {
      throw new Error("Cannot delete competition that has tee times");
    }

    this.deleteCompetitionRow(id);
  }

  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    const response = await this.getLeaderboardWithDetails(competitionId);
    return response.entries;
  }

  /**
   * Get leaderboard with full details including tee info and net scores
   */
  async getLeaderboardWithDetails(competitionId: number): Promise<LeaderboardResponse> {
    // Get competition with course pars
    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const isTourCompetition = !!competition.tour_id;
    const isResultsFinal = !!competition.is_results_final;

    // Get tour scoring mode if this is a tour competition
    const scoringMode = competition.tour_id
      ? this.findTourScoringMode(competition.tour_id)
      : undefined;

    // Get tee info and ratings
    const { teeInfo, strokeIndex, courseRating, slopeRating } = this.getTeeInfoForCompetition(
      competition.tee_id,
      scoringMode
    );

    // Get player handicaps from tour enrollments if needed
    const playerHandicaps = this.getPlayerHandicapsForCompetition(
      competition.tour_id,
      scoringMode
    );

    // Get participants, categories, and category tee ratings
    const participants = this.findParticipantsForCompetition(competitionId);
    const categories = competition.tour_id
      ? this.findCategoriesForCompetition(competition.tour_id, competitionId)
      : [];
    const categoryTeeRatings = this.getCategoryTeeRatingsForCompetition(
      competitionId,
      competition.tour_id,
      scoringMode
    );

    // Parse course pars
    const pars = parseParsArray(competition.pars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    // Check if competition window is closed
    const isOpenCompetitionClosed = this.isCompetitionWindowClosed(competition);

    // Calculate leaderboard entries
    const leaderboard: LeaderboardEntry[] = participants.map((participant) => {
      // Parse the score field
      const score =
        typeof participant.score === "string"
          ? safeParseJsonWithDefault<number[]>(participant.score, [])
          : Array.isArray(participant.score)
          ? participant.score
          : [];

      // Get player handicap - prefer stored snapshot, fall back to live lookup for backwards compatibility
      const handicapIndex: number | null =
        participant.handicap_index !== null && participant.handicap_index !== undefined
          ? participant.handicap_index
          : participant.player_id
            ? (playerHandicaps.get(participant.player_id) ?? null)
            : null;

      // Calculate course handicap and stroke distribution
      // Use category-specific tee ratings if available, otherwise fall back to default/competition tee
      let courseHandicap: number | undefined;
      let handicapStrokesPerHole: number[] | undefined;
      let playerCourseRating = courseRating;
      let playerSlopeRating = slopeRating;
      let playerStrokeIndex = strokeIndex;

      if (handicapIndex !== null && scoringMode && scoringMode !== "gross") {
        // Check if participant has a category with a specific tee assignment
        if (participant.category_id && categoryTeeRatings.has(participant.category_id)) {
          const catTee = categoryTeeRatings.get(participant.category_id)!;
          playerCourseRating = catTee.courseRating;
          playerSlopeRating = catTee.slopeRating;
          playerStrokeIndex = catTee.strokeIndex;
        }

        courseHandicap = calculateCourseHandicap(handicapIndex, playerSlopeRating, playerCourseRating, totalPar);
        handicapStrokesPerHole = distributeHandicapStrokes(courseHandicap, playerStrokeIndex);
      }

      // Check if participant has manual scores
      if (
        participant.manual_score_total !== null &&
        participant.manual_score_total !== undefined
      ) {
        // Use manual scores
        const totalShots = participant.manual_score_total;
        const holesPlayed = GOLF.HOLES_PER_ROUND; // Manual scores represent a full round
        const relativeToPar = totalShots - totalPar;

        // Calculate net scores
        let netTotalShots: number | undefined;
        let netRelativeToPar: number | undefined;
        if (courseHandicap !== undefined) {
          netTotalShots = totalShots - courseHandicap;
          netRelativeToPar = netTotalShots - totalPar;
        }

        return {
          participant: this.transformParticipantRowForLeaderboard(
            participant,
            score,
            handicapIndex,
            participant.category_id,
            participant.category_name
          ),
          totalShots,
          holesPlayed,
          relativeToPar,
          startTime: participant.teetime,
          netTotalShots,
          netRelativeToPar,
          courseHandicap,
          handicapStrokesPerHole,
          // Manual scores are always complete rounds, so never DNF
          isDNF: false,
        };
      } else {
        // Use existing logic for hole-by-hole scores
        const holesPlayed = score.filter(
          (s: number) => s > 0 || s === -1
        ).length;

        const totalShots = score.reduce(
          (sum: number, shots: number) => sum + (shots > 0 ? shots : 0),
          0
        );

        let relativeToPar = 0;
        for (let i = 0; i < score.length; i++) {
          if (score[i] > 0 && pars[i] !== undefined) {
            relativeToPar += score[i] - pars[i];
          }
        }

        // Calculate net scores
        let netTotalShots: number | undefined;
        let netRelativeToPar: number | undefined;
        if (courseHandicap !== undefined && handicapStrokesPerHole && holesPlayed > 0 && !score.includes(-1)) {
          // Calculate running net score for holes played
          let netScore = 0;
          let parForHolesPlayed = 0;
          for (let i = 0; i < score.length; i++) {
            if (score[i] > 0) {
              // Net score for this hole = gross score - handicap strokes for this hole
              netScore += score[i] - handicapStrokesPerHole[i];
              parForHolesPlayed += pars[i] || 0;
            }
          }
          netRelativeToPar = netScore - parForHolesPlayed;

          // Only set netTotalShots for completed rounds (for display purposes)
          if (holesPlayed === GOLF.HOLES_PER_ROUND) {
            netTotalShots = totalShots - courseHandicap;
          }
        }

        // DNF if competition window closed and round not complete
        const isDNF = isOpenCompetitionClosed && holesPlayed < GOLF.HOLES_PER_ROUND;

        return {
          participant: this.transformParticipantRowForLeaderboard(
            participant,
            score,
            handicapIndex,
            participant.category_id,
            participant.category_name
          ),
          totalShots,
          holesPlayed,
          relativeToPar,
          startTime: participant.teetime,
          netTotalShots,
          netRelativeToPar,
          courseHandicap,
          handicapStrokesPerHole,
          isDNF,
        };
      }
    });

    // Sort leaderboard
    const sortedLeaderboard = this.sortLeaderboard(leaderboard);

    // Build categoryTees for the response
    const categoryTeesResponse = this.buildCategoryTeesResponse(categories, categoryTeeRatings);

    // Add points and positions for tour competitions
    let leaderboardWithPoints = sortedLeaderboard;
    if (isTourCompetition) {
      if (isResultsFinal) {
        const storedResults = this.findStoredResultRows(competitionId);
        leaderboardWithPoints = this.addStoredPointsToLeaderboard(sortedLeaderboard, storedResults);
      } else {
        const pointTemplate = competition.point_template_id
          ? this.findPointTemplateRow(competition.point_template_id)
          : null;
        leaderboardWithPoints = this.addProjectedPointsToLeaderboard(
          sortedLeaderboard,
          pointTemplate,
          competition.points_multiplier || 1
        );
      }
    }

    return {
      entries: leaderboardWithPoints,
      competitionId,
      scoringMode,
      isTourCompetition,
      isResultsFinal,
      tee: teeInfo,
      categoryTees: categoryTeesResponse,
      categories: categories.length > 0 ? categories : undefined,
    };
  }

  /**
   * Calculate projected points for a position (used for live leaderboards)
   */
  private calculateProjectedPoints(
    position: number,
    numberOfPlayers: number,
    pointTemplate: { id: number; name: string; points_structure: string } | null,
    pointsMultiplier: number
  ): number {
    if (position <= 0) return 0;

    let basePoints: number;

    if (pointTemplate) {
      try {
        const structure: Record<string, number> = JSON.parse(pointTemplate.points_structure);
        if (structure[position.toString()]) {
          basePoints = structure[position.toString()];
        } else {
          basePoints = structure["default"] || 0;
        }
      } catch {
        basePoints = 0;
      }
    } else {
      // Default formula
      if (position === 1) {
        basePoints = numberOfPlayers + 2;
      } else if (position === 2) {
        basePoints = numberOfPlayers;
      } else {
        basePoints = numberOfPlayers - (position - 1);
        basePoints = Math.max(0, basePoints);
      }
    }

    return Math.round(basePoints * pointsMultiplier);
  }

  async getTeamLeaderboard(
    competitionId: number
  ): Promise<TeamLeaderboardEntry[]> {
    // Get the regular leaderboard
    const leaderboard = await this.getLeaderboard(competitionId);

    // Get the competition to check if it belongs to a series
    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Get number of teams in the series (if competition belongs to a series)
    const numberOfTeams = competition.series_id
      ? this.findSeriesTeamCount(competition.series_id)
      : 0;

    // Transform leaderboard data into team leaderboard format
    return this.transformLeaderboardToTeamLeaderboard(
      leaderboard,
      numberOfTeams,
      competition.points_multiplier
    );
  }

  private transformLeaderboardToTeamLeaderboard(
    leaderboard: LeaderboardEntry[],
    numberOfTeams: number,
    pointsMultiplier: number = 1
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
            numberOfTeams,
            pointsMultiplier
          );
          lastScoreSignature = scoreSignature;
        }
      });
    }

    return sortedTeams;
  }

  private calculateTeamPoints(position: number, numberOfTeams: number, multiplier: number = 1): number {
    return calculateDefaultPoints(position, numberOfTeams, multiplier);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Logic Methods (pure business logic, no SQL)
  // ─────────────────────────────────────────────────────────────────────────────

  private transformCompetitionRowToResult(row: CompetitionWithCourseRow): Competition & { course: { id: number; name: string }; participant_count: number } {
    return {
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
      participant_count: row.participant_count ?? 0,
    };
  }

  private transformParticipantRowForLeaderboard(
    row: ParticipantWithDetailsRow,
    parsedScore: number[],
    handicapIndex: number | null,
    categoryId: number | null,
    categoryName: string | null
  ): Participant & { team_name: string; category_id?: number; category_name?: string } {
    return {
      id: row.id,
      tee_order: row.tee_order,
      team_id: row.team_id,
      tee_time_id: row.tee_time_id,
      position_name: row.position_name,
      player_names: row.player_names,
      player_id: row.player_id,
      score: parsedScore,
      is_locked: Boolean(row.is_locked),
      locked_at: row.locked_at,
      handicap_index: handicapIndex,
      manual_score_out: row.manual_score_out,
      manual_score_in: row.manual_score_in,
      manual_score_total: row.manual_score_total,
      is_dq: Boolean(row.is_dq),
      admin_notes: row.admin_notes,
      admin_modified_by: row.admin_modified_by,
      admin_modified_at: row.admin_modified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      team_name: row.team_name,
      category_id: categoryId ?? undefined,
      category_name: categoryName ?? undefined,
    };
  }

  private parseStrokeIndex(json: string | null): number[] {
    if (!json) return getDefaultStrokeIndex();
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      return Array.isArray(parsed) ? parsed : getDefaultStrokeIndex();
    } catch {
      return getDefaultStrokeIndex();
    }
  }

  private extractTeeRatings(tee: TeeRow): { courseRating: number; slopeRating: number } {
    let courseRating = tee.course_rating || GOLF.STANDARD_COURSE_RATING;
    let slopeRating = tee.slope_rating || GOLF.STANDARD_SLOPE_RATING;

    if (tee.ratings_json) {
      const ratings = safeParseJsonWithDefault<TeeRating[]>(tee.ratings_json, []);
      const menRating = ratings.find((r) => r.gender === "men");
      if (menRating) {
        courseRating = menRating.course_rating;
        slopeRating = menRating.slope_rating;
      }
    }

    return { courseRating, slopeRating };
  }

  private buildTeeInfo(tee: TeeRow, strokeIndex: number[], courseRating: number, slopeRating: number): LeaderboardResponse["tee"] {
    return {
      id: tee.id,
      name: tee.name,
      color: tee.color,
      courseRating,
      slopeRating,
      strokeIndex,
    };
  }

  private buildDefaultTeeInfo(courseRating: number, slopeRating: number, strokeIndex: number[]): LeaderboardResponse["tee"] {
    return {
      id: 0,
      name: "Default",
      courseRating,
      slopeRating,
      strokeIndex,
    };
  }

  private buildPlayerHandicapMap(rows: PlayerHandicapRow[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.handicap_index !== null) {
        map.set(row.player_id, row.handicap_index);
      }
    }
    return map;
  }

  private transformCategoryTeeRow(row: CategoryTeeRow): CategoryTeeRating {
    const strokeIndex = this.parseStrokeIndex(row.stroke_index);

    let courseRating = row.legacy_course_rating || GOLF.STANDARD_COURSE_RATING;
    let slopeRating = row.legacy_slope_rating || GOLF.STANDARD_SLOPE_RATING;

    if (row.ratings_json) {
      const ratings = safeParseJsonWithDefault<TeeRating[]>(row.ratings_json, []);
      const menRating = ratings.find((r) => r.gender === "men");
      if (menRating) {
        courseRating = menRating.course_rating;
        slopeRating = menRating.slope_rating;
      } else if (ratings.length > 0) {
        courseRating = ratings[0].course_rating;
        slopeRating = ratings[0].slope_rating;
      }
    }

    return {
      categoryId: row.category_id,
      teeId: row.tee_id,
      teeName: row.tee_name,
      courseRating,
      slopeRating,
      strokeIndex,
    };
  }

  private buildCategoryTeeRatingsMap(rows: CategoryTeeRow[]): Map<number, CategoryTeeRating> {
    const map = new Map<number, CategoryTeeRating>();
    for (const row of rows) {
      map.set(row.category_id, this.transformCategoryTeeRow(row));
    }
    return map;
  }

  private parseParticipantScore(score: string | number[] | null): number[] {
    if (typeof score === "string") {
      return safeParseJsonWithDefault<number[]>(score, []);
    }
    return Array.isArray(score) ? score : [];
  }

  private calculateHolesPlayed(score: number[]): number {
    return score.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
  }

  private calculateTotalShots(score: number[]): number {
    return score.reduce((sum, shots) => sum + (shots > 0 ? shots : 0), 0);
  }

  private calculateRelativeToPar(score: number[], pars: number[]): number {
    let relativeToPar = 0;
    for (let i = 0; i < score.length; i++) {
      if (score[i] > 0 && pars[i] !== undefined) {
        relativeToPar += score[i] - pars[i];
      }
    }
    return relativeToPar;
  }

  private calculateNetScores(
    score: number[],
    pars: number[],
    holesPlayed: number,
    totalShots: number,
    courseHandicap: number,
    handicapStrokesPerHole: number[]
  ): { netTotalShots: number | undefined; netRelativeToPar: number | undefined } {
    if (holesPlayed === 0 || score.includes(GOLF.UNREPORTED_HOLE)) {
      return { netTotalShots: undefined, netRelativeToPar: undefined };
    }

    let netScore = 0;
    let parForHolesPlayed = 0;
    for (let i = 0; i < score.length; i++) {
      if (score[i] > 0) {
        netScore += score[i] - handicapStrokesPerHole[i];
        parForHolesPlayed += pars[i] || 0;
      }
    }
    const netRelativeToPar = netScore - parForHolesPlayed;

    // Only set netTotalShots for completed rounds
    const netTotalShots = holesPlayed === GOLF.HOLES_PER_ROUND ? totalShots - courseHandicap : undefined;

    return { netTotalShots, netRelativeToPar };
  }

  private isCompetitionWindowClosed(competition: CompetitionRow): boolean {
    return competition.start_mode === "open" &&
      !!competition.open_end &&
      new Date(competition.open_end) < new Date();
  }

  private getTeeInfoForCompetition(
    teeId: number | null | undefined,
    scoringMode: TourScoringMode | undefined
  ): {
    teeInfo: LeaderboardResponse["tee"] | undefined;
    strokeIndex: number[];
    courseRating: number;
    slopeRating: number;
  } {
    let strokeIndex = getDefaultStrokeIndex();
    let courseRating: number = GOLF.STANDARD_COURSE_RATING;
    let slopeRating: number = GOLF.STANDARD_SLOPE_RATING;
    let teeInfo: LeaderboardResponse["tee"] | undefined;

    if (teeId) {
      const tee = this.findTeeWithRatings(teeId);
      if (tee) {
        strokeIndex = this.parseStrokeIndex(tee.stroke_index);
        const ratings = this.extractTeeRatings(tee);
        courseRating = ratings.courseRating;
        slopeRating = ratings.slopeRating;
        teeInfo = this.buildTeeInfo(tee, strokeIndex, courseRating, slopeRating);
      }
    }

    // If no tee but net scoring is enabled, still return default tee info for UI
    if (!teeInfo && scoringMode && scoringMode !== "gross") {
      teeInfo = this.buildDefaultTeeInfo(courseRating, slopeRating, strokeIndex);
    }

    return { teeInfo, strokeIndex, courseRating, slopeRating };
  }

  private getPlayerHandicapsForCompetition(
    tourId: number | null | undefined,
    scoringMode: TourScoringMode | undefined
  ): Map<number, number> {
    if (!tourId || !scoringMode || scoringMode === "gross") {
      return new Map<number, number>();
    }
    const handicapRows = this.findPlayerHandicapRows(tourId);
    return this.buildPlayerHandicapMap(handicapRows);
  }

  private getCategoryTeeRatingsForCompetition(
    competitionId: number,
    tourId: number | null | undefined,
    scoringMode: TourScoringMode | undefined
  ): Map<number, CategoryTeeRating> {
    if (!tourId || !scoringMode || scoringMode === "gross") {
      return new Map<number, CategoryTeeRating>();
    }
    const categoryTeeRows = this.findCategoryTeeRows(competitionId);
    return this.buildCategoryTeeRatingsMap(categoryTeeRows);
  }

  private sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      // DQ entries always go to the very bottom
      const aIsDQ = a.participant.is_dq;
      const bIsDQ = b.participant.is_dq;
      if (aIsDQ && !bIsDQ) return 1;
      if (!aIsDQ && bIsDQ) return -1;
      if (aIsDQ && bIsDQ) {
        const aName = a.participant.player_names || a.participant.team_name || '';
        const bName = b.participant.player_names || b.participant.team_name || '';
        return aName.localeCompare(bName);
      }
      // DNF entries go above DQ but below normal entries
      if (a.isDNF && !b.isDNF) return 1;
      if (!a.isDNF && b.isDNF) return -1;
      if (a.isDNF && b.isDNF) {
        return b.holesPlayed - a.holesPlayed;
      }
      // Normal sorting by relative to par
      return a.relativeToPar - b.relativeToPar;
    });
  }

  private buildCategoryTeesResponse(
    categories: CategoryRow[],
    categoryTeeRatings: Map<number, CategoryTeeRating>
  ): LeaderboardResponse["categoryTees"] | undefined {
    if (categoryTeeRatings.size === 0 || categories.length === 0) {
      return undefined;
    }

    const response: LeaderboardResponse["categoryTees"] = [];
    for (const cat of categories) {
      const catTee = categoryTeeRatings.get(cat.id);
      if (catTee) {
        response.push({
          categoryId: cat.id,
          categoryName: cat.name,
          teeId: catTee.teeId,
          teeName: catTee.teeName,
          courseRating: catTee.courseRating,
          slopeRating: catTee.slopeRating,
        });
      }
    }

    return response.length > 0 ? response : undefined;
  }

  private addStoredPointsToLeaderboard(
    entries: LeaderboardEntry[],
    storedResults: StoredResultRow[]
  ): LeaderboardEntry[] {
    // Separate gross and net results into maps
    const grossResultsMap = new Map<number, StoredResultRow>();
    const netResultsMap = new Map<number, StoredResultRow>();

    for (const r of storedResults) {
      if (r.scoring_type === "gross") {
        grossResultsMap.set(r.participant_id, r);
      } else if (r.scoring_type === "net") {
        netResultsMap.set(r.participant_id, r);
      }
    }

    return entries.map(entry => {
      const grossStored = grossResultsMap.get(entry.participant.id);
      const netStored = netResultsMap.get(entry.participant.id);
      return {
        ...entry,
        position: grossStored?.position || 0,
        points: grossStored?.points || 0,
        netPosition: netStored?.position,
        netPoints: netStored?.points,
        isProjected: false,
      };
    });
  }

  private addProjectedPointsToLeaderboard(
    sortedEntries: LeaderboardEntry[],
    pointTemplate: PointTemplateRow | null,
    pointsMultiplier: number
  ): LeaderboardEntry[] {
    const finishedPlayers = sortedEntries.filter(
      e => e.holesPlayed === GOLF.HOLES_PER_ROUND && !e.participant.is_dq && !e.isDNF
    );
    const numberOfPlayers = finishedPlayers.length;

    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;

    return sortedEntries.map((entry, index) => {
      if (entry.holesPlayed < GOLF.HOLES_PER_ROUND || entry.participant.is_dq || entry.isDNF) {
        return {
          ...entry,
          position: 0,
          points: 0,
          isProjected: true,
        };
      }

      if (entry.relativeToPar !== previousScore) {
        currentPosition = sortedEntries
          .slice(0, index)
          .filter(e => e.holesPlayed === GOLF.HOLES_PER_ROUND && !e.participant.is_dq && !e.isDNF).length + 1;
      }
      previousScore = entry.relativeToPar;

      const points = this.calculateProjectedPoints(
        currentPosition,
        numberOfPlayers,
        pointTemplate,
        pointsMultiplier
      );

      return {
        ...entry,
        position: currentPosition,
        points,
        isProjected: true,
      };
    });
  }

  private validateCompetitionName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Competition name is required");
    }
  }

  private validateCompetitionDate(date: string | undefined): void {
    if (!date?.trim()) {
      throw new Error("Competition date is required");
    }
    if (!isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }

  private validateCompetitionNameNotEmpty(name: string | undefined): void {
    if (name && !name.trim()) {
      throw new Error("Competition name cannot be empty");
    }
  }

  private validateCompetitionDateFormat(date: string | undefined): void {
    if (date && !isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }

  private buildUpdateFields(data: UpdateCompetitionDto): { updates: string[]; values: (string | number | null)[] } {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

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
    if (data.tour_id !== undefined) {
      updates.push("tour_id = ?");
      values.push(data.tour_id);
    }
    if (data.tee_id !== undefined) {
      updates.push("tee_id = ?");
      values.push(data.tee_id);
    }
    if (data.manual_entry_format) {
      updates.push("manual_entry_format = ?");
      values.push(data.manual_entry_format);
    }
    if (data.points_multiplier !== undefined) {
      updates.push("points_multiplier = ?");
      values.push(data.points_multiplier);
    }
    if (data.venue_type !== undefined) {
      updates.push("venue_type = ?");
      values.push(data.venue_type);
    }
    if (data.start_mode !== undefined) {
      updates.push("start_mode = ?");
      values.push(data.start_mode);
    }
    if (data.open_start !== undefined) {
      updates.push("open_start = ?");
      values.push(data.open_start);
    }
    if (data.open_end !== undefined) {
      updates.push("open_end = ?");
      values.push(data.open_end);
    }

    return { updates, values };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────────────────

  private findCourseExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM courses WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findSeriesExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM series WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findTourExists(id: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM tours WHERE id = ?");
    return stmt.get(id) !== null;
  }

  private findTeeWithCourse(id: number): { id: number; course_id: number } | null {
    const stmt = this.db.prepare("SELECT id, course_id FROM course_tees WHERE id = ?");
    return stmt.get(id) as { id: number; course_id: number } | null;
  }

  private findTeeTimesForCompetition(competitionId: number): { id: number }[] {
    const stmt = this.db.prepare("SELECT id FROM tee_times WHERE competition_id = ?");
    return stmt.all(competitionId) as { id: number }[];
  }

  private findAllCompetitionRows(): CompetitionWithCourseRow[] {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
    `);
    return stmt.all() as CompetitionWithCourseRow[];
  }

  private findCompetitionRowById(id: number): CompetitionWithCourseRow | null {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    return stmt.get(id) as CompetitionWithCourseRow | null;
  }

  private findCompetitionWithPars(id: number): CompetitionRow | null {
    const stmt = this.db.prepare(`
      SELECT c.*, co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    return stmt.get(id) as CompetitionRow | null;
  }

  private findTourScoringMode(tourId: number): TourScoringMode | undefined {
    const stmt = this.db.prepare("SELECT scoring_mode FROM tours WHERE id = ?");
    const tour = stmt.get(tourId) as { scoring_mode: string } | null;
    return tour?.scoring_mode as TourScoringMode | undefined;
  }

  private findTeeWithRatings(teeId: number): TeeRow | null {
    const stmt = this.db.prepare(`
      SELECT ct.*,
             (SELECT json_group_array(json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating))
              FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
      FROM course_tees ct
      WHERE ct.id = ?
    `);
    return stmt.get(teeId) as TeeRow | null;
  }

  private findPlayerHandicapRows(tourId: number): PlayerHandicapRow[] {
    const stmt = this.db.prepare(`
      SELECT te.player_id, COALESCE(te.playing_handicap, p.handicap) as handicap_index
      FROM tour_enrollments te
      JOIN players p ON te.player_id = p.id
      WHERE te.tour_id = ? AND te.player_id IS NOT NULL AND te.status = 'active'
    `);
    return stmt.all(tourId) as PlayerHandicapRow[];
  }

  private findParticipantsForCompetition(competitionId: number): ParticipantWithDetailsRow[] {
    const stmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name, tm.id as team_id, t.teetime, p.player_id,
             te.category_id, tc.name as category_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      LEFT JOIN competitions c ON t.competition_id = c.id
      LEFT JOIN tour_enrollments te ON p.player_id = te.player_id AND c.tour_id = te.tour_id
      LEFT JOIN tour_categories tc ON te.category_id = tc.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    return stmt.all(competitionId) as ParticipantWithDetailsRow[];
  }

  private findCategoriesForCompetition(tourId: number, competitionId: number): CategoryRow[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT tc.id, tc.tour_id, tc.name, tc.description, tc.sort_order, tc.created_at
      FROM tour_categories tc
      INNER JOIN tour_enrollments te ON tc.id = te.category_id
      INNER JOIN participants p ON te.player_id = p.player_id
      INNER JOIN tee_times t ON p.tee_time_id = t.id
      WHERE tc.tour_id = ? AND t.competition_id = ?
      ORDER BY tc.sort_order ASC, tc.name ASC
    `);
    return stmt.all(tourId, competitionId) as CategoryRow[];
  }

  private findCategoryTeeRows(competitionId: number): CategoryTeeRow[] {
    const stmt = this.db.prepare(`
      SELECT
        cct.category_id,
        cct.tee_id,
        ct.name as tee_name,
        ct.stroke_index,
        ct.course_rating as legacy_course_rating,
        ct.slope_rating as legacy_slope_rating,
        (SELECT json_group_array(json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating))
         FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
      FROM competition_category_tees cct
      JOIN course_tees ct ON cct.tee_id = ct.id
      WHERE cct.competition_id = ?
    `);
    return stmt.all(competitionId) as CategoryTeeRow[];
  }

  private findStoredResultRows(competitionId: number): StoredResultRow[] {
    const stmt = this.db.prepare(`
      SELECT participant_id, position, points, scoring_type
      FROM competition_results
      WHERE competition_id = ?
    `);
    return stmt.all(competitionId) as StoredResultRow[];
  }

  private findPointTemplateRow(templateId: number): PointTemplateRow | null {
    const stmt = this.db.prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?");
    return stmt.get(templateId) as PointTemplateRow | null;
  }

  private findSeriesTeamCount(seriesId: number): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM series_teams WHERE series_id = ?");
    const result = stmt.get(seriesId) as { count: number } | null;
    return result?.count || 0;
  }

  private insertCompetitionRow(data: CreateCompetitionDto): Competition {
    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, date, course_id, series_id, tour_id, tee_id, manual_entry_format, points_multiplier, venue_type, start_mode, open_start, open_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      data.name,
      data.date,
      data.course_id,
      data.series_id || null,
      data.tour_id || null,
      data.tee_id || null,
      data.manual_entry_format || "out_in_total",
      data.points_multiplier ?? 1,
      data.venue_type || "outdoor",
      data.start_mode || "scheduled",
      data.open_start || null,
      data.open_end || null
    ) as Competition;
  }

  private updateCompetitionRow(id: number, updates: string[], values: (string | number | null)[]): Competition {
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

  private deleteCompetitionRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }
}
