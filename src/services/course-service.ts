import { Database } from "bun:sqlite";
import type { Course, CreateCourseDto, UpdateCourseDto } from "../types";
import { GOLF } from "../constants/golf";
import { parseParsArray, safeParseJsonWithDefault } from "../utils/parsing";
import { getTeeColor } from "../utils/tee-colors";
import { CourseTeeService } from "./course-tee.service";
import { ClubService } from "./club.service";

// Types for course import
export interface ImportScorecardHole {
  hole: number;
  par: number;
  hcp_men: number;
  hcp_women: number;
}

export interface ImportTeeRating {
  tee_name: string;
  men: { course_rating: number; slope: number } | null;
  women: { course_rating: number; slope: number } | null;
}

export interface ImportCourseMetadata {
  club_name: string;
  course_name: string;
  location?: string;
  total_par: number;
  total_holes: number;
}

export interface ImportCourseData {
  course_metadata: ImportCourseMetadata;
  scorecard: ImportScorecardHole[];
  tee_ratings: ImportTeeRating[];
}

export interface ImportCourseResult {
  success: boolean;
  courseName: string;
  courseId: number;
  action: "created" | "updated";
  teesProcessed: number;
  errors?: string[];
}

interface ParsData {
  holes: number[];
  out: number;
  in: number;
  total: number;
}

// Types for paginated admin response
export interface CourseAdminListItem {
  id: number;
  name: string;
  totalPar: number;
  holeCount: number;
  teeCount: number;
  crRange: { min: number | null; max: number | null } | null;
}

export interface GetCoursesPagedAdminOptions {
  limit: number;
  offset: number;
  search?: string;
  holeCount?: 9 | 18;
  hasTees?: boolean;
}

export interface GetCoursesPagedAdminResult {
  courses: CourseAdminListItem[];
  total: number;
  hasMore: boolean;
}

// Raw row type for the paged query
interface CourseAdminRow {
  id: number;
  name: string;
  pars: string;
  tee_count: number;
  cr_min: number | null;
  cr_max: number | null;
}

// Raw database row type
interface CourseRow {
  id: number;
  name: string;
  club_id: number | null;
  pars: string; // JSON string in database
  stroke_index: string | null; // JSON string in database
  created_at: string;
  updated_at: string;
}

export class CourseService {
  constructor(
    private db: Database,
    private teeService?: CourseTeeService,
    private clubService?: ClubService
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private calculatePars(pars: number[]): ParsData {
    const out = pars.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const in_ = pars.slice(9).reduce((sum, par) => sum + par, 0);
    return {
      holes: pars,
      out,
      in: in_,
      total: out + in_,
    };
  }

  private transformCourseRow(row: CourseRow & { club_name?: string | null }): Course {
    const pars = parseParsArray(row.pars);
    const strokeIndex = safeParseJsonWithDefault<number[] | undefined>(row.stroke_index, undefined);
    return {
      id: row.id,
      name: row.name,
      club_id: row.club_id ?? undefined,
      club_name: row.club_name ?? undefined,
      pars: this.calculatePars(pars),
      stroke_index: strokeIndex,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private validateCourseName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Course name is required");
    }
  }

  private validateCourseNameNotEmpty(name: string | undefined): void {
    if (name !== undefined && !name.trim()) {
      throw new Error("Course name cannot be empty");
    }
  }

  private validateParsArray(pars: number[]): void {
    if (pars.length > GOLF.HOLES_PER_ROUND) {
      throw new Error(`Course cannot have more than ${GOLF.HOLES_PER_ROUND} holes`);
    }
    if (!pars.every((par) => Number.isInteger(par) && par >= GOLF.MIN_PAR && par <= GOLF.MAX_PAR)) {
      throw new Error(`All pars must be integers between ${GOLF.MIN_PAR} and ${GOLF.MAX_PAR}`);
    }
  }

  private validateStrokeIndex(strokeIndex: number[]): void {
    if (strokeIndex.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Stroke index must have exactly ${GOLF.HOLES_PER_ROUND} values`);
    }
    // Check that all values are 1-18 and each appears exactly once
    const sorted = [...strokeIndex].sort((a, b) => a - b);
    const expected = Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1);
    if (!sorted.every((val, i) => val === expected[i])) {
      throw new Error("Stroke index must contain each value from 1 to 18 exactly once");
    }
  }

  private validateImportCourseData(data: ImportCourseData): void {
    if (!data.course_metadata?.course_name?.trim()) {
      throw new Error("Course name is required");
    }
    if (!Array.isArray(data.scorecard) || data.scorecard.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Scorecard must have exactly ${GOLF.HOLES_PER_ROUND} holes`);
    }
    if (!Array.isArray(data.tee_ratings) || data.tee_ratings.length === 0) {
      throw new Error("At least one tee rating is required");
    }
  }

