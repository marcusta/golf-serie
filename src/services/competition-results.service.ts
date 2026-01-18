import { Database } from "bun:sqlite";
import { GOLF } from "../constants/golf";
import { parseParsArray, safeParseJson } from "../utils/parsing";
import { calculateDefaultPoints } from "../utils/points";
import {
  calculateHolesPlayed,
  calculateGrossScore,
  calculateRelativeToPar,
  hasInvalidHole,
} from "../utils/golf-scoring";
import { assignPositionsMap } from "../utils/ranking";

interface PointsStructure {
  [key: string]: number;
}

interface ParticipantData {
  id: number;
  player_id: number;
  player_name: string;
  score: string;
  is_locked: number;
  is_dq: number;
  manual_score_total: number | null;
  handicap_index: number | null;
}

interface CompetitionResult {
  participant_id: number;
  player_id: number;
  player_name: string;
  gross_score: number;
  net_score: number | null;
  relative_to_par: number;
  is_finished: boolean;
  position: number;
  points: number;
}

export interface StoredCompetitionResult {
  id: number;
  competition_id: number;
  participant_id: number;
  player_id: number | null;
  position: number;
  points: number;
  gross_score: number | null;
  net_score: number | null;
  relative_to_par: number | null;
  scoring_type: "gross" | "net";
  calculated_at: string;
}

// ============================================================================
// Internal Row Types (database result shapes)
// ============================================================================

interface CompetitionDetailsRow {
  id: number;
  tour_id: number | null;
  course_id: number | null;
  pars: string | null;
  point_template_id: number | null;
  scoring_mode: string | null;
  start_mode: string;
  open_end: string | null;
  points_multiplier: number | null;
}

interface PointTemplateRow {
  id: number;
  name: string;
  points_structure: string;
}

interface EnrollmentCountRow {
  count: number;
}

interface CompetitionFinalRow {
  is_results_final: number;
}

interface TourStandingRow {
  player_id: number;
  player_name: string;
  total_points: number;
  competitions_played: number;
}

interface PlayerTourPointsRow {
  total_points: number | null;
  competitions_played: number;
}

interface PlayerResultRow {
  id: number;
  competition_id: number;
  participant_id: number;
  player_id: number | null;
  position: number;
  points: number;
  gross_score: number | null;
  net_score: number | null;
  relative_to_par: number | null;
  scoring_type: "gross" | "net";
  calculated_at: string;
  competition_name: string;
  competition_date: string;
  tour_id: number | null;
  tour_name: string | null;
}

export class CompetitionResultsService {
  constructor(private db: Database) {}

  // ============================================================================
  // Query Methods (private, single SQL statement)
  // ============================================================================

  private findCompetitionDetails(competitionId: number): CompetitionDetailsRow | null {
    return this.db
      .prepare(`
        SELECT c.*, co.pars, t.point_template_id, t.scoring_mode
        FROM competitions c
        LEFT JOIN courses co ON c.course_id = co.id
        LEFT JOIN tours t ON c.tour_id = t.id
        WHERE c.id = ?
      `)
      .get(competitionId) as CompetitionDetailsRow | null;
  }

  private findPointTemplateRow(templateId: number): PointTemplateRow | null {
    return this.db
      .prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?")
      .get(templateId) as PointTemplateRow | null;
  }

  private findActiveEnrollmentCount(tourId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'")
      .get(tourId) as EnrollmentCountRow;
    return row.count;
  }

  private findParticipantDataRows(competitionId: number): ParticipantData[] {
    return this.db
      .prepare(`
        SELECT
          p.id,
          p.player_id,
          p.score,
          p.is_locked,
          p.is_dq,
          p.manual_score_total,
          p.handicap_index,
          pl.name as player_name
        FROM participants p
        JOIN players pl ON p.player_id = pl.id
        JOIN tee_times tt ON p.tee_time_id = tt.id
        WHERE tt.competition_id = ? AND p.player_id IS NOT NULL
      `)
      .all(competitionId) as ParticipantData[];
  }

  private deleteCompetitionResultRows(competitionId: number): void {
    this.db
      .prepare("DELETE FROM competition_results WHERE competition_id = ?")
      .run(competitionId);
  }

