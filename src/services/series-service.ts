import { Database } from "bun:sqlite";
import type {
  CreateSeriesDto,
  Series,
  SeriesStandings,
  SeriesTeamStanding,
  TeamLeaderboardEntry,
  UpdateSeriesDto,
} from "../types";
import type { CompetitionService } from "./competition-service";

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface SeriesRow {
  id: number;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  is_public: number; // SQLite boolean
  landing_document_id: number | null;
  owner_id: number | null;
  created_at: string;
  updated_at: string;
}

interface CompetitionRow {
  id: number;
  name: string;
  date: string;
  course_id: number;
  tee_id: number | null;
  series_id: number | null;
  tour_id: number | null;
  manual_entry_format: string;
  points_multiplier: number;
  venue_type: string;
  start_mode: string;
  open_start: string | null;
  open_end: string | null;
  is_results_final: number; // SQLite boolean
  results_finalized_at: string | null;
  course_name: string;
  participant_count: number;
}

interface TeamRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
  id: number;
  series_id: number;
}

interface CompetitionInfo {
  id: number;
  name: string;
  date: string;
}

interface CompetitionWithCourse {
  id: number;
  name: string;
  date: string;
  course_id: number;
  tee_id: number | null;
  series_id: number | null;
  tour_id: number | null;
  manual_entry_format: string;
  points_multiplier: number;
  venue_type: string;
  start_mode: string;
  open_start: string | null;
  open_end: string | null;
  is_results_final: boolean;
  results_finalized_at: string | null;
  course: {
    id: number;
    name: string;
  };
  participant_count: number;
}

export class SeriesService {
  constructor(private db: Database, private competitionService: CompetitionService) {}

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validateSeriesName(name: string): void {
    if (!name?.trim()) {
      throw new Error("Series name is required");
    }
  }

  private validateSeriesNameNotEmpty(name: string): void {
    if (!name.trim()) {
      throw new Error("Series name cannot be empty");
    }
  }

  private translateUniqueConstraintError(error: Error): Error {
    if (error.message.includes("UNIQUE constraint failed")) {
      return new Error("Series name must be unique");
    }
    return error;
  }

  // ============================================================================
  // Transform Methods (private, no SQL)
  // ============================================================================

  private transformSeriesRow(row: SeriesRow): Series {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      banner_image_url: row.banner_image_url,
      is_public: Boolean(row.is_public),
      landing_document_id: row.landing_document_id,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private transformCompetitionRow(row: CompetitionRow): CompetitionWithCourse {
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      course_id: row.course_id,
      tee_id: row.tee_id,
      series_id: row.series_id,
      tour_id: row.tour_id,
      manual_entry_format: row.manual_entry_format,
      points_multiplier: row.points_multiplier,
      venue_type: row.venue_type,
      start_mode: row.start_mode,
      open_start: row.open_start,
      open_end: row.open_end,
      is_results_final: Boolean(row.is_results_final),
      results_finalized_at: row.results_finalized_at,
      participant_count: row.participant_count,
      course: {
        id: row.course_id,
        name: row.course_name,
      },
    };
  }

  private buildUpdateFields(
    data: UpdateSeriesDto
  ): { updates: string[]; values: (string | number | null)[] } {
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

    if (data.is_public !== undefined) {
      updates.push("is_public = ?");
      values.push(data.is_public ? 1 : 0);
    }

    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }

