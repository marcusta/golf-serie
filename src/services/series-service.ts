import { Database } from "bun:sqlite";
import type { CreateSeriesDto, Series, UpdateSeriesDto } from "../types";

export class SeriesService {
  constructor(private db: Database) {}

  async create(data: CreateSeriesDto): Promise<Series> {
    if (!data.name?.trim()) {
      throw new Error("Series name is required");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO series (name, description, created_at, updated_at)
        VALUES (?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `);

      return stmt.get(data.name, data.description || null) as Series;
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
      SELECT id, name, description, created_at, updated_at 
      FROM series 
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    return stmt.all() as Series[];
  }

  async findById(id: number): Promise<Series | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, description, created_at, updated_at 
      FROM series 
      WHERE id = ?
    `);
    return stmt.get(id) as Series | null;
  }

  async update(id: number, data: UpdateSeriesDto): Promise<Series> {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Series name cannot be empty");
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

      return stmt.get(...values) as Series;
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
      SELECT c.*, co.name as course_name
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
      SELECT id, name, created_at, updated_at
      FROM teams
      WHERE series_id = ?
      ORDER BY name
    `);

    return stmt.all(id);
  }
}
