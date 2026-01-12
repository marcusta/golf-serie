import { Database } from "bun:sqlite";
import type { Course, CreateCourseDto, UpdateCourseDto } from "../types";
import { GOLF } from "../constants/golf";
import { parseParsArray } from "../utils/parsing";
import { CourseTeeService } from "./course-tee.service";

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

// Raw database row type
interface CourseRow {
  id: number;
  name: string;
  pars: string; // JSON string in database
  stroke_index: string | null; // JSON string in database
  created_at: string;
  updated_at: string;
}

export class CourseService {
  constructor(
    private db: Database,
    private teeService?: CourseTeeService
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

  private transformCourseRow(row: CourseRow): Course {
    const pars = parseParsArray(row.pars);
    const strokeIndex = row.stroke_index ? JSON.parse(row.stroke_index) : undefined;
    return {
      id: row.id,
      name: row.name,
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

  private insertCourseRow(name: string): CourseRow {
    const stmt = this.db.prepare(`
      INSERT INTO courses (name, pars)
      VALUES (?, ?)
      RETURNING *
    `);
    return stmt.get(name, JSON.stringify([])) as CourseRow;
  }

  private findAllCourseRows(): CourseRow[] {
    const stmt = this.db.prepare("SELECT * FROM courses");
    return stmt.all() as CourseRow[];
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

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateCourseDto): Promise<Course> {
    this.validateCourseName(data.name);
    const row = this.insertCourseRow(data.name);
    return this.transformCourseRow(row);
  }

  async findAll(): Promise<Course[]> {
    const rows = this.findAllCourseRows();
    return rows.map((row) => this.transformCourseRow(row));
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
    if (!data.name) {
      return this.transformCourseRow(existingRow);
    }

    const updatedRow = this.updateCourseNameRow(id, data.name);
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

  async importCourses(
    data: ImportCourseData | ImportCourseData[]
  ): Promise<ImportCourseResult[]> {
    if (!this.teeService) {
      throw new Error("CourseTeeService is required for import functionality");
    }

    // Normalize to array
    const courses = Array.isArray(data) ? data : [data];
    const results: ImportCourseResult[] = [];

    for (const courseData of courses) {
      try {
        // Validate course data
        this.validateImportCourseData(courseData);

        const courseName = courseData.course_metadata.course_name.trim();
        const pars = this.extractParsFromScorecard(courseData.scorecard);
        const strokeIndex = this.extractStrokeIndexFromScorecard(courseData.scorecard);

        // Validate pars and stroke index
        this.validateParsArray(pars);
        this.validateStrokeIndex(strokeIndex);

        // Check if course exists
        const existingCourseRow = this.findCourseRowByName(courseName);
        let courseId: number;
        let action: "created" | "updated";

        if (existingCourseRow) {
          // Update existing course
          await this.updateHoles(existingCourseRow.id, pars, strokeIndex);
          courseId = existingCourseRow.id;
          action = "updated";
        } else {
          // Create new course
          const newCourse = await this.create({ name: courseName });
          await this.updateHoles(newCourse.id, pars, strokeIndex);
          courseId = newCourse.id;
          action = "created";
        }

        // Process tee ratings
        const existingTees = this.teeService.findByCourse(courseId);
        let teesProcessed = 0;

        for (const teeRating of courseData.tee_ratings) {
          const teeName = teeRating.tee_name.trim();

          // Find existing tee (case-insensitive)
          const existingTee = existingTees.find(
            t => t.name.toLowerCase() === teeName.toLowerCase()
          );

          let teeId: number;

          if (existingTee) {
            // Update existing tee (just update name to match import case)
            const updatedTee = this.teeService.update(existingTee.id, { name: teeName });
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
