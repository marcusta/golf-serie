import { Database } from "bun:sqlite";
import type { Course, CreateCourseDto, UpdateCourseDto } from "../types";

interface ParsData {
  holes: number[];
  out: number;
  in: number;
  total: number;
}

function calculatePars(pars: number[]): ParsData {
  const holes = pars;
  const out = pars.slice(0, 9).reduce((sum, par) => sum + par, 0);
  const in_ = pars.slice(9).reduce((sum, par) => sum + par, 0);
  const total = out + in_;

  return {
    holes,
    out,
    in: in_,
    total,
  };
}

export class CourseService {
  constructor(private db: Database) {}

  async create(data: CreateCourseDto): Promise<Course> {
    if (!data.name?.trim()) {
      throw new Error("Course name is required");
    }

    const stmt = this.db.prepare(`
      INSERT INTO courses (name, pars)
      VALUES (?, ?)
      RETURNING *
    `);

    const course = stmt.get(data.name, JSON.stringify([])) as Course;
    const pars = JSON.parse(course.pars as unknown as string);
    course.pars = calculatePars(pars);
    return course;
  }

  async findAll(): Promise<Course[]> {
    const stmt = this.db.prepare("SELECT * FROM courses");
    const courses = stmt.all() as Course[];
    return courses.map((course) => ({
      ...course,
      pars: calculatePars(JSON.parse(course.pars as unknown as string)),
    }));
  }

  async findById(id: number): Promise<Course | null> {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE id = ?");
    const course = stmt.get(id) as Course | null;

    if (!course) return null;

    const pars = JSON.parse(course.pars as unknown as string);
    return {
      ...course,
      pars: calculatePars(pars),
    };
  }

  async update(id: number, data: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    if (data.name && !data.name.trim()) {
      throw new Error("Course name cannot be empty");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (updates.length === 0) {
      return course;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE courses 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(...values) as Course;
    const pars = JSON.parse(updated.pars as unknown as string);
    return {
      ...updated,
      pars: calculatePars(pars),
    };
  }

  async updateHoles(id: number, pars: number[]): Promise<Course> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    if (pars.length > 18) {
      throw new Error("Course cannot have more than 18 holes");
    }

    if (!pars.every((par) => Number.isInteger(par) && par >= 3 && par <= 6)) {
      throw new Error("All pars must be integers between 3 and 6");
    }

    const stmt = this.db.prepare(`
      UPDATE courses 
      SET pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    const updated = stmt.get(JSON.stringify(pars), id) as Course;
    return {
      ...updated,
      pars: calculatePars(pars),
    };
  }

  async delete(id: number): Promise<void> {
    const course = await this.findById(id);
    if (!course) {
      throw new Error("Course not found");
    }

    // Check if course is used in any competitions
    const competitionsStmt = this.db.prepare(
      "SELECT id FROM competitions WHERE course_id = ?"
    );
    const competitions = competitionsStmt.all(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete course that is used in competitions");
    }

    const stmt = this.db.prepare("DELETE FROM courses WHERE id = ?");
    stmt.run(id);
  }
}
