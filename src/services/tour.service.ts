import { Database } from "bun:sqlite";
import type { TourPlayerStanding, TourStandings, Tour as TourType } from "../types";

export type Tour = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  enrollment_mode: string;
  visibility: string;
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
};

export type UpdateTourInput = {
  name?: string;
  description?: string;
  banner_image_url?: string | null;
  landing_document_id?: number | null;
  point_template_id?: number | null;
};

export type TourStanding = {
  player_id: number;
  player_name: string;
  total_points: number;
  competitions_played: number;
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
    // Validate point_template_id if provided
    if (data.point_template_id) {
      const template = this.db
        .prepare("SELECT id FROM point_templates WHERE id = ?")
        .get(data.point_template_id);
      if (!template) {
        throw new Error("Point template not found");
      }
    }

    const result = this.db
      .prepare(
        `
      INSERT INTO tours (name, description, owner_id, banner_image_url, point_template_id)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(
        data.name,
        data.description || null,
        ownerId,
        data.banner_image_url || null,
        data.point_template_id || null
      ) as Tour;

    return result;
  }

  update(id: number, data: UpdateTourInput): Tour {
    const tour = this.findById(id);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Validate landing_document_id if provided
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      const documentStmt = this.db.prepare(`
        SELECT id, tour_id FROM tour_documents WHERE id = ?
      `);
      const document = documentStmt.get(data.landing_document_id) as { id: number; tour_id: number } | undefined;

      if (!document) {
        throw new Error("Landing document not found");
      }

      if (document.tour_id !== id) {
        throw new Error("Landing document must belong to the same tour");
      }
    }

    // Validate point_template_id if provided
    if (data.point_template_id !== undefined && data.point_template_id !== null) {
      const template = this.db
        .prepare("SELECT id FROM point_templates WHERE id = ?")
        .get(data.point_template_id);
      if (!template) {
        throw new Error("Point template not found");
      }
    }

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

    if (updates.length === 0) {
      return tour;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result = this.db
      .prepare(
        `
      UPDATE tours
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `
      )
      .get(...values) as Tour;

    return result;
  }

  delete(id: number): void {
    const result = this.db.prepare("DELETE FROM tours WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Tour not found");
    }
  }

  getCompetitions(tourId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT c.*, co.name as course_name, co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.tour_id = ?
      ORDER BY c.date DESC
    `
      )
      .all(tourId) as any[];
  }

  /**
   * Get full standings for a tour with detailed competition breakdown
   */
  getFullStandings(tourId: number): TourStandings {
    const tour = this.findById(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Get all competitions in this tour
    const competitions = this.getCompetitions(tourId);

    if (competitions.length === 0) {
      return {
        tour: tour as unknown as TourType,
        player_standings: [],
        total_competitions: 0,
        point_template: undefined,
      };
    }

    // Get point template if configured
    let pointTemplate: { id: number; name: string; points_structure: string } | null = null;
    if (tour.point_template_id) {
      pointTemplate = this.db
        .prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?")
        .get(tour.point_template_id) as { id: number; name: string; points_structure: string } | null;
    }

    // Get number of active enrollments for default points calculation
    const enrollmentCount = this.db
      .prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'")
      .get(tourId) as { count: number };
    const numberOfPlayers = enrollmentCount.count;

    // Track player standings
    const playerStandings: Map<number, TourPlayerStanding> = new Map();

    // Process each competition
    for (const competition of competitions) {
      // Check if competition should be included (past or has scores)
      const competitionDate = new Date(competition.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      competitionDate.setHours(0, 0, 0, 0);
      const isPastCompetition = competitionDate < today;

      // Get player results for this competition
      const results = this.getCompetitionPlayerResults(competition.id, competition.pars);

      // Skip future competitions with no valid results
      const hasFinishedPlayers = results.some(r => r.is_finished);
      if (!isPastCompetition && !hasFinishedPlayers) {
        continue;
      }

      // Rank players by their scores (only count finished players)
      const finishedResults = results.filter(r => r.is_finished);
      const rankedResults = this.rankPlayersByScore(finishedResults);

      // Calculate points for each player
      for (const result of rankedResults) {
        const points = this.calculatePlayerPoints(
          result.position,
          numberOfPlayers,
          pointTemplate
        );

        // Initialize or update player standing
        if (!playerStandings.has(result.player_id)) {
          playerStandings.set(result.player_id, {
            player_id: result.player_id,
            player_name: result.player_name,
            total_points: 0,
            competitions_played: 0,
            position: 0,
            competitions: [],
          });
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
        });
      }
    }

    // Sort players by total points (descending) and assign final positions
    const sortedStandings = Array.from(playerStandings.values())
      .sort((a, b) => {
        // Primary sort: total points descending
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        // Secondary sort: more competitions played is better (tie-breaker)
        if (b.competitions_played !== a.competitions_played) {
          return b.competitions_played - a.competitions_played;
        }
        // Tertiary sort: alphabetical by name
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

    return {
      tour: tour as unknown as TourType,
      player_standings: sortedStandings,
      total_competitions: competitions.length,
      point_template: pointTemplate ? { id: pointTemplate.id, name: pointTemplate.name } : undefined,
    };
  }

  /**
   * Get player results for a specific competition
   */
  private getCompetitionPlayerResults(competitionId: number, coursePars: string): (CompetitionResult & { position: number })[] {
    // Parse course pars
    let pars: number[];
    try {
      pars = JSON.parse(coursePars);
    } catch {
      pars = [];
    }
    const totalPar = pars.reduce((sum, par) => sum + par, 0);

    // Get all participants with player_id for this competition
    const participants = this.db
      .prepare(`
        SELECT
          p.id,
          p.player_id,
          p.score,
          p.is_locked,
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
      .all(competitionId) as any[];

    const results: CompetitionResult[] = [];

    for (const participant of participants) {
      let totalShots = 0;
      let relativeToPar = 0;
      let isFinished = false;

      if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
        // Use manual scores
        totalShots = participant.manual_score_total;
        relativeToPar = totalShots - totalPar;
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

        // Check if player has finished (is_locked and has valid scores)
        const hasInvalidRound = score.includes(-1);
        const holesPlayed = score.filter((s: number) => s > 0 || s === -1).length;
        isFinished = participant.is_locked && holesPlayed === 18 && !hasInvalidRound;

        if (isFinished) {
          totalShots = score.reduce((sum: number, s: number) => sum + (s > 0 ? s : 0), 0);
          for (let i = 0; i < score.length && i < pars.length; i++) {
            if (score[i] > 0) {
              relativeToPar += score[i] - pars[i];
            }
          }
        }
      }

      results.push({
        competition_id: participant.competition_id,
        competition_name: participant.competition_name,
        competition_date: participant.competition_date,
        player_id: participant.player_id,
        player_name: participant.player_name,
        total_shots: totalShots,
        relative_to_par: relativeToPar,
        is_finished: isFinished,
      });
    }

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
      try {
        const structure: PointsStructure = JSON.parse(pointTemplate.points_structure);

        // Try exact position match
        if (structure[position.toString()]) {
          return structure[position.toString()];
        }

        // Fall back to default
        return structure["default"] || 0;
      } catch {
        return 0;
      }
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
