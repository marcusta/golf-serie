import { Database } from "bun:sqlite";
import type {
  TourCategory,
  TourCategoryWithCount,
  CreateTourCategoryDto,
  UpdateTourCategoryDto,
} from "../types";

export class TourCategoryService {
  constructor(private db: Database) {}

  /**
   * Create a new category for a tour
   */
  create(tourId: number, data: CreateTourCategoryDto): TourCategory {
    // Validate tour exists
    const tour = this.db
      .prepare("SELECT id FROM tours WHERE id = ?")
      .get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Check for duplicate name in this tour
    const existing = this.db
      .prepare(
        "SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) LIMIT 1"
      )
      .get(tourId, data.name);
    if (existing) {
      throw new Error("A category with this name already exists in this tour");
    }

    // Get the next sort_order if not provided
    let sortOrder = data.sort_order;
    if (sortOrder === undefined) {
      const maxOrder = this.db
        .prepare(
          "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM tour_categories WHERE tour_id = ?"
        )
        .get(tourId) as { max_order: number };
      sortOrder = maxOrder.max_order + 1;
    }

    const result = this.db
      .prepare(
        `
        INSERT INTO tour_categories (tour_id, name, description, sort_order)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `
      )
      .get(tourId, data.name, data.description ?? null, sortOrder) as TourCategory;

    return result;
  }

  /**
   * Update a category
   */
  update(id: number, data: UpdateTourCategoryDto): TourCategory {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = this.db
        .prepare(
          "SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) AND id != ? LIMIT 1"
        )
        .get(existing.tour_id, data.name, id);
      if (duplicate) {
        throw new Error("A category with this name already exists in this tour");
      }
    }

    const result = this.db
      .prepare(
        `
        UPDATE tour_categories
        SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order)
        WHERE id = ?
        RETURNING *
      `
      )
      .get(
        data.name ?? null,
        data.description ?? null,
        data.sort_order ?? null,
        id
      ) as TourCategory;

    return result;
  }

  /**
   * Delete a category (sets category_id to NULL on enrollments)
   */
  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }

    // The FK constraint with ON DELETE SET NULL will handle enrollments
    this.db.prepare("DELETE FROM tour_categories WHERE id = ?").run(id);
  }

  /**
   * Get a category by ID
   */
  findById(id: number): TourCategory | null {
    return this.db
      .prepare("SELECT * FROM tour_categories WHERE id = ?")
      .get(id) as TourCategory | null;
  }

  /**
   * Get all categories for a tour with enrollment counts
   */
  findByTour(tourId: number): TourCategoryWithCount[] {
    // Validate tour exists
    const tour = this.db
      .prepare("SELECT id FROM tours WHERE id = ?")
      .get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    return this.db
      .prepare(
        `
        SELECT
          tc.*,
          (SELECT COUNT(*) FROM tour_enrollments WHERE category_id = tc.id) as enrollment_count
        FROM tour_categories tc
        WHERE tc.tour_id = ?
        ORDER BY tc.sort_order ASC, tc.name ASC
      `
      )
      .all(tourId) as TourCategoryWithCount[];
  }

  /**
   * Reorder categories within a tour
   * @param tourId The tour ID
   * @param categoryIds Array of category IDs in the desired order
   */
  reorder(tourId: number, categoryIds: number[]): void {
    // Validate all categories belong to the tour
    const categories = this.findByTour(tourId);
    const categoryIdSet = new Set(categories.map((c) => c.id));

    for (const id of categoryIds) {
      if (!categoryIdSet.has(id)) {
        throw new Error(`Category ${id} does not belong to this tour`);
      }
    }

    // Update sort_order for each category
    const stmt = this.db.prepare(
      "UPDATE tour_categories SET sort_order = ? WHERE id = ?"
    );

    for (let i = 0; i < categoryIds.length; i++) {
      stmt.run(i, categoryIds[i]);
    }
  }

  /**
   * Assign a category to an enrollment
   */
  assignToEnrollment(enrollmentId: number, categoryId: number | null): void {
    // Validate enrollment exists
    const enrollment = this.db
      .prepare("SELECT tour_id FROM tour_enrollments WHERE id = ?")
      .get(enrollmentId) as { tour_id: number } | null;
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // If categoryId is provided, validate it belongs to the same tour
    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== enrollment.tour_id) {
        throw new Error("Category does not belong to the same tour as the enrollment");
      }
    }

    this.db
      .prepare("UPDATE tour_enrollments SET category_id = ? WHERE id = ?")
      .run(categoryId, enrollmentId);
  }

  /**
   * Bulk assign category to multiple enrollments
   */
  bulkAssign(enrollmentIds: number[], categoryId: number | null): number {
    if (enrollmentIds.length === 0) {
      return 0;
    }

    // Get all enrollments and validate they exist and belong to the same tour
    const placeholders = enrollmentIds.map(() => "?").join(",");
    const enrollments = this.db
      .prepare(
        `SELECT id, tour_id FROM tour_enrollments WHERE id IN (${placeholders})`
      )
      .all(...enrollmentIds) as { id: number; tour_id: number }[];

    if (enrollments.length !== enrollmentIds.length) {
      throw new Error("One or more enrollments not found");
    }

    // Validate all enrollments belong to the same tour
    const tourIds = new Set(enrollments.map((e) => e.tour_id));
    if (tourIds.size > 1) {
      throw new Error("All enrollments must belong to the same tour");
    }

    const tourId = enrollments[0].tour_id;

    // Validate category if provided
    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== tourId) {
        throw new Error("Category does not belong to the same tour as the enrollments");
      }
    }

    // Update all enrollments
    const result = this.db
      .prepare(
        `UPDATE tour_enrollments SET category_id = ? WHERE id IN (${placeholders})`
      )
      .run(categoryId, ...enrollmentIds);

    return result.changes;
  }

  /**
   * Get enrollments by category
   */
  getEnrollmentsByCategory(categoryId: number): {
    id: number;
    player_id: number | null;
    email: string;
    player_name: string | null;
  }[] {
    const category = this.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return this.db
      .prepare(
        `
        SELECT
          te.id,
          te.player_id,
          te.email,
          p.name as player_name
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        WHERE te.category_id = ?
        ORDER BY COALESCE(p.name, te.email) ASC
      `
      )
      .all(categoryId) as {
      id: number;
      player_id: number | null;
      email: string;
      player_name: string | null;
    }[];
  }
}

export function createTourCategoryService(db: Database) {
  return new TourCategoryService(db);
}
