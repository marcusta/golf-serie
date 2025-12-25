import { Database } from "bun:sqlite";
import type {
  CourseTee,
  CourseTeeRating,
  CreateCourseTeeDto,
  CreateCourseTeeRatingDto,
  TeeRatingGender,
  UpdateCourseTeeDto,
  UpdateCourseTeeRatingDto,
} from "../types";
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

interface CourseTeeRatingRow {
  id: number;
  tee_id: number;
  gender: TeeRatingGender;
  course_rating: number;
  slope_rating: number;
  created_at: string;
  updated_at: string;
}

export class CourseTeeService {
  constructor(private db: Database) {}

  /**
   * Parse a course tee row from the database
   */
  private parseRow(row: CourseTeeRow, includeRatings = true): CourseTee {
    const tee: CourseTee = {
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

    if (includeRatings) {
      tee.ratings = this.getRatingsForTee(row.id);
    }

    return tee;
  }

  /**
   * Parse a rating row from the database
   */
  private parseRatingRow(row: CourseTeeRatingRow): CourseTeeRating {
    return {
      id: row.id,
      tee_id: row.tee_id,
      gender: row.gender,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Get all ratings for a tee
   */
  getRatingsForTee(teeId: number): CourseTeeRating[] {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ?
      ORDER BY gender ASC
    `);
    const rows = stmt.all(teeId) as CourseTeeRatingRow[];
    return rows.map((row) => this.parseRatingRow(row));
  }

  /**
   * Get rating for a tee by gender
   */
  getRatingByGender(teeId: number, gender: TeeRatingGender): CourseTeeRating | null {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ? AND gender = ?
    `);
    const row = stmt.get(teeId, gender) as CourseTeeRatingRow | null;
    return row ? this.parseRatingRow(row) : null;
  }

  /**
   * Get rating by ID
   */
  getRatingById(id: number): CourseTeeRating | null {
    const stmt = this.db.prepare("SELECT * FROM course_tee_ratings WHERE id = ?");
    const row = stmt.get(id) as CourseTeeRatingRow | null;
    return row ? this.parseRatingRow(row) : null;
  }

  /**
   * Add or update a rating for a tee
   */
  upsertRating(teeId: number, data: CreateCourseTeeRatingDto): CourseTeeRating {
    // Validate tee exists
    const tee = this.findById(teeId);
    if (!tee) {
      throw new Error("Tee not found");
    }

    // Validate gender
    if (!["men", "women"].includes(data.gender)) {
      throw new Error("Gender must be 'men' or 'women'");
    }

    // Validate course rating
    if (data.course_rating < 50 || data.course_rating > 90) {
      throw new Error("Course rating must be between 50 and 90");
    }

    // Validate slope rating
    const slopeRating = data.slope_rating || 113;
    if (slopeRating < 55 || slopeRating > 155) {
      throw new Error("Slope rating must be between 55 and 155");
    }

    // Use INSERT OR REPLACE to upsert
    const stmt = this.db.prepare(`
      INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tee_id, gender) DO UPDATE SET
        course_rating = excluded.course_rating,
        slope_rating = excluded.slope_rating,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    const row = stmt.get(teeId, data.gender, data.course_rating, slopeRating) as CourseTeeRatingRow;
    return this.parseRatingRow(row);
  }

  /**
   * Update a rating
   */
  updateRating(id: number, data: UpdateCourseTeeRatingDto): CourseTeeRating {
    const rating = this.getRatingById(id);
    if (!rating) {
      throw new Error("Rating not found");
    }

    // Validate course rating if provided
    if (data.course_rating !== undefined && (data.course_rating < 50 || data.course_rating > 90)) {
      throw new Error("Course rating must be between 50 and 90");
    }

    // Validate slope rating if provided
    if (data.slope_rating !== undefined && (data.slope_rating < 55 || data.slope_rating > 155)) {
      throw new Error("Slope rating must be between 55 and 155");
    }

    const updates: string[] = [];
    const values: (number | null)[] = [];

    if (data.course_rating !== undefined) {
      updates.push("course_rating = ?");
      values.push(data.course_rating);
    }

    if (data.slope_rating !== undefined) {
      updates.push("slope_rating = ?");
      values.push(data.slope_rating);
    }

    if (updates.length === 0) {
      return rating;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE course_tee_ratings
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const row = stmt.get(...values) as CourseTeeRatingRow;
    return this.parseRatingRow(row);
  }

  /**
   * Delete a rating
   */
  deleteRating(id: number): void {
    const rating = this.getRatingById(id);
    if (!rating) {
      throw new Error("Rating not found");
    }

    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Delete all ratings for a gender from a tee
   */
  deleteRatingByGender(teeId: number, gender: TeeRatingGender): void {
    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE tee_id = ? AND gender = ?");
    stmt.run(teeId, gender);
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
   *
   * Supports two modes:
   * 1. Legacy: Provide course_rating/slope_rating directly (creates men's rating)
   * 2. New: Provide ratings array with gender-specific ratings
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

    // Determine course rating and slope rating
    // Priority: explicit values > first rating in array > error
    let courseRating: number;
    let slopeRating: number;

    if (data.course_rating !== undefined) {
      courseRating = data.course_rating;
      slopeRating = data.slope_rating || 113;
    } else if (data.ratings && data.ratings.length > 0) {
      // Use men's rating if available, otherwise first rating
      const mensRating = data.ratings.find((r) => r.gender === "men");
      const firstRating = mensRating || data.ratings[0];
      courseRating = firstRating.course_rating;
      slopeRating = firstRating.slope_rating || 113;
    } else {
      throw new Error("Course rating must be provided either directly or via ratings array");
    }

    // Validate course rating
    if (courseRating < 50 || courseRating > 90) {
      throw new Error("Course rating must be between 50 and 90");
    }

    // Validate slope rating
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

    // Validate ratings array if provided
    if (data.ratings) {
      for (const rating of data.ratings) {
        if (!["men", "women"].includes(rating.gender)) {
          throw new Error("Rating gender must be 'men' or 'women'");
        }
        if (rating.course_rating < 50 || rating.course_rating > 90) {
          throw new Error(`Course rating for ${rating.gender} must be between 50 and 90`);
        }
        if (rating.slope_rating !== undefined && (rating.slope_rating < 55 || rating.slope_rating > 155)) {
          throw new Error(`Slope rating for ${rating.gender} must be between 55 and 155`);
        }
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
      courseRating,
      slopeRating,
      data.stroke_index ? JSON.stringify(data.stroke_index) : null,
      data.pars ? JSON.stringify(data.pars) : null
    ) as CourseTeeRow;

    const tee = this.parseRow(row, false); // Don't include ratings yet, we'll add them

    // Create ratings if provided
    if (data.ratings && data.ratings.length > 0) {
      for (const rating of data.ratings) {
        this.upsertRating(tee.id, rating);
      }
    } else if (data.course_rating !== undefined) {
      // Legacy mode: create men's rating from direct values
      this.upsertRating(tee.id, {
        gender: "men",
        course_rating: courseRating,
        slope_rating: slopeRating,
      });
    }

    // Fetch the tee with ratings
    return this.findById(tee.id)!;
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
