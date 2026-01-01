import { Database } from "bun:sqlite";
import type { TourCategory, TourPlayerStanding, TourStandings, Tour as TourType } from "../types";
import { calculateCourseHandicap } from "../utils/handicap";
import { GOLF } from "../constants/golf";
import { safeParseJson, parseScoreArray, parseParsArray } from "../utils/parsing";

export type ScoringType = "gross" | "net";

export type Tour = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  enrollment_mode: string;
  visibility: string;
  scoring_mode: string;
  banner_image_url: string | null;
  landing_document_id: number | null;
  point_template_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateTourInput = {
  name: string;
  description?: string;
  banner_image_url?: string;
  point_template_id?: number;
  scoring_mode?: string;
};

export type UpdateTourInput = {
  name?: string;
  description?: string;
  banner_image_url?: string | null;
  landing_document_id?: number | null;
  point_template_id?: number | null;
  scoring_mode?: string;
};

export type TourStanding = {
  player_id: number;
  player_name: string;
  total_points: number;
  competitions_played: number;
};

// Internal types for database rows
type TourRow = Tour;

type CompetitionWithCourseRow = {
  id: number;
  name: string;
  date: string;
  course_id: number;
  tee_id: number | null;
  tour_id: number | null;
  series_id: number | null;
  is_results_final: number;
  start_mode: string;
  open_end: string | null;
  course_name: string;
  pars: string;
  slope_rating: number | null;
  course_rating: number | null;
};

type ParticipantRow = {
  id: number;
  player_id: number;
  score: string | null;
  is_locked: number;
  is_dq: number;
  manual_score_total: number | null;
  player_name: string;
  competition_id: number;
  competition_name: string;
  competition_date: string;
};

type EnrollmentRow = {
  player_id: number;
  category_id: number | null;
  category_name: string | null;
  handicap: number | null;
  player_name: string;
};

type StoredResultRow = {
  player_id: number;
  competition_id: number;
  position: number;
  points: number;
  relative_to_par: number;
  competition_name: string;
  competition_date: string;
  player_name: string;
};

type PointTemplateRow = {
  id: number;
  name: string;
  points_structure: string;
};

type DocumentRow = {
  id: number;
  tour_id: number;
};

// Internal types for standings calculation
type CompetitionResult = {
  competition_id: number;
  competition_name: string;
  competition_date: string;
  player_id: number;
  player_name: string;
  total_shots: number;
  relative_to_par: number;
  is_finished: boolean;
};

type PointsStructure = {
  [position: string]: number;
};

export class TourService {
  constructor(private db: Database) {}

  // ==================== VALIDATION METHODS ====================

  private validateScoringMode(mode: string): void {
    const validScoringModes = ["gross", "net", "both"];
    if (!validScoringModes.includes(mode)) {
      throw new Error("Invalid scoring mode. Must be 'gross', 'net', or 'both'");
    }
  }

  private validatePointTemplateExists(templateId: number): void {
    const exists = this.findPointTemplateExists(templateId);
    if (!exists) {
      throw new Error("Point template not found");
    }
  }

  private validateLandingDocument(documentId: number, tourId: number): void {
    const document = this.findDocumentRow(documentId);
    if (!document) {
      throw new Error("Landing document not found");
    }
    if (document.tour_id !== tourId) {
      throw new Error("Landing document must belong to the same tour");
    }
  }

  // ==================== QUERY METHODS ====================

  private findPointTemplateExists(id: number): boolean {
    const row = this.db
      .prepare("SELECT id FROM point_templates WHERE id = ?")
      .get(id) as { id: number } | null;
    return row !== null;
  }

  private findDocumentRow(id: number): DocumentRow | null {
    return this.db
      .prepare("SELECT id, tour_id FROM tour_documents WHERE id = ?")
      .get(id) as DocumentRow | null;
  }

  private findCategoriesByTour(tourId: number): TourCategory[] {
    return this.db
      .prepare("SELECT * FROM tour_categories WHERE tour_id = ? ORDER BY sort_order ASC, name ASC")
      .all(tourId) as TourCategory[];
  }

  private findPointTemplateRow(id: number): PointTemplateRow | null {
    return this.db
      .prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?")
      .get(id) as PointTemplateRow | null;
  }

