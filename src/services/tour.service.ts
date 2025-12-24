import { Database } from "bun:sqlite";

export type Tour = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  enrollment_mode: string;
  visibility: string;
  banner_image_url: string | null;
  landing_document_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateTourInput = {
  name: string;
  description?: string;
  banner_image_url?: string;
};

export type UpdateTourInput = {
  name?: string;
  description?: string;
  banner_image_url?: string | null;
  landing_document_id?: number | null;
};

export type TourStanding = {
  player_id: number;
  player_name: string;
  total_points: number;
  competitions_played: number;
};

export class TourService {
  constructor(private db: Database) {}

  findAll(): Tour[] {
    return this.db
      .prepare("SELECT * FROM tours ORDER BY name ASC")
      .all() as Tour[];
  }

  findById(id: number): Tour | null {
    return this.db
      .prepare("SELECT * FROM tours WHERE id = ?")
      .get(id) as Tour | null;
  }

  create(data: CreateTourInput, ownerId: number): Tour {
    const result = this.db
      .prepare(
        `
      INSERT INTO tours (name, description, owner_id, banner_image_url)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(
        data.name,
        data.description || null,
        ownerId,
        data.banner_image_url || null
      ) as Tour;

    return result;
  }

  update(id: number, data: UpdateTourInput): Tour {
    const tour = this.findById(id);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Validate landing_document_id if provided
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      const documentStmt = this.db.prepare(`
        SELECT id, tour_id FROM tour_documents WHERE id = ?
      `);
      const document = documentStmt.get(data.landing_document_id) as { id: number; tour_id: number } | undefined;

      if (!document) {
        throw new Error("Landing document not found");
      }

      if (document.tour_id !== id) {
        throw new Error("Landing document must belong to the same tour");
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }

    if (data.banner_image_url !== undefined) {
      updates.push("banner_image_url = ?");
      values.push(data.banner_image_url);
    }

    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }

    if (updates.length === 0) {
      return tour;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result = this.db
      .prepare(
        `
      UPDATE tours
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `
      )
      .get(...values) as Tour;

    return result;
  }

  delete(id: number): void {
    const result = this.db.prepare("DELETE FROM tours WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Tour not found");
    }
  }

  getCompetitions(tourId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT c.* 
      FROM competitions c
      WHERE c.tour_id = ?
      ORDER BY c.date DESC
    `
      )
      .all(tourId) as any[];
  }

  getStandings(tourId: number): TourStanding[] {
    // Get all competitions in this tour
    const competitions = this.getCompetitions(tourId);
    
    if (competitions.length === 0) {
      return [];
    }

    // Aggregate points per player across all competitions
    // This is a simplified version - in a real implementation, we'd need to:
    // 1. Get participants for each competition
    // 2. Calculate their position/rank
    // 3. Look up points from the point template
    // 4. Sum up points per player
    
    // For now, return empty array as we need more complex logic
    // that depends on competition results and point templates
    try {
      const standings = this.db
        .prepare(
          `
        SELECT 
          p.player_id,
          pl.name as player_name,
          COUNT(DISTINCT p.competition_id) as competitions_played,
          0 as total_points
        FROM participants p
        JOIN players pl ON p.player_id = pl.id
        JOIN competitions c ON p.competition_id = c.id
        WHERE c.tour_id = ? AND p.player_id IS NOT NULL
        GROUP BY p.player_id, pl.name
        ORDER BY total_points DESC, player_name ASC
      `
        )
        .all(tourId) as TourStanding[];

      return standings;
    } catch (error) {
      // If player_id column doesn't exist yet, return empty array
      console.warn("Error fetching tour standings:", error);
      return [];
    }
  }
}

export function createTourService(db: Database) {
  return new TourService(db);
}
