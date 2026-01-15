import { Database } from "bun:sqlite";
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  Participant,
  TeamLeaderboardEntry,
  TourScoringMode,
} from "../types";
import {
  calculateCourseHandicap,
  distributeHandicapStrokes,
} from "../utils/handicap";
import { GOLF } from "../constants/golf";
import { parseParsArray, safeParseJsonWithDefault } from "../utils/parsing";
import { calculateDefaultPoints } from "../utils/points";
import {
  calculateHolesPlayed,
  calculateGrossScore,
  calculateRelativeToPar,
  hasInvalidHole,
} from "../utils/golf-scoring";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types (for database rows)
// ─────────────────────────────────────────────────────────────────────────────

interface CompetitionRow {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id: number | null;
  tour_id: number | null;
  tee_id: number | null;
  points_multiplier: number | null;
  start_mode: string | null;
  open_end: string | null;
  pars: string;
  course_stroke_index: string | null;
  is_results_final?: number;
  point_template_id?: number;
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

interface ParticipantWithDetailsRow {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_name: string | null;
  player_id: number | null;
  score: string | number[];
  is_locked: number;
  locked_at: string | null;
  handicap_index: number | null;
  manual_score_out: number | null;
  manual_score_in: number | null;
  manual_score_total: number | null;
  is_dq: number;
  admin_notes: string | null;
  admin_modified_by: number | null;
  admin_modified_at: string | null;
  created_at: string;
  updated_at: string;
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
  // Note: strokeIndex is now a course property, not tee-specific
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

interface TeamGroup {
  teamId: number;
  teamName: string;
  participants: LeaderboardEntry[];
  totalShots: number;
  totalRelativeScore: number;
  maxHolesCompleted: number;
  startTime: string | null;
}

/**
 * Context object bundling all data needed for leaderboard calculations.
 * This reduces parameter passing and makes the code cleaner.
 */
interface LeaderboardContext {
  competition: CompetitionRow;
  pars: number[];
  totalPar: number;
  scoringMode: TourScoringMode | undefined;
  isTourCompetition: boolean;
  isResultsFinal: boolean;
  isOpenCompetitionClosed: boolean;
  teeInfo: LeaderboardResponse["tee"] | undefined;
  strokeIndex: number[];
  courseRating: number;
  slopeRating: number;
  categoryTeeRatings: Map<number, CategoryTeeRating>;
  categories: CategoryRow[];
  playerHandicaps: Map<number, number>;
}

export class LeaderboardService {
  constructor(private db: Database) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API Methods
  // ─────────────────────────────────────────────────────────────────────────────

  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    const response = await this.getLeaderboardWithDetails(competitionId);
    return response.entries;
  }

  async getLeaderboardWithDetails(competitionId: number): Promise<LeaderboardResponse> {
    // Step 1: Load context
    const context = this.loadLeaderboardContext(competitionId);

    // Step 2: Build entries for each participant
    const participants = this.findParticipantsForCompetition(competitionId);
    const entries = participants.map((p) => this.buildParticipantEntry(p, context));

    // Step 3: Sort by score
    const sortedEntries = this.sortLeaderboard(entries);

    // Step 4: Add points
    const entriesWithPoints = this.addPointsToLeaderboard(sortedEntries, context, competitionId);

    // Step 5: Build response
    return this.buildLeaderboardResponse(entriesWithPoints, context, competitionId);
  }

  async getTeamLeaderboard(competitionId: number): Promise<TeamLeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard(competitionId);

    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Count actual teams participating in this competition
    const numberOfTeams = this.findCompetitionTeamCount(competitionId);

