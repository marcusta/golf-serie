import { Database } from "bun:sqlite";
import type { CreateTeamDto, Team, UpdateTeamDto } from "../types";

export class TeamService {
  constructor(private db: Database) {}

  async create(data: CreateTeamDto): Promise<Team> {
    if (!data.name?.trim()) {
      throw new Error("Team name is required");
    }

    // Verify series exists if provided
    if (data.series_id) {
      const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
      const series = seriesStmt.get(data.series_id);
      if (!series) {
        throw new Error("Series not found");
      }
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO teams (name, series_id)
        VALUES (?, ?)
        RETURNING *
      `);

      return stmt.get(data.name, data.series_id || null) as Team;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team name must be unique");
      }
      throw error;
    }
  }

  async findAll(): Promise<Team[]> {
    const stmt = this.db.prepare("SELECT id, name FROM teams");
    return stmt.all() as Team[];
  }

  async findById(id: number): Promise<Team | null> {
    const stmt = this.db.prepare("SELECT id, name FROM teams WHERE id = ?");
    return stmt.get(id) as Team | null;
  }

  async update(id: number, data: UpdateTeamDto): Promise<Team> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Team name cannot be empty");
    }

    // Verify series exists if provided
    if (data.series_id) {
      const seriesStmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
      const series = seriesStmt.get(data.series_id);
      if (!series) {
        throw new Error("Series not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.series_id !== undefined) {
      updates.push("series_id = ?");
      values.push(data.series_id);
    }

    if (updates.length === 0) {
      const team = await this.findById(id);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE teams 
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `);

      const team = stmt.get(...values) as Team | null;
      if (!team) {
        throw new Error("Team not found");
      }

      return team;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("Team name must be unique");
      }
      throw error;
    }
  }
}