  private insertCompetitionResultRow(
    competitionId: number,
    result: CompetitionResult,
    scoringType: "gross" | "net"
  ): void {
    this.db
      .prepare(`
        INSERT INTO competition_results
          (competition_id, participant_id, player_id, position, points, gross_score, net_score, relative_to_par, scoring_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        competitionId,
        result.participant_id,
        result.player_id,
        result.position,
        result.points,
        result.gross_score,
        result.net_score,
        result.relative_to_par,
        scoringType
      );
  }

  private updateCompetitionFinalizedRow(competitionId: number): void {
    this.db
      .prepare(`
        UPDATE competitions
        SET is_results_final = 1, results_finalized_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(competitionId);
  }

  private findCompetitionResultRows(
    competitionId: number,
    scoringType: "gross" | "net"
  ): StoredCompetitionResult[] {
    return this.db
      .prepare(`
        SELECT cr.*, pl.name as player_name
        FROM competition_results cr
        LEFT JOIN players pl ON cr.player_id = pl.id
        WHERE cr.competition_id = ? AND cr.scoring_type = ?
        ORDER BY cr.position ASC
      `)
      .all(competitionId, scoringType) as StoredCompetitionResult[];
  }

  private findPlayerResultRows(playerId: number, scoringType: "gross" | "net"): PlayerResultRow[] {
    return this.db
      .prepare(`
        SELECT
          cr.*,
          c.name as competition_name,
          c.date as competition_date,
          c.tour_id,
          t.name as tour_name
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        LEFT JOIN tours t ON c.tour_id = t.id
        WHERE cr.player_id = ? AND cr.scoring_type = ?
        ORDER BY c.date DESC
      `)
      .all(playerId, scoringType) as PlayerResultRow[];
  }

  private findCompetitionFinalizedRow(competitionId: number): CompetitionFinalRow | null {
    return this.db
      .prepare("SELECT is_results_final FROM competitions WHERE id = ?")
      .get(competitionId) as CompetitionFinalRow | null;
  }

  private findPlayerTourPointsRow(
    playerId: number,
    tourId: number,
    scoringType: "gross" | "net"
  ): PlayerTourPointsRow {
    return this.db
      .prepare(`
        SELECT
          SUM(cr.points) as total_points,
          COUNT(DISTINCT cr.competition_id) as competitions_played
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        WHERE cr.player_id = ?
          AND c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
      `)
      .get(playerId, tourId, scoringType) as PlayerTourPointsRow;
  }

  private findTourStandingRows(tourId: number, scoringType: "gross" | "net"): TourStandingRow[] {
    return this.db
      .prepare(`
        SELECT
          cr.player_id,
          pl.name as player_name,
          SUM(cr.points) as total_points,
          COUNT(DISTINCT cr.competition_id) as competitions_played
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        JOIN players pl ON cr.player_id = pl.id
        WHERE c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
        GROUP BY cr.player_id, pl.name
        ORDER BY total_points DESC, competitions_played DESC
      `)
      .all(tourId, scoringType) as TourStandingRow[];
  }

  // ============================================================================
  // Logic Methods (private, no SQL)
  // ============================================================================

  private parseParsFromCompetition(competition: CompetitionDetailsRow): {
    pars: number[];
    totalPar: number;
  } {
    if (!competition.pars) {
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    }

    try {
      const pars = parseParsArray(competition.pars);
      if (pars.length > 0) {
        const totalPar = pars.reduce((sum, p) => sum + p, 0);
        return { pars, totalPar };
      }
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    } catch {
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    }
  }

  private isOpenCompetitionClosed(competition: CompetitionDetailsRow): boolean {
    return (
      competition.start_mode === "open" &&
      competition.open_end !== null &&
      new Date(competition.open_end) < new Date()
    );
  }

  private parseParticipantScore(score: string | number[]): number[] {
    try {
      if (typeof score === "string") {
        return JSON.parse(score);
      }
      return Array.isArray(score) ? score : [];
    } catch {
      return [];
    }
  }

  private calculateNetScore(grossScore: number, handicapIndex: number | null): number | null {
    if (handicapIndex === null) {
      return null;
    }
    return grossScore - Math.round(handicapIndex);
  }

  private isParticipantFinished(
    participant: ParticipantData,
    score: number[],
    isOpenCompetitionClosed: boolean
  ): boolean {
    // DQ'd players are never considered finished
    if (participant.is_dq) {
      return false;
    }

    // Manual score means finished
    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return true;
    }

    const hasInvalidRound = hasInvalidHole(score);
    const holesPlayed = calculateHolesPlayed(score);

    if (isOpenCompetitionClosed) {
      // Competition window closed: finished if 18 holes played
      return holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    }

    // Competition still open: require is_locked
    return (
      participant.is_locked === 1 &&
      holesPlayed === GOLF.HOLES_PER_ROUND &&
      !hasInvalidRound
    );
  }

  private buildParticipantResult(
    participant: ParticipantData,
    pars: number[],
    totalPar: number,
    isOpenCompetitionClosed: boolean
  ): CompetitionResult {
    const score = this.parseParticipantScore(participant.score);
    const isFinished = this.isParticipantFinished(participant, score, isOpenCompetitionClosed);

    let grossScore = 0;
    let relativeToPar = 0;
    let netScore: number | null = null;

    if (isFinished) {
      if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
        grossScore = participant.manual_score_total;
        relativeToPar = grossScore - totalPar;
      } else {
        grossScore = calculateGrossScore(score);
        relativeToPar = calculateRelativeToPar(score, pars);
      }
      netScore = this.calculateNetScore(grossScore, participant.handicap_index);
    }