    return this.transformLeaderboardToTeamLeaderboard(
      leaderboard,
      numberOfTeams,
      competition.points_multiplier || 1
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Loading
  // ─────────────────────────────────────────────────────────────────────────────

  private loadLeaderboardContext(competitionId: number): LeaderboardContext {
    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    const isTourCompetition = !!competition.tour_id;
    const isResultsFinal = !!competition.is_results_final;

    const scoringMode = competition.tour_id
      ? this.findTourScoringMode(competition.tour_id)
      : undefined;

    // Stroke index comes from the course (not the tee)
    // Only parse if we need it for net scoring calculations
    const needsStrokeIndex = scoringMode && scoringMode !== "gross";
    const strokeIndex = needsStrokeIndex
      ? this.parseStrokeIndex(competition.course_stroke_index)
      : [];

    const { teeInfo, courseRating, slopeRating } = this.getTeeInfoForCompetition(
      competition.tee_id,
      scoringMode,
      strokeIndex
    );

    const playerHandicaps = this.getPlayerHandicapsForCompetition(
      competition.tour_id,
      scoringMode
    );

    const categories = competition.tour_id
      ? this.findCategoriesForCompetition(competition.tour_id, competitionId)
      : [];

    const categoryTeeRatings = this.getCategoryTeeRatingsForCompetition(
      competitionId,
      competition.tour_id,
      scoringMode
    );

    const pars = parseParsArray(competition.pars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    const isOpenCompetitionClosed = this.isCompetitionWindowClosed(competition);

    return {
      competition,
      pars,
      totalPar,
      scoringMode,
      isTourCompetition,
      isResultsFinal,
      isOpenCompetitionClosed,
      teeInfo,
      strokeIndex,
      courseRating,
      slopeRating,
      categoryTeeRatings,
      categories,
      playerHandicaps,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Entry Building
  // ─────────────────────────────────────────────────────────────────────────────

  private buildParticipantEntry(
    participant: ParticipantWithDetailsRow,
    context: LeaderboardContext
  ): LeaderboardEntry {
    const score = this.parseParticipantScore(participant.score);

    const handicapIndex = this.getParticipantHandicapIndex(participant, context.playerHandicaps);

    const handicapInfo = this.calculateHandicapInfo(
      participant,
      handicapIndex,
      context
    );

    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return this.buildManualScoreEntry(participant, score, handicapIndex, handicapInfo, context);
    }

    return this.buildHoleByHoleEntry(participant, score, handicapIndex, handicapInfo, context);
  }

  private getParticipantHandicapIndex(
    participant: ParticipantWithDetailsRow,
    playerHandicaps: Map<number, number>
  ): number | null {
    if (participant.handicap_index !== null && participant.handicap_index !== undefined) {
      return participant.handicap_index;
    }
    if (participant.player_id) {
      return playerHandicaps.get(participant.player_id) ?? null;
    }
    return null;
  }

  private calculateHandicapInfo(
    participant: ParticipantWithDetailsRow,
    handicapIndex: number | null,
    context: LeaderboardContext
  ): { courseHandicap?: number; handicapStrokesPerHole?: number[] } {
    if (handicapIndex === null || !context.scoringMode || context.scoringMode === "gross") {
      return {};
    }

    let playerCourseRating = context.courseRating;
    let playerSlopeRating = context.slopeRating;

    // Category tees only override course/slope ratings, not stroke index
    // Stroke index is a course property, constant for all tees
    if (participant.category_id && context.categoryTeeRatings.has(participant.category_id)) {
      const catTee = context.categoryTeeRatings.get(participant.category_id)!;
      playerCourseRating = catTee.courseRating;
      playerSlopeRating = catTee.slopeRating;
    }

    const courseHandicap = calculateCourseHandicap(
      handicapIndex,
      playerSlopeRating,
      playerCourseRating,
      context.totalPar
    );
    const handicapStrokesPerHole = distributeHandicapStrokes(courseHandicap, context.strokeIndex);

    return { courseHandicap, handicapStrokesPerHole };
  }

  private buildManualScoreEntry(
    participant: ParticipantWithDetailsRow,
    score: number[],
    handicapIndex: number | null,
    handicapInfo: { courseHandicap?: number; handicapStrokesPerHole?: number[] },
    context: LeaderboardContext
  ): LeaderboardEntry {
    const totalShots = participant.manual_score_total!;
    const holesPlayed = GOLF.HOLES_PER_ROUND;
    const relativeToPar = totalShots - context.totalPar;

    let netTotalShots: number | undefined;
    let netRelativeToPar: number | undefined;
    if (handicapInfo.courseHandicap !== undefined) {
      netTotalShots = totalShots - handicapInfo.courseHandicap;
      netRelativeToPar = netTotalShots - context.totalPar;
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
      courseHandicap: handicapInfo.courseHandicap,
      // handicapStrokesPerHole is calculated on the frontend from courseHandicap and strokeIndex
      isDNF: false,
    };
  }

  private buildHoleByHoleEntry(
    participant: ParticipantWithDetailsRow,
    score: number[],
    handicapIndex: number | null,
    handicapInfo: { courseHandicap?: number; handicapStrokesPerHole?: number[] },
    context: LeaderboardContext
  ): LeaderboardEntry {
    const holesPlayed = calculateHolesPlayed(score);
    const totalShots = calculateGrossScore(score);
    const relativeToPar = calculateRelativeToPar(score, context.pars);

    let netTotalShots: number | undefined;
    let netRelativeToPar: number | undefined;

    if (
      handicapInfo.courseHandicap !== undefined &&
      handicapInfo.handicapStrokesPerHole &&
      holesPlayed > 0 &&
      !hasInvalidHole(score)
    ) {
      const netScores = this.calculateNetScores(
        score,
        context.pars,
        holesPlayed,
        totalShots,
        handicapInfo.courseHandicap,
        handicapInfo.handicapStrokesPerHole
      );
      netTotalShots = netScores.netTotalShots;
      netRelativeToPar = netScores.netRelativeToPar;
    }

    const isDNF = context.isOpenCompetitionClosed && holesPlayed < GOLF.HOLES_PER_ROUND;

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
      courseHandicap: handicapInfo.courseHandicap,
      // handicapStrokesPerHole is calculated on the frontend from courseHandicap and strokeIndex
      isDNF,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Score Calculations (pure logic, no SQL)
  // ─────────────────────────────────────────────────────────────────────────────

  private parseParticipantScore(score: string | number[] | null): number[] {
    if (typeof score === "string") {
      return safeParseJsonWithDefault<number[]>(score, []);
    }
    return Array.isArray(score) ? score : [];
  }

  private calculateNetScores(
    score: number[],
    pars: number[],
    holesPlayed: number,
    totalShots: number,
    courseHandicap: number,
    handicapStrokesPerHole: number[]
  ): { netTotalShots: number | undefined; netRelativeToPar: number | undefined } {
    if (holesPlayed === 0 || hasInvalidHole(score)) {
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

    const netTotalShots =
      holesPlayed === GOLF.HOLES_PER_ROUND ? totalShots - courseHandicap : undefined;

    return { netTotalShots, netRelativeToPar };
  }

  private isCompetitionWindowClosed(competition: CompetitionRow): boolean {
    return (
      competition.start_mode === "open" &&
      !!competition.open_end &&
      new Date(competition.open_end) < new Date()
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tee and Handicap Info (orchestration methods)
  // ─────────────────────────────────────────────────────────────────────────────

  private getTeeInfoForCompetition(
    teeId: number | null | undefined,
    scoringMode: TourScoringMode | undefined,
    strokeIndex: number[]
  ): {
    teeInfo: LeaderboardResponse["tee"] | undefined;
    courseRating: number;
    slopeRating: number;
  } {
    let courseRating: number = GOLF.STANDARD_COURSE_RATING;
    let slopeRating: number = GOLF.STANDARD_SLOPE_RATING;
    let teeInfo: LeaderboardResponse["tee"] | undefined;

    if (teeId) {
      const tee = this.findTeeWithRatings(teeId);
      if (tee) {
        const ratings = this.extractTeeRatings(tee);
        courseRating = ratings.courseRating;
        slopeRating = ratings.slopeRating;
        teeInfo = this.buildTeeInfo(tee, strokeIndex, courseRating, slopeRating);
      }
    }

    if (!teeInfo && scoringMode && scoringMode !== "gross") {
      teeInfo = this.buildDefaultTeeInfo(courseRating, slopeRating, strokeIndex);
    }

    return { teeInfo, courseRating, slopeRating };
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Transform Methods (pure logic, no SQL)
  // ─────────────────────────────────────────────────────────────────────────────

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
      player_name: row.player_name,
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
    if (!json) {
      throw new Error("Course stroke_index is required but not set. Please configure stroke index for this course.");
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!Array.isArray(parsed) || parsed.length !== GOLF.HOLES_PER_ROUND) {
        throw new Error("Invalid stroke_index format: must be array of 18 numbers");
      }
      return parsed;
    } catch (e) {
      if (e instanceof Error && e.message.includes("stroke_index")) {
        throw e;
      }
      throw new Error(`Failed to parse stroke_index: ${e instanceof Error ? e.message : "unknown error"}`);
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

  private buildTeeInfo(
    tee: TeeRow,
    strokeIndex: number[],
    courseRating: number,
    slopeRating: number
  ): LeaderboardResponse["tee"] {
    return {
      id: tee.id,
      name: tee.name,
      color: tee.color,
      courseRating,
      slopeRating,
      strokeIndex,
    };
  }

  private buildDefaultTeeInfo(
    courseRating: number,
    slopeRating: number,
    strokeIndex: number[]
  ): LeaderboardResponse["tee"] {
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
    };
  }

  private buildCategoryTeeRatingsMap(rows: CategoryTeeRow[]): Map<number, CategoryTeeRating> {
    const map = new Map<number, CategoryTeeRating>();
    for (const row of rows) {
      map.set(row.category_id, this.transformCategoryTeeRow(row));
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sorting and Ranking
  // ─────────────────────────────────────────────────────────────────────────────

  private sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      // DQ entries always go to the very bottom
      const aIsDQ = a.participant.is_dq;
      const bIsDQ = b.participant.is_dq;
      if (aIsDQ && !bIsDQ) return 1;
      if (!aIsDQ && bIsDQ) return -1;
      if (aIsDQ && bIsDQ) {
        const aName = a.participant.player_name || a.participant.team_name || "";
        const bName = b.participant.player_name || b.participant.team_name || "";
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Points Assignment
  // ─────────────────────────────────────────────────────────────────────────────

  private addPointsToLeaderboard(
    sortedEntries: LeaderboardEntry[],
    context: LeaderboardContext,
    competitionId: number
  ): LeaderboardEntry[] {
    if (!context.isTourCompetition) {
      return sortedEntries;
    }

    if (context.isResultsFinal) {
      const storedResults = this.findStoredResultRows(competitionId);
      return this.addStoredPointsToLeaderboard(sortedEntries, storedResults);
    }

    const pointTemplate = context.competition.point_template_id
      ? this.findPointTemplateRow(context.competition.point_template_id)
      : null;

    return this.addProjectedPointsToLeaderboard(
      sortedEntries,
      pointTemplate,
      context.competition.points_multiplier || 1
    );
  }

  private addStoredPointsToLeaderboard(
    entries: LeaderboardEntry[],
    storedResults: StoredResultRow[]
  ): LeaderboardEntry[] {
    const grossResultsMap = new Map<number, StoredResultRow>();
    const netResultsMap = new Map<number, StoredResultRow>();

    for (const r of storedResults) {
      if (r.scoring_type === "gross") {
        grossResultsMap.set(r.participant_id, r);
      } else if (r.scoring_type === "net") {
        netResultsMap.set(r.participant_id, r);
      }
    }

    return entries.map((entry) => {
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
    // Calculate gross positions and points
    const grossPositions = this.calculateProjectedPositions(
      sortedEntries,
      (entry) => entry.relativeToPar,
      pointTemplate,
      pointsMultiplier
    );

    // Calculate net positions and points if entries have net scores
    const hasNetScores = sortedEntries.some((e) => e.netRelativeToPar !== undefined);
    const netPositions = hasNetScores
      ? this.calculateProjectedPositions(
          sortedEntries,
          (entry) => entry.netRelativeToPar ?? entry.relativeToPar,
          pointTemplate,
          pointsMultiplier
        )
      : null;

    // Merge results
    return sortedEntries.map((entry) => {
      const grossResult = grossPositions.get(entry.participant.id);
      const netResult = netPositions?.get(entry.participant.id);

      return {
        ...entry,
        position: grossResult?.position ?? 0,
        points: grossResult?.points ?? 0,
        netPosition: netResult?.position,
        netPoints: netResult?.points,
        isProjected: true,
      };
    });
  }

  private calculateProjectedPositions(
    entries: LeaderboardEntry[],
    scoreGetter: (entry: LeaderboardEntry) => number,
    pointTemplate: PointTemplateRow | null,
    pointsMultiplier: number
  ): Map<number, { position: number; points: number }> {
    const finishedPlayers = entries.filter(
      (e) => e.holesPlayed === GOLF.HOLES_PER_ROUND && !e.participant.is_dq && !e.isDNF
    );
    const numberOfPlayers = finishedPlayers.length;

    // Sort by the specified score
    const sortedByScore = [...finishedPlayers].sort((a, b) => {
      return scoreGetter(a) - scoreGetter(b);
    });

    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;

    const results = new Map<number, { position: number; points: number }>();

    sortedByScore.forEach((entry, index) => {
      const score = scoreGetter(entry);

      if (score !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = score;

      const points = this.calculateProjectedPoints(
        currentPosition,
        numberOfPlayers,
        pointTemplate,
        pointsMultiplier
      );

      results.set(entry.participant.id, { position: currentPosition, points });
    });

    return results;
  }

  private calculateProjectedPoints(
    position: number,
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null,
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
      basePoints = calculateDefaultPoints(position, numberOfPlayers);
    }

    return Math.round(basePoints * pointsMultiplier);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Response Building
  // ─────────────────────────────────────────────────────────────────────────────

  private buildLeaderboardResponse(
    entries: LeaderboardEntry[],
    context: LeaderboardContext,
    competitionId: number
  ): LeaderboardResponse {
    const categoryTeesResponse = this.buildCategoryTeesResponse(
      context.categories,
      context.categoryTeeRatings
    );

    return {
      entries,
      competitionId,
      scoringMode: context.scoringMode,
      isTourCompetition: context.isTourCompetition,
      isResultsFinal: context.isResultsFinal,
      tee: context.teeInfo,
      categoryTees: categoryTeesResponse,
      categories: context.categories.length > 0 ? context.categories : undefined,
    };
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Team Leaderboard
  // ─────────────────────────────────────────────────────────────────────────────

  private transformLeaderboardToTeamLeaderboard(
    leaderboard: LeaderboardEntry[],
    numberOfTeams: number,
    pointsMultiplier: number = 1
  ): TeamLeaderboardEntry[] {
    // 1. Group participants by team
    const teamGroups = this.groupParticipantsByTeam(leaderboard);

    // 2. Populate start times
    this.populateTeamStartTimes(teamGroups);

    // 3. Sort teams
    const sortedTeamGroups = this.sortTeamGroups(Object.values(teamGroups));

    // 4. Map to final format
    const sortedTeams = this.mapTeamGroupsToEntries(sortedTeamGroups);

    // 5. Calculate points
    this.assignTeamPoints(sortedTeams, numberOfTeams, pointsMultiplier);

    return sortedTeams;
  }

  private groupParticipantsByTeam(leaderboard: LeaderboardEntry[]): Record<number, TeamGroup> {
    return leaderboard.reduce((acc, entry) => {
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
        acc[teamId].maxHolesCompleted = Math.max(acc[teamId].maxHolesCompleted, entry.holesPlayed);
      }

      return acc;
    }, {} as Record<number, TeamGroup>);
  }

  private populateTeamStartTimes(teamGroups: Record<number, TeamGroup>): void {
    Object.values(teamGroups).forEach((team) => {
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
  }

  private sortTeamGroups(teamGroups: TeamGroup[]): TeamGroup[] {
    return teamGroups.sort((a, b) => {
      const statusA = this.getTeamStatus(a);
      const statusB = this.getTeamStatus(b);

      // Primary sort: By status
      if (statusA !== statusB) {
        const statusOrder = { FINISHED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };
        return statusOrder[statusA] - statusOrder[statusB];
      }

      // If status is the same and they haven't started, don't sort further
      if (statusA === "NOT_STARTED") return 0;

      // Secondary sort: By total score
      if (a.totalRelativeScore !== b.totalRelativeScore) {
        return a.totalRelativeScore - b.totalRelativeScore;
      }

      // Tie-breaker: Compare best individual scores
      return this.compareTeamIndividualScores(a, b);
    });
  }

  private getTeamStatus(team: TeamGroup): "NOT_STARTED" | "IN_PROGRESS" | "FINISHED" {
    const anyStarted = team.participants.some((p) => p.holesPlayed > 0);
    if (!anyStarted) return "NOT_STARTED";
    const allFinished = team.participants.every(
      (p) => p.participant.is_locked && !p.participant.score.includes(-1)
    );
    if (allFinished) return "FINISHED";
    return "IN_PROGRESS";
  }

  private compareTeamIndividualScores(a: TeamGroup, b: TeamGroup): number {
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

      if (scoreA === undefined) return 1;
      if (scoreB === undefined) return -1;

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
    }

    return 0;
  }

  private mapTeamGroupsToEntries(sortedTeamGroups: TeamGroup[]): TeamLeaderboardEntry[] {
    return sortedTeamGroups.map((team) => {
      const status = this.getTeamStatus(team);
      const anyStarted = team.participants.some((p) => p.holesPlayed > 0);

      let displayProgress: string;
      if (status === "NOT_STARTED") {
        displayProgress = team.startTime ? `Starts ${team.startTime}` : "Starts TBD";
      } else if (status === "FINISHED") {
        displayProgress = "F";
      } else {
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
        teamPoints: null,
      };
    });
  }

  private assignTeamPoints(
    sortedTeams: TeamLeaderboardEntry[],
    numberOfTeams: number,
    pointsMultiplier: number
  ): void {
    if (numberOfTeams <= 0) return;

    let currentPosition = 0;
    let lastScoreSignature: string | null = null;

    sortedTeams.forEach((team, index) => {
      if (team.status !== "NOT_STARTED") {
        const scoreSignature = `${team.totalRelativeScore}-${index}`;

        if (scoreSignature !== lastScoreSignature) {
          currentPosition = index + 1;
        }
        team.teamPoints = calculateDefaultPoints(currentPosition, numberOfTeams, pointsMultiplier);
        lastScoreSignature = scoreSignature;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────────────────

  private findCompetitionWithPars(id: number): CompetitionRow | null {
    const stmt = this.db.prepare(`
      SELECT c.*, co.pars, co.stroke_index as course_stroke_index
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
             te.category_id, tc.name as category_name,
             COALESCE(pp.display_name, pl.name, p.player_names) as player_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      LEFT JOIN competitions c ON t.competition_id = c.id
      LEFT JOIN players pl ON p.player_id = pl.id
      LEFT JOIN player_profiles pp ON pl.id = pp.player_id
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
    const stmt = this.db.prepare(
      "SELECT id, name, points_structure FROM point_templates WHERE id = ?"
    );
    return stmt.get(templateId) as PointTemplateRow | null;
  }

  private findSeriesTeamCount(seriesId: number): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM series_teams WHERE series_id = ?");
    const result = stmt.get(seriesId) as { count: number } | null;
    return result?.count || 0;
  }

  private findCompetitionTeamCount(competitionId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT p.team_id) as count
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      WHERE t.competition_id = ?
    `);
    const result = stmt.get(competitionId) as { count: number } | null;
    return result?.count || 0;
  }
}
