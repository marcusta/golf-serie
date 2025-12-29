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

    // Verify tour exists if provided
    if (data.tour_id) {
      const tourStmt = this.db.prepare("SELECT id FROM tours WHERE id = ?");
      const tour = tourStmt.get(data.tour_id);
      if (!tour) {
        throw new Error("Tour not found");
      }
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id) {
      const teeStmt = this.db.prepare("SELECT id, course_id FROM course_tees WHERE id = ?");
      const tee = teeStmt.get(data.tee_id) as { id: number; course_id: number } | null;
      if (!tee) {
        throw new Error("Tee not found");
      }
      if (tee.course_id !== data.course_id) {
        throw new Error("Tee must belong to the competition's course");
      }
    }

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

    if (data.tour_id !== undefined) {
      if (data.tour_id === null) {
        // Allow setting tour_id to null
      } else {
        const tourStmt = this.db.prepare(
          "SELECT id FROM tours WHERE id = ?"
        );
        const tour = tourStmt.get(data.tour_id);
        if (!tour) {
          throw new Error("Tour not found");
        }
      }
    }

    // Verify tee exists and belongs to the course if provided
    if (data.tee_id !== undefined && data.tee_id !== null) {
      const teeStmt = this.db.prepare("SELECT id, course_id FROM course_tees WHERE id = ?");
      const tee = teeStmt.get(data.tee_id) as { id: number; course_id: number } | null;
      if (!tee) {
        throw new Error("Tee not found");
      }
      // Check against the current or new course_id
      const effectiveCourseId = data.course_id ?? competition.course_id;
      if (tee.course_id !== effectiveCourseId) {
        throw new Error("Tee must belong to the competition's course");
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
    const response = await this.getLeaderboardWithDetails(competitionId);
    return response.entries;
  }

  /**
   * Get leaderboard with full details including tee info and net scores
   */
  async getLeaderboardWithDetails(competitionId: number): Promise<LeaderboardResponse> {
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

    // Get tour scoring mode if this is a tour competition
    let scoringMode: TourScoringMode | undefined;
    if (competition.tour_id) {
      const tourStmt = this.db.prepare("SELECT scoring_mode FROM tours WHERE id = ?");
      const tour = tourStmt.get(competition.tour_id) as { scoring_mode: string } | null;
      scoringMode = tour?.scoring_mode as TourScoringMode | undefined;
    }

    // Get tee info if competition has a tee assigned
    let teeInfo: LeaderboardResponse["tee"] | undefined;
    let strokeIndex: number[] = getDefaultStrokeIndex();
    let courseRating = 72; // Default CR
    let slopeRating = 113; // Default SR (standard)

    if (competition.tee_id) {
      const teeStmt = this.db.prepare(`
        SELECT ct.*,
               (SELECT json_group_array(json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating))
                FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
        FROM course_tees ct
        WHERE ct.id = ?
      `);
      const tee = teeStmt.get(competition.tee_id) as any;

      if (tee) {
        // Parse stroke index if available
        if (tee.stroke_index) {
          try {
            strokeIndex = typeof tee.stroke_index === "string"
              ? JSON.parse(tee.stroke_index)
              : tee.stroke_index;
          } catch {
            strokeIndex = getDefaultStrokeIndex();
          }
        }

        // Get course rating and slope (use men's rating as default for now)
        // TODO: In future, get player gender and use appropriate rating
        courseRating = tee.course_rating || 72;
        slopeRating = tee.slope_rating || 113;

        // Try to get men's rating from ratings table
        if (tee.ratings_json) {
          try {
            const ratings = JSON.parse(tee.ratings_json);
            const menRating = ratings.find((r: any) => r.gender === "men");
            if (menRating) {
              courseRating = menRating.course_rating;
              slopeRating = menRating.slope_rating;
            }
          } catch {
            // Use legacy values
          }
        }

        teeInfo = {
          id: tee.id,
          name: tee.name,
          color: tee.color,
          courseRating,
          slopeRating,
          strokeIndex,
        };
      }
    }

    // If no tee but net scoring is enabled, still return strokeIndex for UI
    if (!teeInfo && scoringMode && scoringMode !== "gross") {
      teeInfo = {
        id: 0,
        name: "Default",
        courseRating,
        slopeRating,
        strokeIndex,
      };
    }

    // Get player handicaps from tour enrollments if this is a tour competition
    const playerHandicaps = new Map<number, number>();
    if (competition.tour_id && scoringMode && scoringMode !== "gross") {
      const handicapsStmt = this.db.prepare(`
        SELECT te.player_id, COALESCE(te.playing_handicap, p.handicap) as handicap_index
        FROM tour_enrollments te
        JOIN players p ON te.player_id = p.id
        WHERE te.tour_id = ? AND te.player_id IS NOT NULL AND te.status = 'active'
      `);
      const handicaps = handicapsStmt.all(competition.tour_id) as { player_id: number; handicap_index: number | null }[];
      for (const h of handicaps) {
        if (h.handicap_index !== null) {
          playerHandicaps.set(h.player_id, h.handicap_index);
        }
      }
    }

    // Get all participants for this competition, including category info for tour competitions
    const participantsStmt = this.db.prepare(`
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
    const participants = participantsStmt.all(competitionId) as (Participant & {
      team_name: string;
      team_id: number;
      teetime: string;
      player_id: number | null;
      category_id: number | null;
      category_name: string | null;
    })[];

    // Get categories that have players in this competition (not all tour categories)
    let categories: { id: number; tour_id: number; name: string; description?: string; sort_order: number; created_at: string }[] = [];
    if (competition.tour_id) {
      const categoriesStmt = this.db.prepare(`
        SELECT DISTINCT tc.id, tc.tour_id, tc.name, tc.description, tc.sort_order, tc.created_at
        FROM tour_categories tc
        INNER JOIN tour_enrollments te ON tc.id = te.category_id
        INNER JOIN participants p ON te.player_id = p.player_id
        INNER JOIN tee_times t ON p.tee_time_id = t.id
        WHERE tc.tour_id = ? AND t.competition_id = ?
        ORDER BY tc.sort_order ASC, tc.name ASC
      `);
      categories = categoriesStmt.all(competition.tour_id, competitionId) as typeof categories;
    }

    // Get category tee assignments with full tee details for handicap calculations
    interface CategoryTeeRating {
      categoryId: number;
      teeId: number;
      teeName: string;
      courseRating: number;
      slopeRating: number;
      strokeIndex: number[];
    }
    const categoryTeeRatings = new Map<number, CategoryTeeRating>();

    if (competition.tour_id && scoringMode && scoringMode !== "gross") {
      const categoryTeesStmt = this.db.prepare(`
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
      const categoryTees = categoryTeesStmt.all(competitionId) as {
        category_id: number;
        tee_id: number;
        tee_name: string;
        stroke_index: string | null;
        legacy_course_rating: number | null;
        legacy_slope_rating: number | null;
        ratings_json: string | null;
      }[];

      for (const ct of categoryTees) {
        // Parse stroke index
        let catStrokeIndex = getDefaultStrokeIndex();
        if (ct.stroke_index) {
          try {
            catStrokeIndex = typeof ct.stroke_index === "string"
              ? JSON.parse(ct.stroke_index)
              : ct.stroke_index;
          } catch {
            catStrokeIndex = getDefaultStrokeIndex();
          }
        }

        // Get course rating and slope - prefer gender-specific ratings
        let catCourseRating = ct.legacy_course_rating || 72;
        let catSlopeRating = ct.legacy_slope_rating || 113;

        if (ct.ratings_json) {
          try {
            const ratings = JSON.parse(ct.ratings_json);
            // Use men's rating as default (TODO: match player gender to category gender)
            const menRating = ratings.find((r: { gender: string }) => r.gender === "men");
            if (menRating) {
              catCourseRating = menRating.course_rating;
              catSlopeRating = menRating.slope_rating;
            } else if (ratings.length > 0) {
              // Fall back to first available rating
              catCourseRating = ratings[0].course_rating;
              catSlopeRating = ratings[0].slope_rating;
            }
          } catch {
            // Use legacy values
          }
        }

        categoryTeeRatings.set(ct.category_id, {
          categoryId: ct.category_id,
          teeId: ct.tee_id,
          teeName: ct.tee_name,
          courseRating: catCourseRating,
          slopeRating: catSlopeRating,
          strokeIndex: catStrokeIndex,
        });
      }
    }

    // Parse course pars
    const coursePars = JSON.parse(competition.pars);
    if (!coursePars || coursePars.length === 0) {
      throw new Error("Invalid course pars data structure, no pars found");
    }
    const pars = coursePars;
    const totalPar = pars.reduce((sum: number, par: number) => sum + par, 0);

    // Calculate leaderboard entries
    const leaderboard: LeaderboardEntry[] = participants.map((participant) => {
      // Parse the score field
      const score =
        typeof participant.score === "string"
          ? JSON.parse(participant.score)
          : Array.isArray(participant.score)
          ? participant.score
          : [];

      // Get player handicap if available
      const handicapIndex = participant.player_id
        ? playerHandicaps.get(participant.player_id)
        : undefined;

      // Calculate course handicap and stroke distribution
      // Use category-specific tee ratings if available, otherwise fall back to default/competition tee
      let courseHandicap: number | undefined;
      let handicapStrokesPerHole: number[] | undefined;
      let playerCourseRating = courseRating;
      let playerSlopeRating = slopeRating;
      let playerStrokeIndex = strokeIndex;

      if (handicapIndex !== undefined && scoringMode && scoringMode !== "gross") {
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
        const holesPlayed = 18; // Manual scores represent a full round
        const relativeToPar = totalShots - totalPar;

        // Calculate net scores
        let netTotalShots: number | undefined;
        let netRelativeToPar: number | undefined;
        if (courseHandicap !== undefined) {
          netTotalShots = totalShots - courseHandicap;
          netRelativeToPar = netTotalShots - totalPar;
        }

        return {
          participant: {
            ...participant,
            score,
            handicap_index: handicapIndex,
            category_id: participant.category_id ?? undefined,
            category_name: participant.category_name ?? undefined,
          },
          totalShots,
          holesPlayed,
          relativeToPar,
          startTime: participant.teetime,
          netTotalShots,
          netRelativeToPar,
          courseHandicap,
          handicapStrokesPerHole,
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
          if (holesPlayed === 18) {
            netTotalShots = totalShots - courseHandicap;
          }
        }

        return {
          participant: {
            ...participant,
            score,
            handicap_index: handicapIndex,
            category_id: participant.category_id ?? undefined,
            category_name: participant.category_name ?? undefined,
          },
          totalShots,
          holesPlayed,
          relativeToPar,
          startTime: participant.teetime,
          netTotalShots,
          netRelativeToPar,
          courseHandicap,
          handicapStrokesPerHole,
        };
      }
    });

    // Sort by relative to par (ascending)
    const sortedLeaderboard = leaderboard.sort((a, b) => a.relativeToPar - b.relativeToPar);

    // Build categoryTees for the response if category-based tee assignments are used
    let categoryTeesResponse: LeaderboardResponse["categoryTees"] = undefined;
    if (categoryTeeRatings.size > 0 && categories.length > 0) {
      categoryTeesResponse = [];
      for (const cat of categories) {
        const catTee = categoryTeeRatings.get(cat.id);
        if (catTee) {
          categoryTeesResponse.push({
            categoryId: cat.id,
            categoryName: cat.name,
            teeId: catTee.teeId,
            teeName: catTee.teeName,
            courseRating: catTee.courseRating,
            slopeRating: catTee.slopeRating,
          });
        }
      }
      // Only include if we actually have assignments
      if (categoryTeesResponse.length === 0) {
        categoryTeesResponse = undefined;
      }
    }

    return {
      entries: sortedLeaderboard,
      competitionId,
      scoringMode,
      tee: teeInfo,
      categoryTees: categoryTeesResponse,
      categories: categories.length > 0 ? categories : undefined,
    };
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
    if (position <= 0) return 0;
    
    let basePoints: number;
    if (position === 1) {
      basePoints = numberOfTeams + 2;
    } else if (position === 2) {
      basePoints = numberOfTeams;
    } else {
      // For position 3 and below, ensuring points don't go below 0.
      basePoints = numberOfTeams - (position - 1);
      basePoints = Math.max(0, basePoints);
    }
    
    return basePoints * multiplier;
  }
}
