import { Database } from "bun:sqlite";
import type { CreateTeamDto, Team, UpdateTeamDto } from "../types";

export class TeamService {
  constructor(private db: Database) {}

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private validateTeamName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Team name is required");
    }
  }

  private validateTeamUpdate(data: UpdateTeamDto): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Team name cannot be empty");
    }
  }

  private translateUniqueConstraintError(error: unknown): Error {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return new Error("Team name must be unique");
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private insertTeam(name: string): Team {
    const stmt = this.db.prepare(`
      INSERT INTO teams (name, created_at, updated_at)
      VALUES (?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `);
    return stmt.get(name) as Team;
  }

  private updateTeamRow(id: number, name: string): Team | null {
    const stmt = this.db.prepare(`
      UPDATE teams
      SET name = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id) as Team | null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateTeamDto): Promise<Team> {
    this.validateTeamName(data.name);

    try {
      return this.insertTeam(data.name);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async findAll(): Promise<Team[]> {
    const stmt = this.db.prepare(
      "SELECT id, name, created_at, updated_at FROM teams"
    );
    return stmt.all() as Team[];
  }

  async findById(id: number): Promise<Team | null> {
    const stmt = this.db.prepare(
      "SELECT id, name, created_at, updated_at FROM teams WHERE id = ?"
    );
    return stmt.get(id) as Team | null;
  }

  async update(id: number, data: UpdateTeamDto): Promise<Team> {
    this.validateTeamUpdate(data);

    // No changes requested - return existing team
    if (data.name === undefined) {
      const team = await this.findById(id);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    }

    try {
      const team = this.updateTeamRow(id, data.name);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }
}