    return {
      participant_id: participant.id,
      player_id: participant.player_id,
      player_name: participant.player_name,
      gross_score: grossScore,
      net_score: netScore,
      relative_to_par: relativeToPar,
      is_finished: isFinished,
      position: 0,
      points: 0,
    };
  }

  private sortResultsByScore(results: CompetitionResult[]): CompetitionResult[] {
    return [...results].sort((a, b) => {
      if (a.relative_to_par !== b.relative_to_par) {
        return a.relative_to_par - b.relative_to_par;
      }
      // Tie-breaker: alphabetical by name
      return a.player_name.localeCompare(b.player_name);
    });
  }

  private sortResultsByNetScore(results: CompetitionResult[], totalPar: number): CompetitionResult[] {
    return [...results]
      .filter(r => r.net_score !== null)
      .sort((a, b) => {
        const aNetRelative = a.net_score! - totalPar;
        const bNetRelative = b.net_score! - totalPar;
        if (aNetRelative !== bNetRelative) {
          return aNetRelative - bNetRelative;
        }
        // Tie-breaker: alphabetical by name
        return a.player_name.localeCompare(b.player_name);
      });
  }

  private assignNetPositionsAndPoints(
    sortedResults: CompetitionResult[],
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null,
    pointsMultiplier: number,
    totalPar: number
  ): CompetitionResult[] {
    // Add net relative score to each result for grouping
    const resultsWithNetRelative = sortedResults.map(r => ({
      ...r,
      netRelative: r.net_score! - totalPar,
    }));

    // Group by net relative score
    const groups = this.groupResultsByScore(
      resultsWithNetRelative,
      r => r.netRelative
    );

    // Assign averaged points to each group
    return this.assignAveragedPointsToGroups(
      groups,
      numberOfPlayers,
      pointTemplate,
      pointsMultiplier,
      (r, position, points) => ({
        ...r,
        position,
        points,
        relative_to_par: r.netRelative,
      })
    );
  }

  private assignPositionsAndPoints(
    sortedResults: CompetitionResult[],
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null,
    pointsMultiplier: number
  ): CompetitionResult[] {
    // Group by relative_to_par score
    const groups = this.groupResultsByScore(
      sortedResults,
      r => r.relative_to_par
    );

    // Assign averaged points to each group
    return this.assignAveragedPointsToGroups(
      groups,
      numberOfPlayers,
      pointTemplate,
      pointsMultiplier,
      (r, position, points) => ({
        ...r,
        position,
        points,
      })
    );
  }

  /**
   * Group sorted results by score value
   */
  private groupResultsByScore<T>(
    sortedResults: T[],
    getScore: (r: T) => number
  ): T[][] {
    const groups: T[][] = [];
    let currentGroup: T[] = [];
    let previousScore = Number.MIN_SAFE_INTEGER;

    for (const result of sortedResults) {
      const score = getScore(result);
      if (score !== previousScore && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(result);
      previousScore = score;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Assign averaged points to groups of tied players
   * When players tie, they share the sum of points for all positions they occupy
   */
  private assignAveragedPointsToGroups<T, R>(
    groups: T[][],
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null,
    pointsMultiplier: number,
    mapResult: (result: T, position: number, points: number) => R
  ): R[] {
    const results: R[] = [];
    let currentPosition = 1;

    for (const group of groups) {
      const tiedCount = group.length;

      // Calculate sum of points for all positions this group occupies
      let totalPoints = 0;
      for (let i = 0; i < tiedCount; i++) {
        totalPoints += this.calculatePointsForPosition(
          currentPosition + i,
          numberOfPlayers,
          pointTemplate
        );
      }

      // Average and apply multiplier
      const averagedPoints = (totalPoints / tiedCount) * pointsMultiplier;

      // Assign to each player in the group
      for (const result of group) {
        results.push(mapResult(result, currentPosition, Math.round(averagedPoints)));
      }

      // Next group starts after all positions occupied by this group
      currentPosition += tiedCount;
    }

    return results;
  }

  private calculatePointsForPosition(
    position: number,
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null
  ): number {
    if (pointTemplate) {
      try {
        const structure = safeParseJson<PointsStructure>(
          pointTemplate.points_structure,
          "points_structure"
        );
        if (structure[position.toString()]) {
          return structure[position.toString()];
        }
        return structure["default"] || 0;
      } catch {
        return 0;
      }
    }

    // Default formula
    return calculateDefaultPoints(position, numberOfPlayers);
  }

  private assignStandingPositions(
    standings: TourStandingRow[]
  ): (TourStandingRow & { position: number })[] {
    return assignPositionsMap(standings, (s) => s.total_points);
  }

  // ============================================================================
  // Public API Methods (orchestration only)
  // ============================================================================

  /**
   * Calculate and store results for a competition
   * Should be called when a competition is finalized/closed
   */
  finalizeCompetitionResults(competitionId: number): void {
    // Get competition details
    const competition = this.findCompetitionDetails(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }

    // Parse pars
    const { pars, totalPar } = this.parseParsFromCompetition(competition);

    // Get point template if exists
    const pointTemplate = competition.point_template_id
      ? this.findPointTemplateRow(competition.point_template_id)
      : null;

    // Get number of active enrollments for points calculation (if tour competition)
    const numberOfPlayers = competition.tour_id
      ? this.findActiveEnrollmentCount(competition.tour_id)
      : 0;

    // Check if this is a closed open competition
    const isOpenCompetitionClosed = this.isOpenCompetitionClosed(competition);

    // Get participants and build results
    const participants = this.findParticipantDataRows(competitionId);
    const results = participants.map((p) =>
      this.buildParticipantResult(p, pars, totalPar, isOpenCompetitionClosed)
    );

    // Rank and assign points
    const finishedResults = results.filter((r) => r.is_finished);
    const sortedResults = this.sortResultsByScore(finishedResults);
    const effectivePlayerCount = numberOfPlayers || finishedResults.length;
    const rankedResults = this.assignPositionsAndPoints(
      sortedResults,
      effectivePlayerCount,
      pointTemplate,
      competition.points_multiplier || 1
    );

    // Add back unfinished players
    const unfinishedResults = results
      .filter((r) => !r.is_finished)
      .map((r) => ({ ...r, position: 0, points: 0 }));
    const allResults = [...rankedResults, ...unfinishedResults];

    // Clear existing results and insert new ones
    this.deleteCompetitionResultRows(competitionId);
    for (const result of allResults) {
      if (result.is_finished) {
        this.insertCompetitionResultRow(competitionId, result, "gross");
      }
    }

    // Store net results if scoring_mode is 'net' or 'both'
    const scoringMode = competition.scoring_mode || "gross";
    if (scoringMode === "net" || scoringMode === "both") {
      const netSortedResults = this.sortResultsByNetScore(finishedResults, totalPar);
      const netRankedResults = this.assignNetPositionsAndPoints(
        netSortedResults,
        effectivePlayerCount,
        pointTemplate,
        competition.points_multiplier || 1,
        totalPar
      );
      for (const result of netRankedResults) {
        this.insertCompetitionResultRow(competitionId, result, "net");
      }
    }

    // Mark competition as finalized
    this.updateCompetitionFinalizedRow(competitionId);
  }

  /**
   * Get stored results for a competition
   */
  getCompetitionResults(
    competitionId: number,
    scoringType: "gross" | "net" = "gross"
  ): StoredCompetitionResult[] {
    return this.findCompetitionResultRows(competitionId, scoringType);
  }

  /**
   * Get all results for a player across competitions
   */
  getPlayerResults(
    playerId: number,
    scoringType: "gross" | "net" = "gross"
  ): PlayerResultRow[] {
    return this.findPlayerResultRows(playerId, scoringType);
  }

  /**
   * Check if a competition has finalized results
   */
  isCompetitionFinalized(competitionId: number): boolean {
    const result = this.findCompetitionFinalizedRow(competitionId);
    return result?.is_results_final === 1;
  }

  /**
   * Recalculate results for a competition (e.g., after score edit)
   */
  recalculateResults(competitionId: number): void {
    this.finalizeCompetitionResults(competitionId);
  }

  /**
   * Get player's total points in a tour from stored results
   */
  getPlayerTourPoints(
    playerId: number,
    tourId: number,
    scoringType: "gross" | "net" = "gross"
  ): {
    total_points: number;
    competitions_played: number;
  } {
    const result = this.findPlayerTourPointsRow(playerId, tourId, scoringType);
    return {
      total_points: result.total_points || 0,
      competitions_played: result.competitions_played || 0,
    };
  }

  /**
   * Get tour standings from stored results (fast query)
   */
  getTourStandingsFromResults(
    tourId: number,
    scoringType: "gross" | "net" = "gross"
  ): (TourStandingRow & { position: number })[] {
    const standings = this.findTourStandingRows(tourId, scoringType);
    return this.assignStandingPositions(standings);
  }
}

export function createCompetitionResultsService(db: Database): CompetitionResultsService {
  return new CompetitionResultsService(db);
}
