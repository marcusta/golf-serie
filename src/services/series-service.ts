import { Database } from "bun:sqlite";
import type {
  CreateSeriesDto,
  Series,
  SeriesStandings,
  SeriesTeamStanding,
  UpdateSeriesDto,
} from "../types";
import type { CompetitionService } from "./competition-service";

export class SeriesService {
  constructor(private db: Database, private competitionService: CompetitionService) {}

  async create(data: CreateSeriesDto): Promise<Series> {
    if (!data.name?.trim()) {
      throw new Error("Series name is required");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO series (name, description, banner_image_url, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      const result = stmt.get(
        data.name,
        data.description || null,
        data.banner_image_url || null,
        data.is_public !== undefined ? (data.is_public ? 1 : 0) : 1
      ) as any;

      // Convert is_public from integer to boolean
      return {
        ...result,
        is_public: Boolean(result.is_public),
      } as Series;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Series name must be unique");
      }
      throw error;
    }
  }

  async findAll(): Promise<Series[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    const results = stmt.all() as any[];
    return results.map((result) => ({
      ...result,
      is_public: Boolean(result.is_public),
    })) as Series[];
  }

  async findPublic(): Promise<Series[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      WHERE is_public = 1
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    const results = stmt.all() as any[];
    return results.map((result) => ({
      ...result,
      is_public: Boolean(result.is_public),
    })) as Series[];
  }

  async findById(id: number): Promise<Series | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, created_at, updated_at
      FROM series
      WHERE id = ?
    `);
    const result = stmt.get(id) as any;
    if (!result) return null;

    return {
      ...result,
      is_public: Boolean(result.is_public),
    } as Series;
  }

  async update(id: number, data: UpdateSeriesDto): Promise<Series> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Series name cannot be empty");
    }

    // Validate landing_document_id if provided
    if (data.landing_document_id !== undefined) {
      if (data.landing_document_id !== null) {
        const documentStmt = this.db.prepare(`
          SELECT id, series_id FROM documents WHERE id = ?
        `);
        const document = documentStmt.get(data.landing_document_id) as any;

        if (!document) {
          throw new Error("Landing document not found");
        }

        if (document.series_id !== id) {
          throw new Error("Landing document must belong to the same series");
        }
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

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

    if (data.is_public !== undefined) {
      updates.push("is_public = ?");
      values.push(data.is_public ? 1 : 0);
    }

    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }

    if (updates.length === 0) {
      return series;
    }

    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE series
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const result = stmt.get(...values) as any;
      return {
        ...result,
        is_public: Boolean(result.is_public),
      } as Series;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Series name must be unique");
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare("DELETE FROM series WHERE id = ?");
    stmt.run(id);
  }

  async getCompetitions(id: number): Promise<any[]> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT 
        c.*, 
        co.name as course_name,
        (SELECT COUNT(DISTINCT p.id) 
         FROM participants p 
         JOIN tee_times t ON p.tee_time_id = t.id 
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.series_id = ?
      ORDER BY c.date
    `);

    return stmt.all(id).map((row: any) => ({
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
    }));
  }

  async getTeams(id: number): Promise<any[]> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      JOIN series_teams st ON t.id = st.team_id
      WHERE st.series_id = ?
      ORDER BY t.name
    `);

    return stmt.all(id);
  }

  async addTeam(seriesId: number, teamId: number): Promise<void> {
    // Verify series exists
    const series = await this.findById(seriesId);
    if (!series) {
      throw new Error("Series not found");
    }

    // Verify team exists
    const teamStmt = this.db.prepare("SELECT id FROM teams WHERE id = ?");
    const team = teamStmt.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO series_teams (series_id, team_id)
        VALUES (?, ?)
      `);
      stmt.run(seriesId, teamId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team is already in this series");
      }
      throw error;
    }
  }

  async removeTeam(seriesId: number, teamId: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM series_teams
      WHERE series_id = ? AND team_id = ?
    `);
    const result = stmt.run(seriesId, teamId);

    if (result.changes === 0) {
      throw new Error("Team is not in this series");
    }
  }

  async getAvailableTeams(seriesId: number): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      WHERE t.id NOT IN (
        SELECT team_id
        FROM series_teams
        WHERE series_id = ?
      )
      ORDER BY t.name
    `);

    return stmt.all(seriesId);
  }

  async getStandings(id: number): Promise<SeriesStandings> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    // Get all competitions in the series
    const competitionsStmt = this.db.prepare(`
      SELECT c.id, c.name, c.date
      FROM competitions c
      WHERE c.series_id = ?
      ORDER BY c.date
    `);
    const competitions = competitionsStmt.all(id) as any[];

    // Get team results for each competition
    const teamStandings: { [teamId: number]: SeriesTeamStanding } = {};

    for (const competition of competitions) {
      // Calculate team results for this competition using CompetitionService
      const teamResults = await this.competitionService.getTeamLeaderboard(
        competition.id
      );

      // Check if competition should be included in standings
      const competitionDate = new Date(competition.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      competitionDate.setHours(0, 0, 0, 0);

      const isPastCompetition = competitionDate < today;
      const hasAnyScores = teamResults.some((team) => team.totalShots && team.totalShots > 0);

      // Include competition if:
      // 1. It's a past competition (always include regardless of scores), OR
      // 2. It's a current/future competition AND has at least one score reported
      if (!isPastCompetition && !hasAnyScores) {
        // Skip future competitions with no scores
        continue;
      }

      for (let i = 0; i < teamResults.length; i++) {
        const teamResult = teamResults[i];
        if (!teamStandings[teamResult.teamId]) {
          teamStandings[teamResult.teamId] = {
            team_id: teamResult.teamId,
            team_name: teamResult.teamName,
            total_points: 0,
            competitions_played: 0,
            position: 0,
            competitions: [],
          };
        }

        if (teamResult.teamPoints !== null) {
          // teamPoints already includes the multiplier from CompetitionService
          teamStandings[teamResult.teamId].total_points += teamResult.teamPoints;
          teamStandings[teamResult.teamId].competitions_played += 1;
          teamStandings[teamResult.teamId].competitions.push({
            competition_id: competition.id,
            competition_name: competition.name,
            competition_date: competition.date,
            points: teamResult.teamPoints, // Already multiplied by CompetitionService
            position: i + 1, // Position based on sorted order from getTeamLeaderboard
          });
        }
      }
    }

    // Sort teams by total points (descending) and assign positions
    const sortedTeams = Object.values(teamStandings)
      .sort((a, b) => b.total_points - a.total_points)
      .map((team, index) => ({
        ...team,
        position: index + 1,
      }));

    return {
      series,
      team_standings: sortedTeams,
      total_competitions: competitions.length,
    };
  }

}
