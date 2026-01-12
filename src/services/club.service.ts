import { Database } from "bun:sqlite";
import type { Club, CreateClubDto, UpdateClubDto } from "../types";

// Raw database row type
interface ClubRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export class ClubService {
  constructor(private db: Database) {}

  // ─────────────────────────────────────────────────────────────────
  // Logic Methods (no SQL)
  // ─────────────────────────────────────────────────────────────────

  private transformClubRow(row: ClubRow): Club {
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private validateClubName(name: string | undefined): void {
    if (!name?.trim()) {
      throw new Error("Club name is required");
    }
  }

  private validateClubNameNotEmpty(name: string | undefined): void {
    if (name !== undefined && !name.trim()) {
      throw new Error("Club name cannot be empty");
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Query Methods (single SQL statement each)
  // ─────────────────────────────────────────────────────────────────

  private insertClubRow(name: string): ClubRow {
    const stmt = this.db.prepare(`
      INSERT INTO clubs (name)
      VALUES (?)
      RETURNING *
    `);
    return stmt.get(name) as ClubRow;
  }

  private findAllClubRows(): ClubRow[] {
    const stmt = this.db.prepare("SELECT * FROM clubs ORDER BY name");
    return stmt.all() as ClubRow[];
  }

  private findClubRowById(id: number): ClubRow | null {
    const stmt = this.db.prepare("SELECT * FROM clubs WHERE id = ?");
    return stmt.get(id) as ClubRow | null;
  }

  private findClubRowByName(name: string): ClubRow | null {
    const stmt = this.db.prepare("SELECT * FROM clubs WHERE LOWER(name) = LOWER(?)");
    return stmt.get(name) as ClubRow | null;
  }

  private updateClubNameRow(id: number, name: string): ClubRow {
    const stmt = this.db.prepare(`
      UPDATE clubs
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id) as ClubRow;
  }

  private findCoursesByClub(clubId: number): { id: number }[] {
    const stmt = this.db.prepare("SELECT id FROM courses WHERE club_id = ?");
    return stmt.all(clubId) as { id: number }[];
  }

  private deleteClubRow(id: number): void {
    const stmt = this.db.prepare("DELETE FROM clubs WHERE id = ?");
    stmt.run(id);
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API Methods (orchestration only)
  // ─────────────────────────────────────────────────────────────────

  async create(data: CreateClubDto): Promise<Club> {
    this.validateClubName(data.name);

    const trimmedName = data.name.trim();

    // Check if club with this name already exists
    const existingClub = this.findClubRowByName(trimmedName);
    if (existingClub) {
      throw new Error(`Club with name "${trimmedName}" already exists`);
    }

    const row = this.insertClubRow(trimmedName);
    return this.transformClubRow(row);
  }

  async findAll(): Promise<Club[]> {
    const rows = this.findAllClubRows();
    return rows.map((row) => this.transformClubRow(row));
  }

  async findById(id: number): Promise<Club | null> {
    const row = this.findClubRowById(id);
    if (!row) return null;
    return this.transformClubRow(row);
  }

  async findByName(name: string): Promise<Club | null> {
    const row = this.findClubRowByName(name);
    if (!row) return null;
    return this.transformClubRow(row);
  }

  async findOrCreate(name: string): Promise<Club> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Club name cannot be empty");
    }

    const existingClub = this.findClubRowByName(trimmedName);
    if (existingClub) {
      return this.transformClubRow(existingClub);
    }

    const row = this.insertClubRow(trimmedName);
    return this.transformClubRow(row);
  }

  async update(id: number, data: UpdateClubDto): Promise<Club> {
    const existingRow = this.findClubRowById(id);
    if (!existingRow) {
      throw new Error("Club not found");
    }

    this.validateClubNameNotEmpty(data.name);

    // No changes requested - return existing club
    if (!data.name) {
      return this.transformClubRow(existingRow);
    }

    const trimmedName = data.name.trim();

    // Check if another club already has this name
    const conflictingClub = this.findClubRowByName(trimmedName);
    if (conflictingClub && conflictingClub.id !== id) {
      throw new Error(`Club with name "${trimmedName}" already exists`);
    }

    const updatedRow = this.updateClubNameRow(id, trimmedName);
    return this.transformClubRow(updatedRow);
  }

  async delete(id: number): Promise<void> {
    const existingRow = this.findClubRowById(id);
    if (!existingRow) {
      throw new Error("Club not found");
    }

    const courses = this.findCoursesByClub(id);
    if (courses.length > 0) {
      throw new Error("Cannot delete club that has courses");
    }

    this.deleteClubRow(id);
  }
}