  private extractParsFromScorecard(scorecard: ImportScorecardHole[]): number[] {
    return scorecard.map(hole => hole.par);
  }

  private extractStrokeIndexFromScorecard(scorecard: ImportScorecardHole[]): number[] {
    // Use men's handicap as primary (most courses use same for both genders)
    return scorecard.map(hole => hole.hcp_men);
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private insertCourseRow(name: string, clubId?: number): CourseRow {
    const stmt = this.db.prepare(`
      INSERT INTO courses (name, pars, club_id)
      VALUES (?, ?, ?)
      RETURNING *
    `);
    return stmt.get(name, JSON.stringify([]), clubId ?? null) as CourseRow;
  }

  private findAllCourseRows(): CourseRow[] {
    const stmt = this.db.prepare("SELECT * FROM courses");
    return stmt.all() as CourseRow[];
  }

  private findAllCoursesWithClub(): Array<CourseRow & { club_name: string | null }> {
    const stmt = this.db.prepare(`
      SELECT c.*, cl.name as club_name
      FROM courses c
      LEFT JOIN clubs cl ON c.club_id = cl.id
      ORDER BY COALESCE(cl.name, c.name), c.name
    `);
    return stmt.all() as Array<CourseRow & { club_name: string | null }>;
  }

  private findCourseRowById(id: number): CourseRow | null {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE id = ?");
    return stmt.get(id) as CourseRow | null;
  }

  private findCourseRowByName(name: string): CourseRow | null {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE LOWER(name) = LOWER(?)");
    return stmt.get(name) as CourseRow | null;
  }

  private updateCourseNameRow(id: number, name: string): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id) as CourseRow;
  }

  private updateCourseClubIdRow(id: number, clubId: number | null): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET club_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(clubId, id) as CourseRow;
  }

  private updateCourseNameAndClubIdRow(id: number, name: string, clubId: number | null): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET name = ?, club_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, clubId, id) as CourseRow;
  }

  private updateCourseParsRow(id: number, pars: number[]): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(pars), id) as CourseRow;
  }

  private updateCourseStrokeIndexRow(id: number, strokeIndex: number[]): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET stroke_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(strokeIndex), id) as CourseRow;
  }

  private updateCourseParsAndStrokeIndexRow(
    id: number,
    pars: number[],
    strokeIndex: number[]
  ): CourseRow {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET pars = ?, stroke_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(pars), JSON.stringify(strokeIndex), id) as CourseRow;
  }

  private findCompetitionsByCourse(courseId: number): { id: number }[] {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE course_id = ?");
    return stmt.all(courseId) as { id: number }[];
  }

  private deleteCourseRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM courses WHERE id = ?");
    stmt.run(id);
  }

  private buildCourseAdminFilters(
    search?: string,
    holeCount?: 9 | 18,
    hasTees?: boolean
  ): { whereClause: string; havingClause: string; params: (string | number)[] } {
    const conditions: string[] = [];
    const havingConditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push("LOWER(c.name) LIKE LOWER(?)");
      params.push(`%${search}%`);
    }

    if (hasTees !== undefined) {
      if (hasTees) {
        havingConditions.push("COUNT(ct.id) > 0");
      } else {
        havingConditions.push("COUNT(ct.id) = 0");
      }
    }

    if (holeCount !== undefined) {
      // holeCount filter: count non-zero pars in the array
      // We'll add this as a HAVING clause after calculating hole_count
      havingConditions.push("hole_count = ?");
      params.push(holeCount);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

    return { whereClause, havingClause, params };
  }

  private findCoursesPagedAdmin(
    limit: number,
    offset: number,
    search?: string,
    holeCount?: 9 | 18,
    hasTees?: boolean
  ): CourseAdminRow[] {
    const { whereClause, havingClause, params } = this.buildCourseAdminFilters(search, holeCount, hasTees);

    // Calculate hole_count by counting non-null/non-zero pars in the JSON array
    // The pars are stored as a JSON array like [4,5,3,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    // We count values > 0 to get the hole count
    const sql = `
      SELECT
        c.id,
        c.name,
        c.pars,
        COUNT(ct.id) as tee_count,
        MIN(ctr.course_rating) as cr_min,
        MAX(ctr.course_rating) as cr_max,
        (
          SELECT COUNT(*)
          FROM json_each(c.pars)
          WHERE json_each.value > 0
        ) as hole_count
      FROM courses c
      LEFT JOIN course_tees ct ON c.id = ct.course_id
      LEFT JOIN course_tee_ratings ctr ON ct.id = ctr.tee_id
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `;

    return this.db.prepare(sql).all(...params, limit, offset) as CourseAdminRow[];
  }

  private countCoursesPagedAdmin(
    search?: string,
    holeCount?: 9 | 18,
    hasTees?: boolean
  ): number {
    const { whereClause, havingClause, params } = this.buildCourseAdminFilters(search, holeCount, hasTees);

    const sql = `
      SELECT COUNT(*) as count FROM (
        SELECT
          c.id,
          COUNT(ct.id) as tee_count,
          (
            SELECT COUNT(*)
            FROM json_each(c.pars)
            WHERE json_each.value > 0
          ) as hole_count
        FROM courses c
        LEFT JOIN course_tees ct ON c.id = ct.course_id
        ${whereClause}
        GROUP BY c.id
        ${havingClause}
      )
    `;

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  private transformCourseAdminRow(row: CourseAdminRow): CourseAdminListItem {
    // Parse pars to calculate total and hole count
    let totalPar = 0;
    let holeCount = 0;

    try {
      const pars = JSON.parse(row.pars) as number[];
      for (const par of pars) {
        if (par > 0) {
          totalPar += par;
          holeCount++;
        }
      }
    } catch {
      // If parsing fails, default to 0
    }

    return {
      id: row.id,
      name: row.name,
      totalPar,
      holeCount,
      teeCount: row.tee_count,
      crRange: row.cr_min !== null && row.cr_max !== null
        ? { min: row.cr_min, max: row.cr_max }
        : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateCourseDto): Promise<Course> {
    this.validateCourseName(data.name);
    const row = this.insertCourseRow(data.name, data.club_id);
    return this.transformCourseRow(row);
  }

  async findAll(): Promise<Course[]> {
    const rows = this.findAllCoursesWithClub();
    return rows.map((row) => this.transformCourseRow(row));
  }

  getCoursesPagedAdmin(options: GetCoursesPagedAdminOptions): GetCoursesPagedAdminResult {
    // Validate and sanitize limit (1-100, default 50)
    const limit = Math.min(Math.max(1, options.limit || 50), 100);

    // Validate and sanitize offset (non-negative, default 0)
    const offset = Math.max(0, options.offset || 0);

    // Validate holeCount if provided (must be 9 or 18)
    const holeCount = options.holeCount === 9 || options.holeCount === 18
      ? options.holeCount
      : undefined;

    // Get total count for pagination
    const total = this.countCoursesPagedAdmin(options.search, holeCount, options.hasTees);

    // Get paginated courses
    const rows = this.findCoursesPagedAdmin(limit, offset, options.search, holeCount, options.hasTees);
    const courses = rows.map((row) => this.transformCourseAdminRow(row));

    // Calculate if more results exist
    const hasMore = offset + courses.length < total;

    return { courses, total, hasMore };
  }

  async findById(id: number): Promise<Course | null> {
    const row = this.findCourseRowById(id);
    if (!row) return null;
    return this.transformCourseRow(row);
  }

  async update(id: number, data: UpdateCourseDto): Promise<Course> {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }

    this.validateCourseNameNotEmpty(data.name);

    // No changes requested - return existing course
    if (!data.name && data.club_id === undefined) {
      return this.transformCourseRow(existingRow);
    }

    let updatedRow: CourseRow;
    if (data.name && data.club_id !== undefined) {
      // Update both name and club_id
      updatedRow = this.updateCourseNameAndClubIdRow(id, data.name, data.club_id ?? null);
    } else if (data.name) {
      // Update only name
      updatedRow = this.updateCourseNameRow(id, data.name);
    } else {
      // Update only club_id
      updatedRow = this.updateCourseClubIdRow(id, data.club_id ?? null);
    }

    return this.transformCourseRow(updatedRow);
  }

  async updateHoles(
    id: number,
    pars: number[],
    strokeIndex?: number[]
  ): Promise<Course> {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }

    this.validateParsArray(pars);
    if (strokeIndex) {
      this.validateStrokeIndex(strokeIndex);
    }

    let updatedRow: CourseRow;
    if (strokeIndex) {
      updatedRow = this.updateCourseParsAndStrokeIndexRow(id, pars, strokeIndex);
    } else {
      updatedRow = this.updateCourseParsRow(id, pars);
    }
    return this.transformCourseRow(updatedRow);
  }

  async delete(id: number): Promise<void> {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }

    const competitions = this.findCompetitionsByCourse(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete course that is used in competitions");
    }

    this.deleteCourseRow(id);
  }

  async importForCourse(
    courseId: number,
    data: ImportCourseData
  ): Promise<ImportCourseResult> {
    if (!this.teeService) {
      throw new Error("CourseTeeService is required for import functionality");
    }
    if (!this.clubService) {
      throw new Error("ClubService is required for import functionality");
    }

    // Validate course exists
    const existingRow = this.findCourseRowById(courseId);
    if (!existingRow) {
      throw new Error("Course not found");
    }

    try {
      // Validate course data
      this.validateImportCourseData(data);

      const courseName = data.course_metadata.course_name.trim();
      const clubName = data.course_metadata.club_name.trim();
      const pars = this.extractParsFromScorecard(data.scorecard);
      const strokeIndex = this.extractStrokeIndexFromScorecard(data.scorecard);

      // Validate pars and stroke index
      this.validateParsArray(pars);
      this.validateStrokeIndex(strokeIndex);

      // Find or create club
      const club = await this.clubService.findOrCreate(clubName);

      // Update course name if different, and update club_id
      if (existingRow.name !== courseName) {
        await this.update(courseId, { name: courseName, club_id: club.id });
      } else {
        await this.update(courseId, { club_id: club.id });
      }

      // Update holes
      await this.updateHoles(courseId, pars, strokeIndex);

      // Process tee ratings
      const existingTees = this.teeService.findByCourse(courseId);
      let teesProcessed = 0;

      for (const teeRating of data.tee_ratings) {
        const teeName = teeRating.tee_name.trim();
        const teeColor = getTeeColor(teeName);

        // Find existing tee (case-insensitive)
        const existingTee = existingTees.find(
          t => t.name.toLowerCase() === teeName.toLowerCase()
        );

        let teeId: number;

        if (existingTee) {
          // Update existing tee (name and color)
          const updatedTee = this.teeService.update(existingTee.id, {
            name: teeName,
            color: teeColor
          });
          teeId = updatedTee.id;
        } else {
          // Create new tee with ratings
          const ratings = [];
          if (teeRating.men) {
            ratings.push({
              gender: "men" as const,
              course_rating: teeRating.men.course_rating,
              slope_rating: teeRating.men.slope,
            });
          }
          if (teeRating.women) {
            ratings.push({
              gender: "women" as const,
              course_rating: teeRating.women.course_rating,
              slope_rating: teeRating.women.slope,
            });
          }

          if (ratings.length === 0) {
            throw new Error(`Tee ${teeName} has no ratings`);
          }

          const newTee = this.teeService.create(courseId, {
            name: teeName,
            color: teeColor,
            ratings,
          });
          teeId = newTee.id;
        }

        // For existing tees, upsert gender-specific ratings
        if (existingTee) {
          if (teeRating.men) {
            this.teeService.upsertRating(teeId, {
              gender: "men",
              course_rating: teeRating.men.course_rating,
              slope_rating: teeRating.men.slope,
            });
          }

          if (teeRating.women) {
            this.teeService.upsertRating(teeId, {
              gender: "women",
              course_rating: teeRating.women.course_rating,
              slope_rating: teeRating.women.slope,
            });
          }
        }

        teesProcessed++;
      }

      return {
        success: true,
        courseName,
        courseId,
        action: "updated",
        teesProcessed,
      };
    } catch (error) {
      return {
        success: false,
        courseName: data.course_metadata?.course_name || "Unknown",
        courseId,
        action: "updated",
        teesProcessed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  async importCourses(
    data: ImportCourseData | ImportCourseData[]
  ): Promise<ImportCourseResult[]> {
    if (!this.teeService) {
      throw new Error("CourseTeeService is required for import functionality");
    }
    if (!this.clubService) {
      throw new Error("ClubService is required for import functionality");
    }

    // Normalize to array
    const courses = Array.isArray(data) ? data : [data];
    const results: ImportCourseResult[] = [];

    for (const courseData of courses) {
      try {
        // Validate course data
        this.validateImportCourseData(courseData);

        const courseName = courseData.course_metadata.course_name.trim();
        const clubName = courseData.course_metadata.club_name.trim();
        const pars = this.extractParsFromScorecard(courseData.scorecard);
        const strokeIndex = this.extractStrokeIndexFromScorecard(courseData.scorecard);

        // Validate pars and stroke index
        this.validateParsArray(pars);
        this.validateStrokeIndex(strokeIndex);

        // Find or create club
        const club = await this.clubService.findOrCreate(clubName);

        // Check if course exists
        const existingCourseRow = this.findCourseRowByName(courseName);
        let courseId: number;
        let action: "created" | "updated";

        if (existingCourseRow) {
          // Update existing course (including club_id)
          await this.update(existingCourseRow.id, { club_id: club.id });
          await this.updateHoles(existingCourseRow.id, pars, strokeIndex);
          courseId = existingCourseRow.id;
          action = "updated";
        } else {
          // Create new course with club_id
          const newCourse = await this.create({ name: courseName, club_id: club.id });
          await this.updateHoles(newCourse.id, pars, strokeIndex);
          courseId = newCourse.id;
          action = "created";
        }

        // Process tee ratings
        const existingTees = this.teeService.findByCourse(courseId);
        let teesProcessed = 0;

        for (const teeRating of courseData.tee_ratings) {
          const teeName = teeRating.tee_name.trim();
          const teeColor = getTeeColor(teeName);

          // Find existing tee (case-insensitive)
          const existingTee = existingTees.find(
            t => t.name.toLowerCase() === teeName.toLowerCase()
          );

          let teeId: number;

          if (existingTee) {
            // Update existing tee (name and color)
            const updatedTee = this.teeService.update(existingTee.id, {
              name: teeName,
              color: teeColor
            });
            teeId = updatedTee.id;
          } else {
            // Create new tee with ratings array to avoid creating unwanted default ratings
            const ratings = [];
            if (teeRating.men) {
              ratings.push({
                gender: "men" as const,
                course_rating: teeRating.men.course_rating,
                slope_rating: teeRating.men.slope,
              });
            }
            if (teeRating.women) {
              ratings.push({
                gender: "women" as const,
                course_rating: teeRating.women.course_rating,
                slope_rating: teeRating.women.slope,
              });
            }

            if (ratings.length === 0) {
              throw new Error(`Tee ${teeName} has no ratings`);
            }

            const newTee = this.teeService.create(courseId, {
              name: teeName,
              color: teeColor,
              ratings,
            });
            teeId = newTee.id;
          }

          // For existing tees, upsert gender-specific ratings
          if (existingTee) {
            if (teeRating.men) {
              this.teeService.upsertRating(teeId, {
                gender: "men",
                course_rating: teeRating.men.course_rating,
                slope_rating: teeRating.men.slope,
              });
            }

            if (teeRating.women) {
              this.teeService.upsertRating(teeId, {
                gender: "women",
                course_rating: teeRating.women.course_rating,
                slope_rating: teeRating.women.slope,
              });
            }
          }

          teesProcessed++;
        }

        results.push({
          success: true,
          courseName,
          courseId,
          action,
          teesProcessed,
        });
      } catch (error) {
        results.push({
          success: false,
          courseName: courseData.course_metadata?.course_name || "Unknown",
          courseId: -1,
          action: "created",
          teesProcessed: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    return results;
  }
}
