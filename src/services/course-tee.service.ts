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
import { GOLF } from "../constants/golf";
import { parseStrokeIndex, parseParsArray } from "../utils/parsing";

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

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL) - Pure transformations and validations
  // ─────────────────────────────────────────────────────────────────

  private transformTeeRow(row: CourseTeeRow): CourseTee {
    return {
      id: row.id,
      course_id: row.course_id,
      name: row.name,
      color: row.color || undefined,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
      stroke_index: row.stroke_index ? parseStrokeIndex(row.stroke_index) : undefined,
      pars: row.pars ? parseParsArray(row.pars) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private transformRatingRow(row: CourseTeeRatingRow): CourseTeeRating {
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

  private validateRatingGender(gender: string): void {
    if (!["men", "women"].includes(gender)) {
      throw new Error("Gender must be 'men' or 'women'");
    }
  }

  private validateCourseRating(courseRating: number): void {
    if (courseRating < GOLF.MIN_COURSE_RATING || courseRating > GOLF.MAX_COURSE_RATING) {
      throw new Error(`Course rating must be between ${GOLF.MIN_COURSE_RATING} and ${GOLF.MAX_COURSE_RATING}`);
    }
  }

  private validateSlopeRating(slopeRating: number): void {
    if (slopeRating < GOLF.MIN_SLOPE_RATING || slopeRating > GOLF.MAX_SLOPE_RATING) {
      throw new Error(`Slope rating must be between ${GOLF.MIN_SLOPE_RATING} and ${GOLF.MAX_SLOPE_RATING}`);
    }
  }

  private validateTeeName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Tee name is required");
    }
  }

  private validateTeeNameNotEmpty(name: string | undefined): void {
    if (name !== undefined && !name?.trim()) {
      throw new Error("Tee name cannot be empty");
    }
  }

  private validateStrokeIndexArray(strokeIndex: number[] | undefined | null): void {
    if (strokeIndex !== undefined && strokeIndex !== null) {
      if (!validateStrokeIndex(strokeIndex)) {
        throw new Error(`Stroke index must contain each number from 1-${GOLF.HOLES_PER_ROUND} exactly once`);
      }
    }
  }

  private validateParsArray(pars: number[] | undefined | null): void {
    if (pars !== undefined && pars !== null) {
      if (pars.length !== GOLF.HOLES_PER_ROUND) {
        throw new Error(`Pars must have exactly ${GOLF.HOLES_PER_ROUND} values`);
      }
      if (!pars.every((par) => Number.isInteger(par) && par >= GOLF.MIN_PAR && par <= GOLF.MAX_PAR)) {
        throw new Error(`All pars must be integers between ${GOLF.MIN_PAR} and ${GOLF.MAX_PAR}`);
      }
    }
  }

  private validateRatingsArray(ratings: CreateCourseTeeRatingDto[] | undefined): void {
    if (!ratings) return;
    for (const rating of ratings) {
      this.validateRatingGender(rating.gender);
      this.validateCourseRating(rating.course_rating);
      if (rating.slope_rating !== undefined) {
        this.validateSlopeRating(rating.slope_rating);
      }
    }
  }

  private determineCourseAndSlopeRating(data: CreateCourseTeeDto): { courseRating: number; slopeRating: number } {
    if (data.course_rating !== undefined) {
      return {
        courseRating: data.course_rating,
        slopeRating: data.slope_rating || GOLF.STANDARD_SLOPE_RATING,
      };
    }
    if (data.ratings && data.ratings.length > 0) {
      const mensRating = data.ratings.find((r) => r.gender === "men");
      const firstRating = mensRating || data.ratings[0];
      return {
        courseRating: firstRating.course_rating,
        slopeRating: firstRating.slope_rating || GOLF.STANDARD_SLOPE_RATING,
      };
    }
    throw new Error("Course rating must be provided either directly or via ratings array");
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private findTeeRowById(id: number): CourseTeeRow | null {
    const stmt = this.db.prepare("SELECT * FROM course_tees WHERE id = ?");
    return stmt.get(id) as CourseTeeRow | null;
  }

  private findTeeRowsByCourse(courseId: number): CourseTeeRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tees
      WHERE course_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(courseId) as CourseTeeRow[];
  }

  private findRatingRowsByTee(teeId: number): CourseTeeRatingRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ?
      ORDER BY gender ASC
    `);
    return stmt.all(teeId) as CourseTeeRatingRow[];
  }

  private findRatingRowById(id: number): CourseTeeRatingRow | null {
    const stmt = this.db.prepare("SELECT * FROM course_tee_ratings WHERE id = ?");
    return stmt.get(id) as CourseTeeRatingRow | null;
  }

  private findRatingRowByGender(teeId: number, gender: TeeRatingGender): CourseTeeRatingRow | null {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ? AND gender = ?
    `);
    return stmt.get(teeId, gender) as CourseTeeRatingRow | null;
  }

  private findCourseExists(courseId: number): boolean {
    const stmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
    return stmt.get(courseId) !== null;
  }

  private findDuplicateTee(courseId: number, name: string): boolean {
    const stmt = this.db.prepare("SELECT id FROM course_tees WHERE course_id = ? AND name = ?");
    return stmt.get(courseId, name) !== null;
  }

  private findDuplicateTeeExcluding(courseId: number, name: string, excludeId: number): boolean {
    const stmt = this.db.prepare("SELECT id FROM course_tees WHERE course_id = ? AND name = ? AND id != ?");
    return stmt.get(courseId, name, excludeId) !== null;
  }

  private findCompetitionsByTee(teeId: number): { id: number }[] {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE tee_id = ?");
    return stmt.all(teeId) as { id: number }[];
  }

  private insertTeeRow(
    courseId: number,
    name: string,
    color: string | null,
    courseRating: number,
    slopeRating: number,
    strokeIndex: number[] | null,
    pars: number[] | null
  ): CourseTeeRow {
    const stmt = this.db.prepare(`
      INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating, stroke_index, pars)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      courseId,
      name,
      color,
      courseRating,
      slopeRating,
      strokeIndex ? JSON.stringify(strokeIndex) : null,
      pars ? JSON.stringify(pars) : null
    ) as CourseTeeRow;
  }

  private upsertRatingRow(
    teeId: number,
    gender: TeeRatingGender,
    courseRating: number,
    slopeRating: number
  ): CourseTeeRatingRow {
    const stmt = this.db.prepare(`
      INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tee_id, gender) DO UPDATE SET
        course_rating = excluded.course_rating,
        slope_rating = excluded.slope_rating,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    return stmt.get(teeId, gender, courseRating, slopeRating) as CourseTeeRatingRow;
  }

  private updateRatingRow(id: number, courseRating: number, slopeRating: number): CourseTeeRatingRow {
    const stmt = this.db.prepare(`
      UPDATE course_tee_ratings
      SET course_rating = ?, slope_rating = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(courseRating, slopeRating, id) as CourseTeeRatingRow;
  }

  private deleteRatingRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE id = ?");
    stmt.run(id);
  }

  private deleteRatingRowByGender(teeId: number, gender: TeeRatingGender): void {
    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE tee_id = ? AND gender = ?");
    stmt.run(teeId, gender);
  }

  private updateTeeRow(
    id: number,
    name: string,
    color: string | null,
    courseRating: number,
    slopeRating: number,
    strokeIndex: number[] | null,
    pars: number[] | null
  ): CourseTeeRow {
    const stmt = this.db.prepare(`
      UPDATE course_tees
      SET name = ?, color = ?, course_rating = ?, slope_rating = ?, stroke_index = ?, pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(
      name,
      color,
      courseRating,
      slopeRating,
      strokeIndex ? JSON.stringify(strokeIndex) : null,
      pars ? JSON.stringify(pars) : null,
      id
    ) as CourseTeeRow;
  }

  private deleteTeeRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM course_tees WHERE id = ?");
    stmt.run(id);
  }

  private findTeeRowsByCourseWithDetails(courseId: number): (CourseTeeRow & { course_name: string })[] {
    const stmt = this.db.prepare(`
      SELECT ct.*, c.name as course_name
      FROM course_tees ct
      JOIN courses c ON ct.course_id = c.id
      WHERE ct.course_id = ?
      ORDER BY ct.name ASC
    `);
    return stmt.all(courseId) as (CourseTeeRow & { course_name: string })[];
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  getRatingsForTee(teeId: number): CourseTeeRating[] {
    const rows = this.findRatingRowsByTee(teeId);
    return rows.map((row) => this.transformRatingRow(row));
  }

  getRatingByGender(teeId: number, gender: TeeRatingGender): CourseTeeRating | null {
    const row = this.findRatingRowByGender(teeId, gender);
    return row ? this.transformRatingRow(row) : null;
  }

  getRatingById(id: number): CourseTeeRating | null {
    const row = this.findRatingRowById(id);
    return row ? this.transformRatingRow(row) : null;
  }

  upsertRating(teeId: number, data: CreateCourseTeeRatingDto): CourseTeeRating {
    const teeRow = this.findTeeRowById(teeId);
    if (!teeRow) {
      throw new Error("Tee not found");
    }

    this.validateRatingGender(data.gender);
    this.validateCourseRating(data.course_rating);

    const slopeRating = data.slope_rating || GOLF.STANDARD_SLOPE_RATING;
    this.validateSlopeRating(slopeRating);

    const row = this.upsertRatingRow(teeId, data.gender, data.course_rating, slopeRating);
    return this.transformRatingRow(row);
  }

  updateRating(id: number, data: UpdateCourseTeeRatingDto): CourseTeeRating {
    const ratingRow = this.findRatingRowById(id);
    if (!ratingRow) {
      throw new Error("Rating not found");
    }

    if (data.course_rating !== undefined) {
      this.validateCourseRating(data.course_rating);
    }
    if (data.slope_rating !== undefined) {
      this.validateSlopeRating(data.slope_rating);
    }

    // No changes requested - return existing rating
    if (data.course_rating === undefined && data.slope_rating === undefined) {
      return this.transformRatingRow(ratingRow);
    }

    // Merge with existing values for unchanged fields
    const courseRating = data.course_rating ?? ratingRow.course_rating;
    const slopeRating = data.slope_rating ?? ratingRow.slope_rating;

    const row = this.updateRatingRow(id, courseRating, slopeRating);
    return this.transformRatingRow(row);
  }

  deleteRating(id: number): void {
    const ratingRow = this.findRatingRowById(id);
    if (!ratingRow) {
      throw new Error("Rating not found");
    }
    this.deleteRatingRow(id);
  }

  deleteRatingByGender(teeId: number, gender: TeeRatingGender): void {
    this.deleteRatingRowByGender(teeId, gender);
  }

  findByCourse(courseId: number): CourseTee[] {
    const rows = this.findTeeRowsByCourse(courseId);
    return rows.map((row) => {
      const tee = this.transformTeeRow(row);
      tee.ratings = this.getRatingsForTee(row.id);
      return tee;
    });
  }

  findById(id: number): CourseTee | null {
    const row = this.findTeeRowById(id);
    if (!row) return null;

    const tee = this.transformTeeRow(row);
    tee.ratings = this.getRatingsForTee(row.id);
    return tee;
  }

  create(courseId: number, data: CreateCourseTeeDto): CourseTee {
    // Validate course exists
    if (!this.findCourseExists(courseId)) {
      throw new Error("Course not found");
    }

    // Validate name
    this.validateTeeName(data.name);

    // Check for duplicate name
    if (this.findDuplicateTee(courseId, data.name)) {
      throw new Error("Tee with this name already exists for this course");
    }

    // Determine course rating and slope rating
    const { courseRating, slopeRating } = this.determineCourseAndSlopeRating(data);

    // Validate ratings
    this.validateCourseRating(courseRating);
    this.validateSlopeRating(slopeRating);
    this.validateStrokeIndexArray(data.stroke_index);
    this.validateParsArray(data.pars);
    this.validateRatingsArray(data.ratings);

    // Insert the tee
    const row = this.insertTeeRow(
      courseId,
      data.name.trim(),
      data.color || null,
      courseRating,
      slopeRating,
      data.stroke_index || null,
      data.pars || null
    );

    // Create ratings if provided
    if (data.ratings && data.ratings.length > 0) {
      for (const rating of data.ratings) {
        this.upsertRating(row.id, rating);
      }
    } else if (data.course_rating !== undefined) {
      // Legacy mode: create men's rating from direct values
      this.upsertRating(row.id, {
        gender: "men",
        course_rating: courseRating,
        slope_rating: slopeRating,
      });
    }

    // Fetch the tee with ratings
    return this.findById(row.id)!;
  }

  update(id: number, data: UpdateCourseTeeDto): CourseTee {
    const existingRow = this.findTeeRowById(id);
    if (!existingRow) {
      throw new Error("Tee not found");
    }

    // Validate name if provided
    this.validateTeeNameNotEmpty(data.name);

    // Check for duplicate name if name is being changed
    if (data.name !== undefined && data.name !== existingRow.name) {
      if (this.findDuplicateTeeExcluding(existingRow.course_id, data.name, id)) {
        throw new Error("Tee with this name already exists for this course");
      }
    }

    // Validate ratings if provided
    if (data.course_rating !== undefined) {
      this.validateCourseRating(data.course_rating);
    }
    if (data.slope_rating !== undefined) {
      this.validateSlopeRating(data.slope_rating);
    }
    this.validateStrokeIndexArray(data.stroke_index);
    this.validateParsArray(data.pars);

    // Check if there are any changes
    const hasChanges =
      data.name !== undefined ||
      data.color !== undefined ||
      data.course_rating !== undefined ||
      data.slope_rating !== undefined ||
      data.stroke_index !== undefined ||
      data.pars !== undefined;

    if (!hasChanges) {
      const tee = this.transformTeeRow(existingRow);
      tee.ratings = this.getRatingsForTee(id);
      return tee;
    }

    // Merge with existing values
    const name = data.name !== undefined ? data.name.trim() : existingRow.name;
    const color = data.color !== undefined ? (data.color || null) : existingRow.color;
    const courseRating = data.course_rating ?? existingRow.course_rating;
    const slopeRating = data.slope_rating ?? existingRow.slope_rating;
    const strokeIndex = data.stroke_index !== undefined
      ? data.stroke_index
      : (existingRow.stroke_index ? parseStrokeIndex(existingRow.stroke_index) : null);
    const pars = data.pars !== undefined
      ? data.pars
      : (existingRow.pars ? parseParsArray(existingRow.pars) : null);

    const updatedRow = this.updateTeeRow(id, name, color, courseRating, slopeRating, strokeIndex, pars);

    const tee = this.transformTeeRow(updatedRow);
    tee.ratings = this.getRatingsForTee(id);
    return tee;
  }

  delete(id: number): void {
    const existingRow = this.findTeeRowById(id);
    if (!existingRow) {
      throw new Error("Tee not found");
    }

    const competitions = this.findCompetitionsByTee(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete tee that is used in competitions");
    }

    this.deleteTeeRow(id);
  }

  findByCourseWithDetails(courseId: number): (CourseTee & { course_name: string })[] {
    const rows = this.findTeeRowsByCourseWithDetails(courseId);
    return rows.map((row) => {
      const tee = this.transformTeeRow(row);
      tee.ratings = this.getRatingsForTee(row.id);
      return {
        ...tee,
        course_name: row.course_name,
      };
    });
  }
}

export function createCourseTeeService(db: Database): CourseTeeService {
  return new CourseTeeService(db);
}
