import { Database } from "bun:sqlite";
import type {
  CreateSeriesDto,
  Series,
  SeriesStandings,
  SeriesTeamStanding,
  UpdateSeriesDto,
} from "../types";

export class SeriesService {
  constructor(private db: Database) {}

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
      // Calculate team results for this competition using the same logic as competition leaderboard
      const teamResults = await this.calculateCompetitionTeamResults(
        competition.id
      );

      // Check if competition should be included in standings
      const competitionDate = new Date(competition.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      competitionDate.setHours(0, 0, 0, 0);

      const isPastCompetition = competitionDate < today;
      const hasAnyScores = teamResults.some((team) => team.totalShots > 0);

      // Include competition if:
      // 1. It's a past competition (always include regardless of scores), OR
      // 2. It's a current/future competition AND has at least one score reported
      if (!isPastCompetition && !hasAnyScores) {
        // Skip future competitions with no scores
        continue;
      }

      for (const teamResult of teamResults) {
        if (!teamStandings[teamResult.team_id]) {
          teamStandings[teamResult.team_id] = {
            team_id: teamResult.team_id,
            team_name: teamResult.team_name,
            total_points: 0,
            competitions_played: 0,
            position: 0,
            competitions: [],
          };
        }

        teamStandings[teamResult.team_id].total_points += teamResult.points;
        teamStandings[teamResult.team_id].competitions_played += 1;
        teamStandings[teamResult.team_id].competitions.push({
          competition_id: competition.id,
          competition_name: competition.name,
          competition_date: competition.date,
          points: teamResult.points,
          position: teamResult.position,
        });
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

  private async calculateCompetitionTeamResults(
    competitionId: number
  ): Promise<any[]> {
    // Get all participants for this competition
    const participantsStmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name, tm.id as team_id
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    const participants = participantsStmt.all(competitionId) as any[];

    // Get course pars for score calculation
    const courseStmt = this.db.prepare(`
      SELECT co.pars
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    const courseResult = courseStmt.get(competitionId) as any;
    const coursePars = JSON.parse(courseResult.pars);

    // Calculate individual scores
    const participantScores = participants.map((participant) => {
      // Check if participant has manual scores
      if (
        participant.manual_score_total !== null &&
        participant.manual_score_total !== undefined
      ) {
        // Use manual scores
        const totalShots = participant.manual_score_total;
        const holesPlayed = 18; // Manual scores represent a full round

        // Calculate relative to par based on manual total
        const totalPar = coursePars.reduce(
          (sum: number, par: number) => sum + par,
          0
        );
        const relativeToPar = totalShots - totalPar;

        return {
          participant,
          totalShots,
          relativeToPar,
          holesPlayed,
          isValidRound: true,
        };
      } else {
        // Use existing logic for hole-by-hole scores
        const scores = JSON.parse(participant.score || "[]");
        let totalShots = 0;
        let totalPlayedPar = 0;
        let holesPlayed = 0;
        const hasGaveUp = scores.some((score: number) => score === -1);

        if (!hasGaveUp) {
          for (let i = 0; i < Math.min(scores.length, coursePars.length); i++) {
            const score = scores[i];
            const par = coursePars[i];
            if (score && score > 0) {
              totalShots += score;
              totalPlayedPar += par;
              holesPlayed++;
            }
          }
        }

        return {
          participant,
          totalShots: hasGaveUp ? 0 : totalShots,
          relativeToPar: hasGaveUp ? 0 : totalShots - totalPlayedPar,
          holesPlayed: hasGaveUp ? 0 : holesPlayed,
          isValidRound: !hasGaveUp,
        };
      }
    });

    // Group by team and calculate team totals
    const teamGroups: { [teamName: string]: any } = {};

    participantScores.forEach((entry) => {
      const teamName = entry.participant.team_name;
      const teamId = entry.participant.team_id;

      if (!teamGroups[teamName]) {
        teamGroups[teamName] = {
          team_id: teamId,
          team_name: teamName,
          participants: [],
          totalShots: 0,
          relativeToPar: 0,
        };
      }

      teamGroups[teamName].participants.push({
        name: entry.participant.player_names || "",
        position: entry.participant.position_name,
        totalShots: entry.totalShots,
        relativeToPar: entry.relativeToPar,
      });

      teamGroups[teamName].totalShots += entry.totalShots;
      teamGroups[teamName].relativeToPar += entry.relativeToPar;
    });

    // Sort teams by relativeToPar, total shots, and lowest individual score
    return Object.values(teamGroups)
      .sort((a, b) => {
        // Primary: lowest relativeToPar
        if (a.relativeToPar !== b.relativeToPar) {
          return a.relativeToPar - b.relativeToPar;
        }

        // Secondary: lowest total shots
        if (a.totalShots !== b.totalShots) {
          return a.totalShots - b.totalShots;
        }

        // Tertiary: compare individual scores (lowest first, then second lowest only if needed, etc.)
        const aScores = a.participants
          .map((p: any) => p.totalShots)
          .filter((score: number) => score > 0)
          .sort((x: number, y: number) => x - y);
        const bScores = b.participants
          .map((p: any) => p.totalShots)
          .filter((score: number) => score > 0)
          .sort((x: number, y: number) => x - y);

        // Handle case where no valid scores exist (shouldn't happen in practice)
        if (aScores.length === 0) return 1;
        if (bScores.length === 0) return -1;

        // Compare scores one by one, but only continue if tied
        const maxLength = Math.max(aScores.length, bScores.length);
        for (let i = 0; i < maxLength; i++) {
          const aScore = aScores[i] || Infinity; // If team has fewer participants, treat as worst possible score
          const bScore = bScores[i] || Infinity;

          if (aScore !== bScore) {
            return aScore - bScore; // Exit immediately when we find a difference
          }
          // Only continue to next score if current scores are tied
        }

        // All scores are identical
        return 0;
      })
      .map((team, index, array) => {
        const position = index + 1;
        let points = array.length - position + 1; // Base points (last place gets 1 point)

        // Add extra points for top 3 positions
        if (position === 1) points += 2; // First place gets 2 extra points
        if (position === 2) points += 1; // Second place gets 1 extra point

        return {
          ...team,
          position,
          points,
        };
      });
  }
}
