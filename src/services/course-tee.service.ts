import { Database } from "bun:sqlite";
import type { CourseTee, CreateCourseTeeDto, UpdateCourseTeeDto } from "../types";
import { validateStrokeIndex } from "../utils/handicap";

interface CourseTeeRow {
  id: number;
  course_id: number;
  name: string;
  color: string | null;
  course_rating: number;
  slope_rating: number;
  stroke_index: string | null;
  pars: string | null;
  created_at: string;
  updated_at: string;
}

export class CourseTeeService {
  constructor(private db: Database) {}

  /**
   * Parse a course tee row from the database
   */
  private parseRow(row: CourseTeeRow): CourseTee {
    return {
      id: row.id,
      course_id: row.course_id,
      name: row.name,
      color: row.color || undefined,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
      stroke_index: row.stroke_index ? JSON.parse(row.stroke_index) : undefined,
      pars: row.pars ? JSON.parse(row.pars) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Get all tees for a course
   */
  findByCourse(courseId: number): CourseTee[] {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tees
      WHERE course_id = ?
      ORDER BY name ASC
    `);
    const rows = stmt.all(courseId) as CourseTeeRow[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get a tee by ID
   */
  findById(id: number): CourseTee | null {
    const stmt = this.db.prepare("SELECT * FROM course_tees WHERE id = ?");
    const row = stmt.get(id) as CourseTeeRow | null;
    return row ? this.parseRow(row) : null;
  }

  /**
   * Create a new tee for a course
   */
  create(courseId: number, data: CreateCourseTeeDto): CourseTee {
    // Validate course exists
    const courseStmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
    const course = courseStmt.get(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Validate name
    if (!data.name?.trim()) {
      throw new Error("Tee name is required");
    }

    // Check for duplicate name
    const duplicateStmt = this.db.prepare(
      "SELECT id FROM course_tees WHERE course_id = ? AND name = ?"
    );
    const duplicate = duplicateStmt.get(courseId, data.name);
    if (duplicate) {
      throw new Error("Tee with this name already exists for this course");
    }

    // Validate course rating
    if (data.course_rating === undefined || data.course_rating < 50 || data.course_rating > 90) {
      throw new Error("Course rating must be between 50 and 90");
    }

    // Validate slope rating
    const slopeRating = data.slope_rating || 113;
    if (slopeRating < 55 || slopeRating > 155) {
      throw new Error("Slope rating must be between 55 and 155");
    }

    // Validate stroke index if provided
    if (data.stroke_index && !validateStrokeIndex(data.stroke_index)) {
      throw new Error("Stroke index must contain each number from 1-18 exactly once");
    }

    // Validate pars if provided
    if (data.pars) {
      if (data.pars.length !== 18) {
        throw new Error("Pars must have exactly 18 values");
      }
      if (!data.pars.every((par) => Number.isInteger(par) && par >= 3 && par <= 6)) {
        throw new Error("All pars must be integers between 3 and 6");
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating, stroke_index, pars)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const row = stmt.get(
      courseId,
      data.name.trim(),
      data.color || null,
      data.course_rating,
      slopeRating,
      data.stroke_index ? JSON.stringify(data.stroke_index) : null,
      data.pars ? JSON.stringify(data.pars) : null
    ) as CourseTeeRow;

    return this.parseRow(row);
  }

  /**
   * Update a tee
   */
  update(id: number, data: UpdateCourseTeeDto): CourseTee {
    const tee = this.findById(id);
    if (!tee) {
      throw new Error("Tee not found");
    }

    // Validate name if provided
    if (data.name !== undefined && !data.name?.trim()) {
      throw new Error("Tee name cannot be empty");
    }

    // Check for duplicate name if name is being changed
    if (data.name !== undefined && data.name !== tee.name) {
      const duplicateStmt = this.db.prepare(
        "SELECT id FROM course_tees WHERE course_id = ? AND name = ? AND id != ?"
      );
      const duplicate = duplicateStmt.get(tee.course_id, data.name, id);
      if (duplicate) {
        throw new Error("Tee with this name already exists for this course");
      }
    }

    // Validate course rating if provided
    if (data.course_rating !== undefined && (data.course_rating < 50 || data.course_rating > 90)) {
      throw new Error("Course rating must be between 50 and 90");
    }

    // Validate slope rating if provided
    if (data.slope_rating !== undefined && (data.slope_rating < 55 || data.slope_rating > 155)) {
      throw new Error("Slope rating must be between 55 and 155");
    }

    // Validate stroke index if provided
    if (data.stroke_index !== undefined && data.stroke_index !== null) {
      if (!validateStrokeIndex(data.stroke_index)) {
        throw new Error("Stroke index must contain each number from 1-18 exactly once");
      }
    }

    // Validate pars if provided
    if (data.pars !== undefined && data.pars !== null) {
      if (data.pars.length !== 18) {
        throw new Error("Pars must have exactly 18 values");
      }
      if (!data.pars.every((par) => Number.isInteger(par) && par >= 3 && par <= 6)) {
        throw new Error("All pars must be integers between 3 and 6");
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name.trim());
    }

    if (data.color !== undefined) {
      updates.push("color = ?");
      values.push(data.color || null);
    }

    if (data.course_rating !== undefined) {
      updates.push("course_rating = ?");
      values.push(data.course_rating);
    }

    if (data.slope_rating !== undefined) {
      updates.push("slope_rating = ?");
      values.push(data.slope_rating);
    }

    if (data.stroke_index !== undefined) {
      updates.push("stroke_index = ?");
      values.push(data.stroke_index ? JSON.stringify(data.stroke_index) : null);
    }

    if (data.pars !== undefined) {
      updates.push("pars = ?");
      values.push(data.pars ? JSON.stringify(data.pars) : null);
    }

    if (updates.length === 0) {
      return tee;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE course_tees
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const row = stmt.get(...values) as CourseTeeRow;
    return this.parseRow(row);
  }

  /**
   * Delete a tee
   */
  delete(id: number): void {
    const tee = this.findById(id);
    if (!tee) {
      throw new Error("Tee not found");
    }

    // Check if tee is used in any competitions
    const competitionsStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE tee_id = ?"
    );
    const competitions = competitionsStmt.all(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete tee that is used in competitions");
    }

    const stmt = this.db.prepare("DELETE FROM course_tees WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Get tees for a course with full course information
   */
  findByCourseWithDetails(courseId: number): (CourseTee & { course_name: string })[] {
    const stmt = this.db.prepare(`
      SELECT ct.*, c.name as course_name
      FROM course_tees ct
      JOIN courses c ON ct.course_id = c.id
      WHERE ct.course_id = ?
      ORDER BY ct.name ASC
    `);
    const rows = stmt.all(courseId) as (CourseTeeRow & { course_name: string })[];
    return rows.map((row) => ({
      ...this.parseRow(row),
      course_name: row.course_name,
    }));
  }
}

export function createCourseTeeService(db: Database): CourseTeeService {
  return new CourseTeeService(db);
}
