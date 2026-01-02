import { Database } from "bun:sqlite";
import type { Course, CreateCourseDto, UpdateCourseDto } from "../types";
import { GOLF } from "../constants/golf";
import { parseParsArray } from "../utils/parsing";

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
  constructor(private db: Database) {}

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
}
