import { Database } from "bun:sqlite";
import type { CompetitionCategoryTee } from "../types";

interface CompetitionCategoryTeeRow {
  id: number;
  competition_id: number;
  category_id: number;
  category_name: string | null;
  tee_id: number;
  tee_name: string | null;
  tee_color: string | null;
  created_at: string;
}

export class CompetitionCategoryTeeService {
  constructor(private db: Database) {}

  /**
   * Get all category-tee mappings for a competition with joined names
   */
  getByCompetition(competitionId: number): CompetitionCategoryTee[] {
    const query = this.db.query<CompetitionCategoryTeeRow, [number]>(`
      SELECT
        cct.id,
        cct.competition_id,
        cct.category_id,
        tc.name as category_name,
        cct.tee_id,
        ct.name as tee_name,
        ct.color as tee_color,
        cct.created_at
      FROM competition_category_tees cct
      JOIN tour_categories tc ON cct.category_id = tc.id
      JOIN course_tees ct ON cct.tee_id = ct.id
      WHERE cct.competition_id = ?
      ORDER BY tc.sort_order, tc.name
    `);

    const rows = query.all(competitionId);
    return rows.map((row) => ({
      id: row.id,
      competition_id: row.competition_id,
      category_id: row.category_id,
      category_name: row.category_name || undefined,
      tee_id: row.tee_id,
      tee_name: row.tee_name || undefined,
      tee_color: row.tee_color || undefined,
      created_at: row.created_at,
    }));
  }

  /**
   * Set/replace all category-tee mappings for a competition
   * This uses an upsert pattern - deletes all existing and inserts new
   */
  setForCompetition(
    competitionId: number,
    mappings: { categoryId: number; teeId: number }[]
  ): CompetitionCategoryTee[] {
    // Validate competition exists and belongs to a tour
    const competition = this.db
      .query<{ id: number; tour_id: number | null; course_id: number }, [number]>(
        "SELECT id, tour_id, course_id FROM competitions WHERE id = ?"
      )
      .get(competitionId);

    if (!competition) {
      throw new Error("Competition not found");
    }

    if (!competition.tour_id) {
      throw new Error("Category-tee mappings are only valid for tour competitions");
    }

    // Validate all categories belong to the tour
    if (mappings.length > 0) {
      const categoryIds = mappings.map((m) => m.categoryId);
      const placeholders = categoryIds.map(() => "?").join(",");
      const validCategories = this.db
        .query<{ id: number }, [number, ...number[]]>(
          `SELECT id FROM tour_categories WHERE tour_id = ? AND id IN (${placeholders})`
        )
        .all(competition.tour_id, ...categoryIds);

      const validCategoryIds = new Set(validCategories.map((c) => c.id));
      for (const mapping of mappings) {
        if (!validCategoryIds.has(mapping.categoryId)) {
          throw new Error(`Category ${mapping.categoryId} does not belong to this tour`);
        }
      }

      // Validate all tees belong to the competition's course
      const teeIds = mappings.map((m) => m.teeId);
      const teePlaceholders = teeIds.map(() => "?").join(",");
      const validTees = this.db
        .query<{ id: number }, [number, ...number[]]>(
          `SELECT id FROM course_tees WHERE course_id = ? AND id IN (${teePlaceholders})`
        )
        .all(competition.course_id, ...teeIds);

      const validTeeIds = new Set(validTees.map((t) => t.id));
      for (const mapping of mappings) {
        if (!validTeeIds.has(mapping.teeId)) {
          throw new Error(`Tee ${mapping.teeId} does not belong to the competition's course`);
        }
      }
    }

    // Delete existing mappings
    this.db
      .query("DELETE FROM competition_category_tees WHERE competition_id = ?")
      .run(competitionId);

    // Insert new mappings
    if (mappings.length > 0) {
      const insertStmt = this.db.prepare(
        "INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)"
      );

      for (const mapping of mappings) {
        insertStmt.run(competitionId, mapping.categoryId, mapping.teeId);
      }
    }

    // Return the updated mappings
    return this.getByCompetition(competitionId);
  }

  /**
   * Delete all category-tee mappings for a competition
   * Note: This is also handled by CASCADE when competition is deleted
   */
  deleteForCompetition(competitionId: number): void {
    this.db
      .query("DELETE FROM competition_category_tees WHERE competition_id = ?")
      .run(competitionId);
  }

  /**
   * Get the tee_id for a specific category in a competition
   * Returns null if no mapping exists
   */
  getTeeForCategory(competitionId: number, categoryId: number): number | null {
    const result = this.db
      .query<{ tee_id: number }, [number, number]>(
        "SELECT tee_id FROM competition_category_tees WHERE competition_id = ? AND category_id = ?"
      )
      .get(competitionId, categoryId);

    return result?.tee_id || null;
  }
}