  private findEnrollmentCount(tourId: number, categoryId?: number): number {
    let query = "SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'";
    const params: number[] = [tourId];
    if (categoryId !== undefined) {
      query += " AND category_id = ?";
      params.push(categoryId);
    }
    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  private findEnrollmentRows(tourId: number): EnrollmentRow[] {
    return this.db
      .prepare(`
        SELECT te.player_id, te.category_id, tc.name as category_name,
               COALESCE(te.playing_handicap, p.handicap) as handicap,
               p.name as player_name
        FROM tour_enrollments te
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        LEFT JOIN players p ON te.player_id = p.id
        WHERE te.tour_id = ? AND te.status = 'active' AND te.player_id IS NOT NULL
      `)
      .all(tourId) as EnrollmentRow[];
  }

  private findFinalizedCompetitionIds(tourId: number): Set<number> {
    const rows = this.db
      .prepare("SELECT id FROM competitions WHERE tour_id = ? AND is_results_final = 1")
      .all(tourId) as { id: number }[];
    return new Set(rows.map(c => c.id));
  }

  private findStoredResultRows(tourId: number, scoringType: string): StoredResultRow[] {
    return this.db
      .prepare(`
        SELECT
          cr.player_id,
          cr.competition_id,
          cr.position,
          cr.points,
          cr.relative_to_par,
          c.name as competition_name,
          c.date as competition_date,
          pl.name as player_name
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        JOIN players pl ON cr.player_id = pl.id
        WHERE c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
        ORDER BY c.date ASC
      `)
      .all(tourId, scoringType) as StoredResultRow[];
  }

  private findCompetitionStartInfo(competitionId: number): { start_mode: string; open_end: string | null } | null {
    return this.db
      .prepare("SELECT start_mode, open_end FROM competitions WHERE id = ?")
      .get(competitionId) as { start_mode: string; open_end: string | null } | null;
  }

  private findParticipantRowsForCompetition(competitionId: number): ParticipantRow[] {
    return this.db
      .prepare(`
        SELECT
          p.id,
          p.player_id,
          p.score,
          p.is_locked,
          p.is_dq,
          p.manual_score_total,
          pl.name as player_name,
          c.id as competition_id,
          c.name as competition_name,
          c.date as competition_date
        FROM participants p
        JOIN players pl ON p.player_id = pl.id
        JOIN tee_times t ON p.tee_time_id = t.id
        JOIN competitions c ON t.competition_id = c.id
        WHERE t.competition_id = ? AND p.player_id IS NOT NULL
      `)
      .all(competitionId) as ParticipantRow[];
  }

  private insertTourRow(
    name: string,
    description: string | null,
    ownerId: number,
    bannerImageUrl: string | null,
    pointTemplateId: number | null,
    scoringMode: string
  ): Tour {
    return this.db
      .prepare(`
        INSERT INTO tours (name, description, owner_id, banner_image_url, point_template_id, scoring_mode)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .get(name, description, ownerId, bannerImageUrl, pointTemplateId, scoringMode) as Tour;
  }

  private updateTourRow(
    id: number,
    updates: string[],
    values: (string | number | null)[]
  ): Tour {
    return this.db
      .prepare(`
        UPDATE tours
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `)
      .get(...values, id) as Tour;
  }

  // ==================== LOGIC METHODS ====================

  private isPastCompetition(competitionDate: string): boolean {
    const compDate = new Date(competitionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    compDate.setHours(0, 0, 0, 0);
    return compDate < today;
  }

  private buildEnrollmentMaps(enrollments: EnrollmentRow[]): {
    playerCategories: Map<number, { category_id: number | null; category_name: string | null }>;
    playerHandicaps: Map<number, number>;
    playerNames: Map<number, string>;
  } {
    const playerCategories = new Map<number, { category_id: number | null; category_name: string | null }>();
    const playerHandicaps = new Map<number, number>();
    const playerNames = new Map<number, string>();

    for (const enrollment of enrollments) {
      playerCategories.set(enrollment.player_id, {
        category_id: enrollment.category_id,
        category_name: enrollment.category_name,
      });
      if (enrollment.handicap !== null) {
        playerHandicaps.set(enrollment.player_id, enrollment.handicap);
      }
      playerNames.set(enrollment.player_id, enrollment.player_name);
    }

    return { playerCategories, playerHandicaps, playerNames };
  }

  private sortAndRankStandings(standings: TourPlayerStanding[]): TourPlayerStanding[] {
    // Sort players by total points (descending)
    const sortedStandings = standings.sort((a, b) => {
      // Primary: total points descending
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      // Secondary: more competitions played is better
      if (b.competitions_played !== a.competitions_played) {
        return b.competitions_played - a.competitions_played;
      }
      // Tertiary: alphabetical by name
      return a.player_name.localeCompare(b.player_name);
    });

    // Assign positions with tie handling
    let currentPosition = 1;
    let previousPoints = -1;
    let previousCompetitions = -1;

    sortedStandings.forEach((standing, index) => {
      if (standing.total_points !== previousPoints || standing.competitions_played !== previousCompetitions) {
        currentPosition = index + 1;
      }
      standing.position = currentPosition;
      previousPoints = standing.total_points;
      previousCompetitions = standing.competitions_played;
    });

    return sortedStandings;
  }

  private initializePlayerStanding(
    playerId: number,
    playerName: string,
    playerCategory: { category_id: number | null; category_name: string | null } | undefined
  ): TourPlayerStanding {
    return {
      player_id: playerId,
      player_name: playerName,
      category_id: playerCategory?.category_id ?? undefined,
      category_name: playerCategory?.category_name ?? undefined,
      total_points: 0,
      competitions_played: 0,
      position: 0,
      competitions: [],
    };
  }

  private isCompetitionWindowClosed(startInfo: { start_mode: string; open_end: string | null } | null): boolean {
    return startInfo?.start_mode === "open" &&
      startInfo.open_end !== null &&
      new Date(startInfo.open_end) < new Date();
  }

  private determineParticipantFinished(
    participant: ParticipantRow,
    isOpenCompetitionClosed: boolean
  ): { isFinished: boolean; totalShots: number; relativeToPar: number } {
    // DQ'd players are never finished
    if (participant.is_dq) {
      return { isFinished: false, totalShots: 0, relativeToPar: 0 };
    }

    // Use manual scores if available
    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return {
        isFinished: true,
        totalShots: participant.manual_score_total,
        relativeToPar: 0, // Will be calculated with pars later
      };
    }

    // Parse hole-by-hole scores
    const score = parseScoreArray(participant.score || "");
    const hasInvalidRound = score.includes(GOLF.UNREPORTED_HOLE);
    const holesPlayed = score.filter((s: number) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;

    // Determine if finished based on competition type
    let isFinished: boolean;
    if (isOpenCompetitionClosed) {
      isFinished = holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    } else {
      isFinished = Boolean(participant.is_locked) && holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    }

    if (!isFinished) {
      return { isFinished: false, totalShots: 0, relativeToPar: 0 };
    }

    const totalShots = score.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);
    return { isFinished: true, totalShots, relativeToPar: 0 };
  }

  private calculateRelativeToPar(score: number[], pars: number[]): number {
    let relativeToPar = 0;
    for (let i = 0; i < score.length && i < pars.length; i++) {
      if (score[i] > 0) {
        relativeToPar += score[i] - pars[i];
      }
    }
    return relativeToPar;
  }

  private buildUpdateFields(data: UpdateTourInput): { updates: string[]; values: (string | number | null)[] } {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.banner_image_url !== undefined) {
      updates.push("banner_image_url = ?");
      values.push(data.banner_image_url);
    }
    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }
    if (data.point_template_id !== undefined) {
      updates.push("point_template_id = ?");
      values.push(data.point_template_id);
    }
    if (data.scoring_mode !== undefined) {
      updates.push("scoring_mode = ?");
      values.push(data.scoring_mode);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }

    return { updates, values };
  }

  // ==================== PUBLIC API METHODS ====================

  findAll(): Tour[] {
    return this.db
      .prepare("SELECT * FROM tours ORDER BY name ASC")
      .all() as Tour[];
  }

  findById(id: number): Tour | null {
    return this.db
      .prepare("SELECT * FROM tours WHERE id = ?")
      .get(id) as Tour | null;
  }

  create(data: CreateTourInput, ownerId: number): Tour {
    // Validation
    if (data.point_template_id) {
      this.validatePointTemplateExists(data.point_template_id);
    }
    const scoringMode = data.scoring_mode || "gross";
    this.validateScoringMode(scoringMode);

    // Insert
    return this.insertTourRow(
      data.name,
      data.description || null,
      ownerId,
      data.banner_image_url || null,
      data.point_template_id || null,
      scoringMode
    );
  }

  update(id: number, data: UpdateTourInput): Tour {
    const tour = this.findById(id);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Validation
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      this.validateLandingDocument(data.landing_document_id, id);
    }
    if (data.point_template_id !== undefined && data.point_template_id !== null) {
      this.validatePointTemplateExists(data.point_template_id);
    }
    if (data.scoring_mode !== undefined) {
      this.validateScoringMode(data.scoring_mode);
    }

    // Build update fields
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return tour;
    }

    // Update
    return this.updateTourRow(id, updates, values);
  }

  delete(id: number): void {
    const result = this.db.prepare("DELETE FROM tours WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Tour not found");
    }
  }

  getCompetitions(tourId: number): CompetitionWithCourseRow[] {
    return this.db
      .prepare(
        `
      SELECT c.*, co.name as course_name, co.pars,
             ct.slope_rating, ct.course_rating
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN course_tees ct ON c.tee_id = ct.id
      WHERE c.tour_id = ?
      ORDER BY c.date DESC
    `
      )
      .all(tourId) as CompetitionWithCourseRow[];
  }

  /**
   * Get full standings for a tour with detailed competition breakdown
   * Optionally filter by category and scoring type
   *
   * HYBRID APPROACH:
   * - Uses stored results from competition_results for finalized competitions (fast)
   * - Calculates on-the-fly for active/non-finalized competitions (live projections)
   */
  getFullStandings(tourId: number, categoryId?: number, scoringType?: ScoringType): TourStandings {
    const tour = this.findById(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Get categories and validate if filtering
    const categories = this.findCategoriesByTour(tourId);
    if (categoryId !== undefined) {
      const categoryExists = categories.some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new Error("Category not found");
      }
    }

    // Get competitions - return early if none
    const competitions = this.getCompetitions(tourId);
    if (competitions.length === 0) {
      return this.buildEmptyStandingsResponse(tour, categories, categoryId);
    }

    // Load supporting data
    const pointTemplate = tour.point_template_id
      ? this.findPointTemplateRow(tour.point_template_id)
      : null;
    const numberOfPlayers = this.findEnrollmentCount(tourId, categoryId);
    const enrollmentRows = this.findEnrollmentRows(tourId);
    const { playerCategories, playerHandicaps } = this.buildEnrollmentMaps(enrollmentRows);

    // Determine scoring type
    const effectiveScoringType = scoringType || (tour.scoring_mode === "net" ? "net" : "gross");

    // Build standings from finalized and live results
    const playerStandings: Map<number, TourPlayerStanding> = new Map();
    const finalizedCompetitionIds = this.findFinalizedCompetitionIds(tourId);

    // Load stored results for finalized competitions
    this.processStoredResults(
      tourId,
      effectiveScoringType,
      categoryId,
      playerCategories,
      playerStandings
    );

    // Calculate live results for non-finalized competitions
    const hasProjectedResults = this.processLiveCompetitions(
      competitions,
      finalizedCompetitionIds,
      categoryId,
      effectiveScoringType,
      playerCategories,
      playerHandicaps,
      numberOfPlayers,
      pointTemplate,
      playerStandings
    );

    // Sort and rank standings
    const sortedStandings = this.sortAndRankStandings(Array.from(playerStandings.values()));

    return {
      tour: tour as unknown as TourType,
      player_standings: sortedStandings,
      total_competitions: competitions.length,
      scoring_mode: (tour.scoring_mode || "gross") as "gross" | "net" | "both",
      selected_scoring_type: effectiveScoringType,
      point_template: pointTemplate ? { id: pointTemplate.id, name: pointTemplate.name } : undefined,
      categories,
      selected_category_id: categoryId,
      has_projected_results: hasProjectedResults,
    };
  }

  private buildEmptyStandingsResponse(
    tour: Tour,
    categories: TourCategory[],
    categoryId?: number
  ): TourStandings {
    return {
      tour: tour as unknown as TourType,
      player_standings: [],
      total_competitions: 0,
      scoring_mode: (tour.scoring_mode || "gross") as "gross" | "net" | "both",
      point_template: undefined,
      categories,
      selected_category_id: categoryId,
    };
  }

  private processStoredResults(
    tourId: number,
    scoringType: string,
    categoryId: number | undefined,
    playerCategories: Map<number, { category_id: number | null; category_name: string | null }>,
    playerStandings: Map<number, TourPlayerStanding>
  ): void {
    const storedResults = this.findStoredResultRows(tourId, scoringType);

    for (const result of storedResults) {
      const playerCategory = playerCategories.get(result.player_id);

      // Filter by category if specified
      if (categoryId !== undefined) {
        if (!playerCategory || playerCategory.category_id !== categoryId) {
          continue;
        }
      }

      // Initialize or update standing
      if (!playerStandings.has(result.player_id)) {
        playerStandings.set(
          result.player_id,
          this.initializePlayerStanding(result.player_id, result.player_name, playerCategory)
        );
      }

      const standing = playerStandings.get(result.player_id)!;
      standing.total_points += result.points;
      standing.competitions_played += 1;
      standing.competitions.push({
        competition_id: result.competition_id,
        competition_name: result.competition_name,
        competition_date: result.competition_date,
        points: result.points,
        position: result.position,
        score_relative_to_par: result.relative_to_par,
        is_projected: false,
      });
    }
  }

  private processLiveCompetitions(
    competitions: CompetitionWithCourseRow[],
    finalizedCompetitionIds: Set<number>,
    categoryId: number | undefined,
    scoringType: string,
    playerCategories: Map<number, { category_id: number | null; category_name: string | null }>,
    playerHandicaps: Map<number, number>,
    numberOfPlayers: number,
    pointTemplate: PointTemplateRow | null,
    playerStandings: Map<number, TourPlayerStanding>
  ): boolean {
    let hasProjectedResults = false;

    for (const competition of competitions) {
      // Skip finalized competitions
      if (finalizedCompetitionIds.has(competition.id)) {
        continue;
      }

      // Check if competition should be included
      const isPast = this.isPastCompetition(competition.date);
      const results = this.getCompetitionPlayerResults(competition.id, competition.pars);
      const hasFinishedPlayers = results.some(r => r.is_finished);

      if (!isPast && !hasFinishedPlayers) {
        continue;
      }

      hasProjectedResults = true;

      // Calculate handicap-adjusted results
      const adjustedResults = this.adjustResultsForScoring(
        results.filter(r => r.is_finished),
        scoringType,
        playerHandicaps,
        competition
      );

      // Rank and calculate points
      const rankedResults = this.rankPlayersByScore(adjustedResults);

      for (const result of rankedResults) {
        const playerCategory = playerCategories.get(result.player_id);

        // Filter by category if specified
        if (categoryId !== undefined) {
          if (!playerCategory || playerCategory.category_id !== categoryId) {
            continue;
          }
        }

        const points = this.calculatePlayerPoints(result.position, numberOfPlayers, pointTemplate);

        // Initialize or update standing
        if (!playerStandings.has(result.player_id)) {
          playerStandings.set(
            result.player_id,
            this.initializePlayerStanding(result.player_id, result.player_name, playerCategory)
          );
        }

        const standing = playerStandings.get(result.player_id)!;
        standing.total_points += points;
        standing.competitions_played += 1;
        standing.competitions.push({
          competition_id: competition.id,
          competition_name: competition.name,
          competition_date: competition.date,
          points,
          position: result.position,
          score_relative_to_par: result.relative_to_par,
          is_projected: true,
        });
      }
    }

    return hasProjectedResults;
  }

  private adjustResultsForScoring(
    results: CompetitionResult[],
    scoringType: string,
    playerHandicaps: Map<number, number>,
    competition: CompetitionWithCourseRow
  ): CompetitionResult[] {
    if (scoringType !== "net") {
      return results;
    }

    const slopeRating = competition.slope_rating || GOLF.STANDARD_SLOPE_RATING;
    const courseRating = competition.course_rating || GOLF.STANDARD_COURSE_RATING;
    const pars = parseParsArray(competition.pars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    return results.map(result => {
      const handicapIndex = playerHandicaps.get(result.player_id) || 0;
      const courseHandicap = calculateCourseHandicap(
        handicapIndex,
        slopeRating,
        courseRating,
        totalPar
      );
      return {
        ...result,
        relative_to_par: result.relative_to_par - courseHandicap,
      };
    });
  }

  /**
   * Get player results for a specific competition
   */
  private getCompetitionPlayerResults(competitionId: number, coursePars: string): (CompetitionResult & { position: number })[] {
    const pars = parseParsArray(coursePars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    const startInfo = this.findCompetitionStartInfo(competitionId);
    const isOpenCompetitionClosed = this.isCompetitionWindowClosed(startInfo);
    const participants = this.findParticipantRowsForCompetition(competitionId);

    const results: CompetitionResult[] = participants.map(participant => {
      const { isFinished, totalShots } = this.determineParticipantFinished(
        participant,
        isOpenCompetitionClosed
      );

      let relativeToPar = 0;
      if (isFinished) {
        if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
          relativeToPar = totalShots - totalPar;
        } else {
          const score = parseScoreArray(participant.score || "");
          relativeToPar = this.calculateRelativeToPar(score, pars);
        }
      }

      return {
        competition_id: participant.competition_id,
        competition_name: participant.competition_name,
        competition_date: participant.competition_date,
        player_id: participant.player_id,
        player_name: participant.player_name,
        total_shots: totalShots,
        relative_to_par: relativeToPar,
        is_finished: isFinished,
      };
    });

    return results.map(r => ({ ...r, position: 0 }));
  }

  /**
   * Rank players by their scores (lower is better)
   */
  private rankPlayersByScore(results: CompetitionResult[]): (CompetitionResult & { position: number })[] {
    // Sort by relative to par (ascending - lower is better)
    const sorted = [...results].sort((a, b) => {
      if (a.relative_to_par !== b.relative_to_par) {
        return a.relative_to_par - b.relative_to_par;
      }
      // Tie-breaker: alphabetical by name
      return a.player_name.localeCompare(b.player_name);
    });

    // Assign positions with tie handling
    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;

    return sorted.map((result, index) => {
      if (result.relative_to_par !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = result.relative_to_par;
      return { ...result, position: currentPosition };
    });
  }

  /**
   * Calculate points for a player based on their position
   */
  private calculatePlayerPoints(
    position: number,
    numberOfPlayers: number,
    pointTemplate: { id: number; name: string; points_structure: string } | null
  ): number {
    if (pointTemplate) {
      // Use point template
      const structure = safeParseJson<PointsStructure>(
        pointTemplate.points_structure,
        "points_structure"
      );

      // Try exact position match
      if (structure[position.toString()]) {
        return structure[position.toString()];
      }

      // Fall back to default
      return structure["default"] || 0;
    }

    // Default formula (similar to team standings)
    // 1st place: numberOfPlayers + 2
    // 2nd place: numberOfPlayers
    // 3rd and below: numberOfPlayers - (position - 1), minimum 0
    if (position <= 0) return 0;

    let basePoints: number;
    if (position === 1) {
      basePoints = numberOfPlayers + 2;
    } else if (position === 2) {
      basePoints = numberOfPlayers;
    } else {
      basePoints = numberOfPlayers - (position - 1);
      basePoints = Math.max(0, basePoints);
    }

    return basePoints;
  }

  /**
   * Legacy method for backward compatibility - returns simplified standings
   */
  getStandings(tourId: number): TourStanding[] {
    try {
      const fullStandings = this.getFullStandings(tourId);
      return fullStandings.player_standings.map(standing => ({
        player_id: standing.player_id,
        player_name: standing.player_name,
        total_points: standing.total_points,
        competitions_played: standing.competitions_played,
      }));
    } catch (error) {
      console.warn("Error fetching tour standings:", error);
      return [];
    }
  }
}

export function createTourService(db: Database) {
  return new TourService(db);
}
