import { Database } from "bun:sqlite";
import type { CompetitionGuest, CreateCompetitionGuestDto } from "../types";

interface CompetitionGuestRow {
  id: number;
  competition_id: number;
  name: string;
  handicap_index: number | null;
  created_at: string;
}

export class CompetitionGuestService {
  constructor(private db: Database) {}

  private transform(row: CompetitionGuestRow): CompetitionGuest {
    return {
      id: row.id,
      competition_id: row.competition_id,
      name: row.name,
      handicap_index: row.handicap_index,
      created_at: row.created_at,
    };
  }

  private competitionExists(competitionId: number): boolean {
    return (
      this.db
        .prepare("SELECT id FROM competitions WHERE id = ?")
        .get(competitionId) != null
    );
  }

  findAllForCompetition(competitionId: number): CompetitionGuest[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM competition_guests WHERE competition_id = ? ORDER BY name COLLATE NOCASE"
      )
      .all(competitionId) as CompetitionGuestRow[];
    return rows.map((row) => this.transform(row));
  }

  findById(id: number): CompetitionGuest | null {
    const row = this.db
      .prepare("SELECT * FROM competition_guests WHERE id = ?")
      .get(id) as CompetitionGuestRow | null;
    return row ? this.transform(row) : null;
  }

  create(
    competitionId: number,
    data: CreateCompetitionGuestDto
  ): CompetitionGuest {
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Guest name is required");
    }
    if (!this.competitionExists(competitionId)) {
      throw new Error("Competition not found");
    }

    const duplicate = this.db
      .prepare(
        "SELECT id FROM competition_guests WHERE competition_id = ? AND name = ? COLLATE NOCASE"
      )
      .get(competitionId, name);
    if (duplicate) {
      throw new Error("A guest with this name already exists");
    }

    const handicapIndex =
      data.handicap_index === undefined || data.handicap_index === null
        ? null
        : Number(data.handicap_index);
    if (handicapIndex !== null && !Number.isFinite(handicapIndex)) {
      throw new Error("Handicap must be a number");
    }

    const row = this.db
      .prepare(
        `INSERT INTO competition_guests (competition_id, name, handicap_index)
         VALUES (?, ?, ?)
         RETURNING *`
      )
      .get(competitionId, name, handicapIndex) as CompetitionGuestRow;
    return this.transform(row);
  }

  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Guest not found");
    }
    this.db.prepare("DELETE FROM competition_guests WHERE id = ?").run(id);
  }
}