    return { updates, values };
  }

  private isPastCompetition(competitionDate: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compDate = new Date(competitionDate);
    compDate.setHours(0, 0, 0, 0);
    return compDate < today;
  }

  private teamResultsHaveScores(teamResults: TeamLeaderboardEntry[]): boolean {
    return teamResults.some((team) => team.totalShots && team.totalShots > 0);
  }

  private shouldIncludeCompetition(
    competitionDate: Date,
    teamResults: TeamLeaderboardEntry[]
  ): boolean {
    // Include if it's a past competition OR has scores
    return this.isPastCompetition(competitionDate) || this.teamResultsHaveScores(teamResults);
  }

  private calculateTeamStandings(
    competitions: CompetitionInfo[],
    teamResultsByCompetition: Map<number, TeamLeaderboardEntry[]>
  ): SeriesTeamStanding[] {
    const teamStandings: { [teamId: number]: SeriesTeamStanding } = {};

    for (const competition of competitions) {
      const teamResults = teamResultsByCompetition.get(competition.id);
      if (!teamResults) continue;

      const competitionDate = new Date(competition.date);
      if (!this.shouldIncludeCompetition(competitionDate, teamResults)) {
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
          teamStandings[teamResult.teamId].total_points += teamResult.teamPoints;
          teamStandings[teamResult.teamId].competitions_played += 1;
          teamStandings[teamResult.teamId].competitions.push({
            competition_id: competition.id,
            competition_name: competition.name,
            competition_date: competition.date,
            points: teamResult.teamPoints,
            position: i + 1,
          });
        }
      }
    }

    return this.sortAndRankTeamStandings(Object.values(teamStandings));
  }

  private sortAndRankTeamStandings(standings: SeriesTeamStanding[]): SeriesTeamStanding[] {
    return standings
      .sort((a, b) => b.total_points - a.total_points)
      .map((team, index) => ({
        ...team,
        position: index + 1,
      }));
  }

  // ============================================================================
  // Query Methods (private, single SQL statement each)
  // ============================================================================

  private insertSeriesRow(
    name: string,
    description: string | null,
    bannerImageUrl: string | null,
    isPublic: number,
    ownerId: number | null
  ): SeriesRow {
    return this.db.prepare(`
      INSERT INTO series (name, description, banner_image_url, is_public, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `).get(name, description, bannerImageUrl, isPublic, ownerId) as SeriesRow;
  }

  private findAllSeriesRows(): SeriesRow[] {
    return this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, owner_id, created_at, updated_at
      FROM series
      ORDER BY strftime('%s.%f', created_at) DESC
    `).all() as SeriesRow[];
  }

  private findPublicSeriesRows(): SeriesRow[] {
    // Sort by status priority (ACTIVE → UPCOMING → COMPLETED)
    // Within each status, sort by most recent competition date
    return this.db.prepare(`
      SELECT
        s.id, s.name, s.description, s.banner_image_url, s.is_public,
        s.landing_document_id, s.owner_id, s.created_at, s.updated_at,
        MAX(c.date) as latest_competition_date,
        COUNT(c.id) as competition_count,
        SUM(CASE WHEN c.is_results_final = 1 THEN 1 ELSE 0 END) as finalized_count
      FROM series s
      LEFT JOIN competitions c ON s.id = c.series_id
      WHERE s.is_public = 1
      GROUP BY s.id
      ORDER BY
        CASE
          -- ACTIVE: has competitions, not all finalized, latest competition is not too old
          WHEN competition_count > 0
               AND finalized_count < competition_count
               AND julianday('now') - julianday(latest_competition_date) <= 180
          THEN 1
          -- UPCOMING: no competitions OR all in future
          WHEN competition_count = 0
               OR julianday(MAX(c.date)) > julianday('now')
          THEN 2
          -- COMPLETED: all competitions finalized OR last competition is old
          ELSE 3
        END,
        latest_competition_date DESC,
        strftime('%s.%f', s.created_at) DESC
    `).all() as SeriesRow[];
  }

  private findSeriesRowById(id: number): SeriesRow | null {
    return this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, owner_id, created_at, updated_at
      FROM series
      WHERE id = ?
    `).get(id) as SeriesRow | null;
  }

  private findSeriesForUserRows(userId: number): SeriesRow[] {
    return this.db.prepare(`
      SELECT DISTINCT s.id, s.name, s.description, s.banner_image_url, s.is_public,
             s.landing_document_id, s.owner_id, s.created_at, s.updated_at
      FROM series s
      LEFT JOIN series_admins sa ON s.id = sa.series_id
      WHERE s.owner_id = ? OR sa.user_id = ?
      ORDER BY strftime('%s.%f', s.created_at) DESC
    `).all(userId, userId) as SeriesRow[];
  }

  private findDocumentRow(id: number): DocumentRow | null {
    return this.db.prepare("SELECT id, series_id FROM documents WHERE id = ?")
      .get(id) as DocumentRow | null;
  }

  private updateSeriesRow(
    id: number,
    updates: string[],
    values: (string | number | null)[]
  ): SeriesRow {
    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);

    return this.db.prepare(`
      UPDATE series
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `).get(...values) as SeriesRow;
  }

  private deleteSeriesRow(id: number): void {
    this.db.prepare("DELETE FROM series WHERE id = ?").run(id);
  }

  private findCompetitionRowsBySeries(seriesId: number): CompetitionRow[] {
    return this.db.prepare(`
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
    `).all(seriesId) as CompetitionRow[];
  }

  private findTeamRowsBySeries(seriesId: number): TeamRow[] {
    return this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      JOIN series_teams st ON t.id = st.team_id
      WHERE st.series_id = ?
      ORDER BY t.name
    `).all(seriesId) as TeamRow[];
  }

  private findTeamExists(id: number): boolean {
    const row = this.db.prepare("SELECT id FROM teams WHERE id = ?").get(id);
    return row !== null;
  }

  private insertSeriesTeamRow(seriesId: number, teamId: number): void {
    this.db.prepare(`
      INSERT INTO series_teams (series_id, team_id)
      VALUES (?, ?)
    `).run(seriesId, teamId);
  }

  private deleteSeriesTeamRow(seriesId: number, teamId: number): number {
    const result = this.db.prepare(`
      DELETE FROM series_teams
      WHERE series_id = ? AND team_id = ?
    `).run(seriesId, teamId);
    return result.changes;
  }

  private findAvailableTeamRows(seriesId: number): TeamRow[] {
    return this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      WHERE t.id NOT IN (
        SELECT team_id
        FROM series_teams
        WHERE series_id = ?
      )
      ORDER BY t.name
    `).all(seriesId) as TeamRow[];
  }

  private findCompetitionInfoBySeries(seriesId: number): CompetitionInfo[] {
    return this.db.prepare(`
      SELECT c.id, c.name, c.date
      FROM competitions c
      WHERE c.series_id = ?
      ORDER BY c.date
    `).all(seriesId) as CompetitionInfo[];
  }

  // ============================================================================
  // Public API Methods (orchestration only)
  // ============================================================================

  async create(data: CreateSeriesDto, ownerId?: number): Promise<Series> {
    this.validateSeriesName(data.name);

    try {
      const isPublic = data.is_public !== undefined ? (data.is_public ? 1 : 0) : 1;
      const row = this.insertSeriesRow(
        data.name,
        data.description || null,
        data.banner_image_url || null,
        isPublic,
        ownerId ?? null
      );
      return this.transformSeriesRow(row);
    } catch (error) {
      if (error instanceof Error) {
        throw this.translateUniqueConstraintError(error);
      }
      throw error;
    }
  }

  async findAll(): Promise<Series[]> {
    const rows = this.findAllSeriesRows();
    return rows.map((row) => this.transformSeriesRow(row));
  }

  async findPublic(): Promise<Series[]> {
    const rows = this.findPublicSeriesRows();
    return rows.map((row) => this.transformSeriesRow(row));
  }

  async findForUser(userId: number): Promise<Series[]> {
    const rows = this.findSeriesForUserRows(userId);
    return rows.map((row) => this.transformSeriesRow(row));
  }

  async findById(id: number): Promise<Series | null> {
    const row = this.findSeriesRowById(id);
    if (!row) return null;
    return this.transformSeriesRow(row);
  }

  async update(id: number, data: UpdateSeriesDto): Promise<Series> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }

    if (data.name !== undefined) {
      this.validateSeriesNameNotEmpty(data.name);
    }

    // Validate landing_document_id if provided
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      const document = this.findDocumentRow(data.landing_document_id);
      if (!document) {
        throw new Error("Landing document not found");
      }
      if (document.series_id !== id) {
        throw new Error("Landing document must belong to the same series");
      }
    }

    const { updates, values } = this.buildUpdateFields(data);

    if (updates.length === 0) {
      return existing;
    }

    try {
      const row = this.updateSeriesRow(id, updates, values);
      return this.transformSeriesRow(row);
    } catch (error) {
      if (error instanceof Error) {
        throw this.translateUniqueConstraintError(error);
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }

    this.deleteSeriesRow(id);
  }

  async getCompetitions(id: number): Promise<CompetitionWithCourse[]> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }

    const rows = this.findCompetitionRowsBySeries(id);
    return rows.map((row) => this.transformCompetitionRow(row));
  }

  async getTeams(id: number): Promise<TeamRow[]> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }

    return this.findTeamRowsBySeries(id);
  }

  async addTeam(seriesId: number, teamId: number): Promise<void> {
    const existing = await this.findById(seriesId);
    if (!existing) {
      throw new Error("Series not found");
    }

    if (!this.findTeamExists(teamId)) {
      throw new Error("Team not found");
    }

    try {
      this.insertSeriesTeamRow(seriesId, teamId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new Error("Team is already in this series");
      }
      throw error;
    }
  }

  async removeTeam(seriesId: number, teamId: number): Promise<void> {
    const changes = this.deleteSeriesTeamRow(seriesId, teamId);

    if (changes === 0) {
      throw new Error("Team is not in this series");
    }
  }

  async getAvailableTeams(seriesId: number): Promise<TeamRow[]> {
    return this.findAvailableTeamRows(seriesId);
  }

  async getStandings(id: number): Promise<SeriesStandings> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    const competitions = this.findCompetitionInfoBySeries(id);

    // Collect team results for each competition
    const teamResultsByCompetition = new Map<number, TeamLeaderboardEntry[]>();
    for (const competition of competitions) {
      const teamResults = await this.competitionService.getTeamLeaderboard(competition.id);
      teamResultsByCompetition.set(competition.id, teamResults);
    }

    const teamStandings = this.calculateTeamStandings(competitions, teamResultsByCompetition);

    return {
      series,
      team_standings: teamStandings,
      total_competitions: competitions.length,
    };
  }
}
