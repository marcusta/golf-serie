import { Database } from "bun:sqlite";
import type {
  TourCategory,
  TourCategoryWithCount,
  CreateTourCategoryDto,
  UpdateTourCategoryDto,
} from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface MaxOrderRow {
  max_order: number;
}

interface EnrollmentTourRow {
  id: number;
  tour_id: number;
}

interface EnrollmentByCategoryRow {
  id: number;
  player_id: number | null;
  email: string;
  player_name: string | null;
}

// ============================================================================
// Service Class
// ============================================================================

export class TourCategoryService {
  constructor(private db: Database) {}

  // ==========================================================================
  // Query Methods (private, single SQL statement)
  // ==========================================================================

  private findTourExists(tourId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM tours WHERE id = ?")
      .get(tourId);
    return !!result;
  }

  private findCategoryByTourAndName(
    tourId: number,
    name: string
  ): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) LIMIT 1"
      )
      .get(tourId, name);
    return !!result;
  }

  private findCategoryByTourAndNameExcluding(
    tourId: number,
    name: string,
    excludeId: number
  ): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) AND id != ? LIMIT 1"
      )
      .get(tourId, name, excludeId);
    return !!result;
  }

  private findMaxSortOrder(tourId: number): number {
    const row = this.db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM tour_categories WHERE tour_id = ?"
      )
      .get(tourId) as MaxOrderRow;
    return row.max_order;
  }

  private insertCategoryRow(
    tourId: number,
    name: string,
    description: string | null,
    sortOrder: number
  ): TourCategory {
    return this.db
      .prepare(
        `
        INSERT INTO tour_categories (tour_id, name, description, sort_order)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `
      )
      .get(tourId, name, description, sortOrder) as TourCategory;
  }

  private updateCategoryRow(
    id: number,
    name: string | null,
    description: string | null,
    sortOrder: number | null
  ): TourCategory {
    return this.db
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
      .get(name, description, sortOrder, id) as TourCategory;
  }

  private deleteCategoryRow(id: number): void {
    this.db.prepare("DELETE FROM tour_categories WHERE id = ?").run(id);
  }

  private findCategoryById(id: number): TourCategory | null {
    return this.db
      .prepare("SELECT * FROM tour_categories WHERE id = ?")
      .get(id) as TourCategory | null;
  }

  private findCategoriesByTourWithCount(
    tourId: number
  ): TourCategoryWithCount[] {
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

  private updateCategorySortOrder(id: number, sortOrder: number): void {
    this.db
      .prepare("UPDATE tour_categories SET sort_order = ? WHERE id = ?")
      .run(sortOrder, id);
  }

  private findEnrollmentTourId(enrollmentId: number): number | null {
    const row = this.db
      .prepare("SELECT tour_id FROM tour_enrollments WHERE id = ?")
      .get(enrollmentId) as { tour_id: number } | null;
    return row?.tour_id ?? null;
  }

  private updateEnrollmentCategory(
    enrollmentId: number,
    categoryId: number | null
  ): void {
    this.db
      .prepare("UPDATE tour_enrollments SET category_id = ? WHERE id = ?")
      .run(categoryId, enrollmentId);
  }

  private findEnrollmentsByIds(
    enrollmentIds: number[]
  ): EnrollmentTourRow[] {
    const placeholders = enrollmentIds.map(() => "?").join(",");
    return this.db
      .prepare(
        `SELECT id, tour_id FROM tour_enrollments WHERE id IN (${placeholders})`
      )
      .all(...enrollmentIds) as EnrollmentTourRow[];
  }

  private updateEnrollmentsCategory(
    enrollmentIds: number[],
    categoryId: number | null
  ): number {
    const placeholders = enrollmentIds.map(() => "?").join(",");
    const result = this.db
      .prepare(
        `UPDATE tour_enrollments SET category_id = ? WHERE id IN (${placeholders})`
      )
      .run(categoryId, ...enrollmentIds);
    return result.changes;
  }

  private findEnrollmentsByCategory(
    categoryId: number
  ): EnrollmentByCategoryRow[] {
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
      .all(categoryId) as EnrollmentByCategoryRow[];
  }

  // ==========================================================================
  // Logic Methods (private, no SQL)
  // ==========================================================================

  private validateCategoriesInTour(
    categoryIds: number[],
    validCategoryIds: Set<number>
  ): void {
    for (const id of categoryIds) {
      if (!validCategoryIds.has(id)) {
        throw new Error(`Category ${id} does not belong to this tour`);
      }
    }
  }

  private validateAllEnrollmentsSameTour(
    enrollments: EnrollmentTourRow[],
    expectedCount: number
  ): number {
    if (enrollments.length !== expectedCount) {
      throw new Error("One or more enrollments not found");
    }

    const tourIds = new Set(enrollments.map((e) => e.tour_id));
    if (tourIds.size > 1) {
      throw new Error("All enrollments must belong to the same tour");
    }

    return enrollments[0].tour_id;
  }

  // ==========================================================================
  // Public API Methods (orchestration)
  // ==========================================================================

  /**
   * Create a new category for a tour
   */
  create(tourId: number, data: CreateTourCategoryDto): TourCategory {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    if (this.findCategoryByTourAndName(tourId, data.name)) {
      throw new Error("A category with this name already exists in this tour");
    }

    const sortOrder =
      data.sort_order ?? this.findMaxSortOrder(tourId) + 1;

    return this.insertCategoryRow(
      tourId,
      data.name,
      data.description ?? null,
      sortOrder
    );
  }

  /**
   * Update a category
   */
  update(id: number, data: UpdateTourCategoryDto): TourCategory {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }

    const isNameChanging =
      data.name && data.name.toLowerCase() !== existing.name.toLowerCase();

    if (isNameChanging) {
      const isDuplicate = this.findCategoryByTourAndNameExcluding(
        existing.tour_id,
        data.name!,
        id
      );
      if (isDuplicate) {
        throw new Error("A category with this name already exists in this tour");
      }
    }

    return this.updateCategoryRow(
      id,
      data.name ?? null,
      data.description ?? null,
      data.sort_order ?? null
    );
  }

  /**
   * Delete a category (sets category_id to NULL on enrollments)
   */
  delete(id: number): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }

    this.deleteCategoryRow(id);
  }

  /**
   * Get a category by ID
   */
  findById(id: number): TourCategory | null {
    return this.findCategoryById(id);
  }

  /**
   * Get all categories for a tour with enrollment counts
   */
  findByTour(tourId: number): TourCategoryWithCount[] {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    return this.findCategoriesByTourWithCount(tourId);
  }

  /**
   * Reorder categories within a tour
   * @param tourId The tour ID
   * @param categoryIds Array of category IDs in the desired order
   */
  reorder(tourId: number, categoryIds: number[]): void {
    const categories = this.findByTour(tourId);
    const validCategoryIds = new Set(categories.map((c) => c.id));

    this.validateCategoriesInTour(categoryIds, validCategoryIds);

    for (let i = 0; i < categoryIds.length; i++) {
      this.updateCategorySortOrder(categoryIds[i], i);
    }
  }

  /**
   * Assign a category to an enrollment
   */
  assignToEnrollment(enrollmentId: number, categoryId: number | null): void {
    const enrollmentTourId = this.findEnrollmentTourId(enrollmentId);
    if (enrollmentTourId === null) {
      throw new Error("Enrollment not found");
    }

    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== enrollmentTourId) {
        throw new Error("Category does not belong to the same tour as the enrollment");
      }
    }

    this.updateEnrollmentCategory(enrollmentId, categoryId);
  }

  /**
   * Bulk assign category to multiple enrollments
   */
  bulkAssign(enrollmentIds: number[], categoryId: number | null): number {
    if (enrollmentIds.length === 0) {
      return 0;
    }

    const enrollments = this.findEnrollmentsByIds(enrollmentIds);
    const tourId = this.validateAllEnrollmentsSameTour(
      enrollments,
      enrollmentIds.length
    );

    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== tourId) {
        throw new Error("Category does not belong to the same tour as the enrollments");
      }
    }

    return this.updateEnrollmentsCategory(enrollmentIds, categoryId);
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

    return this.findEnrollmentsByCategory(categoryId);
  }
}

export function createTourCategoryService(db: Database) {
  return new TourCategoryService(db);
}
