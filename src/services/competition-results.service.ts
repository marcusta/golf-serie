import { Database } from "bun:sqlite";

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

export class CompetitionResultsService {
  constructor(private db: Database) {}

  /**
   * Calculate and store results for a competition
   * Should be called when a competition is finalized/closed
   */
  finalizeCompetitionResults(competitionId: number): void {
    // Get competition details
    const competition = this.db
      .prepare(`
        SELECT c.*, co.pars, t.point_template_id, t.scoring_mode
        FROM competitions c
        LEFT JOIN courses co ON c.course_id = co.id
        LEFT JOIN tours t ON c.tour_id = t.id
        WHERE c.id = ?
      `)
      .get(competitionId) as {
        id: number;
        tour_id: number | null;
        course_id: number | null;
        pars: string | null;
        point_template_id: number | null;
        scoring_mode: string | null;
        start_mode: string;
        open_end: string | null;
        points_multiplier: number | null;
      } | null;

    if (!competition) {
      throw new Error("Competition not found");
    }

    // Parse pars - stored as direct array [4,3,4,5,...]
    let pars: number[] = [];
    let totalPar = 72; // Default
    if (competition.pars) {
      try {
        pars = JSON.parse(competition.pars);
        if (Array.isArray(pars) && pars.length > 0) {
          totalPar = pars.reduce((sum, p) => sum + p, 0);
        } else {
          pars = [];
        }
      } catch {
        pars = [];
      }
    }

    // Get point template if exists
    let pointTemplate: { id: number; name: string; points_structure: string } | null = null;
    if (competition.point_template_id) {
      pointTemplate = this.db
        .prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?")
        .get(competition.point_template_id) as typeof pointTemplate;
    }

    // Get number of active enrollments for points calculation (if tour competition)
    let numberOfPlayers = 0;
    if (competition.tour_id) {
      const enrollmentCount = this.db
        .prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'")
        .get(competition.tour_id) as { count: number };
      numberOfPlayers = enrollmentCount.count;
    }

    // Check if this is a closed open competition
    const isOpenCompetitionClosed = competition.start_mode === "open" &&
      competition.open_end &&
      new Date(competition.open_end) < new Date();

    // Get participants
    const participants = this.db
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

    // Calculate results
    const results = this.calculateResults(
      participants,
      pars,
      totalPar,
      isOpenCompetitionClosed
    );

    // Rank and assign points
    const rankedResults = this.rankAndAssignPoints(
      results,
      numberOfPlayers || results.filter(r => r.is_finished).length,
      pointTemplate,
      competition.points_multiplier || 1
    );

    // Clear existing results for this competition
    this.db
      .prepare("DELETE FROM competition_results WHERE competition_id = ?")
      .run(competitionId);

    // Store gross results
    const insertStmt = this.db.prepare(`
      INSERT INTO competition_results
        (competition_id, participant_id, player_id, position, points, gross_score, net_score, relative_to_par, scoring_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const result of rankedResults) {
      if (result.is_finished) {
        insertStmt.run(
          competitionId,
          result.participant_id,
          result.player_id,
          result.position,
          result.points,
          result.gross_score,
          result.net_score,
          result.relative_to_par,
          "gross"
        );
      }
    }

    // TODO: If scoring_mode is 'net' or 'both', also calculate and store net results

    // Mark competition as finalized
    this.db
      .prepare(`
        UPDATE competitions
        SET is_results_final = 1, results_finalized_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(competitionId);
  }

  /**
   * Calculate results for all participants
   */
  private calculateResults(
    participants: ParticipantData[],
    pars: number[],
    totalPar: number,
    isOpenCompetitionClosed: boolean
  ): CompetitionResult[] {
    const results: CompetitionResult[] = [];

    for (const participant of participants) {
      let grossScore = 0;
      let relativeToPar = 0;
      let isFinished = false;

      // DQ'd players are never considered finished
      if (participant.is_dq) {
        isFinished = false;
      } else if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
        // Use manual scores
        grossScore = participant.manual_score_total;
        relativeToPar = grossScore - totalPar;
        isFinished = true;
      } else {
        // Parse hole-by-hole scores
        let score: number[];
        try {
          score = typeof participant.score === 'string'
            ? JSON.parse(participant.score)
            : (Array.isArray(participant.score) ? participant.score : []);
        } catch {
          score = [];
        }

        // Check if player has finished
        const hasInvalidRound = score.includes(-1);
        const holesPlayed = score.filter((s: number) => s > 0 || s === -1).length;

        if (isOpenCompetitionClosed) {
          // Competition window closed: finished if 18 holes played
          isFinished = holesPlayed === 18 && !hasInvalidRound;
        } else {
          // Competition still open: require is_locked
          isFinished = participant.is_locked === 1 && holesPlayed === 18 && !hasInvalidRound;
        }

        if (isFinished) {
          grossScore = score.reduce((sum: number, s: number) => sum + (s > 0 ? s : 0), 0);
          for (let i = 0; i < score.length && i < pars.length; i++) {
            if (score[i] > 0) {
              relativeToPar += score[i] - pars[i];
            }
          }
        }
      }

      // Calculate net score if handicap available
      let netScore: number | null = null;
      if (isFinished && participant.handicap_index !== null) {
        // Simplified net calculation - in reality might use course handicap
        netScore = grossScore - Math.round(participant.handicap_index);
      }

      results.push({
        participant_id: participant.id,
        player_id: participant.player_id,
        player_name: participant.player_name,
        gross_score: grossScore,
        net_score: netScore,
        relative_to_par: relativeToPar,
        is_finished: isFinished,
        position: 0,
        points: 0,
      });
    }

    return results;
  }

  /**
   * Rank players and assign points
   */
  private rankAndAssignPoints(
    results: CompetitionResult[],
    numberOfPlayers: number,
    pointTemplate: { id: number; name: string; points_structure: string } | null,
    pointsMultiplier: number
  ): CompetitionResult[] {
    // Filter to only finished players
    const finishedResults = results.filter(r => r.is_finished);

    // Sort by relative to par (ascending - lower is better)
    const sorted = [...finishedResults].sort((a, b) => {
      if (a.relative_to_par !== b.relative_to_par) {
        return a.relative_to_par - b.relative_to_par;
      }
      // Tie-breaker: alphabetical by name
      return a.player_name.localeCompare(b.player_name);
    });

    // Assign positions with tie handling
    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;

    const ranked = sorted.map((result, index) => {
      if (result.relative_to_par !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = result.relative_to_par;

      const points = this.calculatePoints(currentPosition, numberOfPlayers, pointTemplate) * pointsMultiplier;

      return { ...result, position: currentPosition, points: Math.round(points) };
    });

    // Add back unfinished players with position 0 and 0 points
    const unfinished = results
      .filter(r => !r.is_finished)
      .map(r => ({ ...r, position: 0, points: 0 }));

    return [...ranked, ...unfinished];
  }

  /**
   * Calculate points for a position
   */
  private calculatePoints(
    position: number,
    numberOfPlayers: number,
    pointTemplate: { id: number; name: string; points_structure: string } | null
  ): number {
    if (pointTemplate) {
      try {
        const structure: PointsStructure = JSON.parse(pointTemplate.points_structure);
        if (structure[position.toString()]) {
          return structure[position.toString()];
        }
        return structure["default"] || 0;
      } catch {
        return 0;
      }
    }

    // Default formula
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
   * Get stored results for a competition
   */
  getCompetitionResults(competitionId: number, scoringType: "gross" | "net" = "gross"): StoredCompetitionResult[] {
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

  /**
   * Get all results for a player across competitions
   */
  getPlayerResults(playerId: number, scoringType: "gross" | "net" = "gross"): (StoredCompetitionResult & {
    competition_name: string;
    competition_date: string;
    tour_id: number | null;
    tour_name: string | null;
  })[] {
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
      .all(playerId, scoringType) as any[];
  }

  /**
   * Check if a competition has finalized results
   */
  isCompetitionFinalized(competitionId: number): boolean {
    const result = this.db
      .prepare("SELECT is_results_final FROM competitions WHERE id = ?")
      .get(competitionId) as { is_results_final: number } | null;
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
  getPlayerTourPoints(playerId: number, tourId: number, scoringType: "gross" | "net" = "gross"): {
    total_points: number;
    competitions_played: number;
    position?: number;
  } {
    const result = this.db
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
      .get(playerId, tourId, scoringType) as { total_points: number | null; competitions_played: number };

    return {
      total_points: result.total_points || 0,
      competitions_played: result.competitions_played || 0,
    };
  }

  /**
   * Get tour standings from stored results (fast query)
   */
  getTourStandingsFromResults(tourId: number, scoringType: "gross" | "net" = "gross"): {
    player_id: number;
    player_name: string;
    total_points: number;
    competitions_played: number;
    position: number;
  }[] {
    const standings = this.db
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
      .all(tourId, scoringType) as {
        player_id: number;
        player_name: string;
        total_points: number;
        competitions_played: number;
      }[];

    // Assign positions with tie handling
    let currentPosition = 1;
    let previousPoints = Number.MAX_SAFE_INTEGER;

    return standings.map((standing, index) => {
      if (standing.total_points !== previousPoints) {
        currentPosition = index + 1;
      }
      previousPoints = standing.total_points;
      return { ...standing, position: currentPosition };
    });
  }
}

export function createCompetitionResultsService(db: Database): CompetitionResultsService {
  return new CompetitionResultsService(db);
}
