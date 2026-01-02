import { Database } from "bun:sqlite";
import type { SeriesAdmin, SeriesAdminWithUser } from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface UserRoleRow {
  role: string;
}

interface SeriesOwnerRow {
  owner_id: number | null;
}

// ============================================================================
// Service Class
// ============================================================================

export class SeriesAdminService {
  constructor(private db: Database) {}

  // ==========================================================================
  // Query Methods (private, single SQL statement)
  // ==========================================================================

  private findSeriesExists(seriesId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM series WHERE id = ?")
      .get(seriesId);
    return !!result;
  }

  private findUserExists(userId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM users WHERE id = ?")
      .get(userId);
    return !!result;
  }

  private findSeriesAdminExists(seriesId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM series_admins WHERE series_id = ? AND user_id = ? LIMIT 1"
      )
      .get(seriesId, userId);
    return !!result;
  }

  private findUserRole(userId: number): string | null {
    const row = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as UserRoleRow | null;
    return row?.role ?? null;
  }

  private findSeriesOwnerId(seriesId: number): number | null {
    const row = this.db
      .prepare("SELECT owner_id FROM series WHERE id = ?")
      .get(seriesId) as SeriesOwnerRow | null;
    return row?.owner_id ?? null;
  }

  private insertSeriesAdminRow(seriesId: number, userId: number): SeriesAdmin {
    return this.db
      .prepare(
        `
        INSERT INTO series_admins (series_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `
      )
      .get(seriesId, userId) as SeriesAdmin;
  }

  private deleteSeriesAdminRow(seriesId: number, userId: number): number {
    const result = this.db
      .prepare("DELETE FROM series_admins WHERE series_id = ? AND user_id = ?")
      .run(seriesId, userId);
    return result.changes;
  }

  private findSeriesAdminsWithUser(seriesId: number): SeriesAdminWithUser[] {
    return this.db
      .prepare(
        `
        SELECT
          sa.*,
          u.email,
          u.role
        FROM series_admins sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.series_id = ?
        ORDER BY sa.created_at ASC
      `
      )
      .all(seriesId) as SeriesAdminWithUser[];
  }

  private findSeriesForUser(
    userId: number
  ): { series_id: number; series_name: string }[] {
    return this.db
      .prepare(
        `
        SELECT sa.series_id, s.name as series_name
        FROM series_admins sa
        JOIN series s ON sa.series_id = s.id
        WHERE sa.user_id = ?
        ORDER BY s.name ASC
      `
      )
      .all(userId) as { series_id: number; series_name: string }[];
  }

  private findSeriesAdminById(id: number): SeriesAdmin | null {
    return this.db
      .prepare("SELECT * FROM series_admins WHERE id = ?")
      .get(id) as SeriesAdmin | null;
  }

  // ==========================================================================
  // Logic Methods (private, no SQL)
  // ==========================================================================

  private isSuperAdmin(role: string | null): boolean {
    return role === "SUPER_ADMIN";
  }

  // ==========================================================================
  // Public API Methods (orchestration)
  // ==========================================================================

  /**
   * Add a user as an admin for a series
   * Only series owners and SUPER_ADMINs can add series admins
   */
  addSeriesAdmin(seriesId: number, userId: number): SeriesAdmin {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }

    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }

    if (this.findSeriesAdminExists(seriesId, userId)) {
      throw new Error("User is already an admin for this series");
    }

    return this.insertSeriesAdminRow(seriesId, userId);
  }

  /**
   * Remove a user as admin from a series
   */
  removeSeriesAdmin(seriesId: number, userId: number): void {
    const changes = this.deleteSeriesAdminRow(seriesId, userId);
    if (changes === 0) {
      throw new Error("Series admin not found");
    }
  }

  /**
   * Get all admins for a series with user details
   */
  getSeriesAdmins(seriesId: number): SeriesAdminWithUser[] {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }

    return this.findSeriesAdminsWithUser(seriesId);
  }

  /**
   * Check if a user is an admin for a specific series
   */
  isSeriesAdmin(seriesId: number, userId: number): boolean {
    return this.findSeriesAdminExists(seriesId, userId);
  }

  /**
   * Get all series where a user is an admin
   */
  getSeriesForAdmin(userId: number): { series_id: number; series_name: string }[] {
    return this.findSeriesForUser(userId);
  }

  /**
   * Check if a user can manage a series (add/edit competitions, manage content)
   * Returns true if:
   * - User is SUPER_ADMIN
   * - User is the series owner
   * - User is a series admin
   */
  canManageSeries(seriesId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === null) {
      // No owner set - allow if user is series admin
      return this.findSeriesAdminExists(seriesId, userId);
    }

    if (ownerId === userId) {
      return true;
    }

    return this.findSeriesAdminExists(seriesId, userId);
  }

  /**
   * Check if a user can manage series admins (more restrictive than canManageSeries)
   * Only series owners and SUPER_ADMINs can add/remove series admins
   */
  canManageSeriesAdmins(seriesId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === null) {
      return false;
    }

    return ownerId === userId;
  }

  /**
   * Find a series admin by ID
   */
  findById(id: number): SeriesAdmin | null {
    return this.findSeriesAdminById(id);
  }
}

export function createSeriesAdminService(db: Database) {
  return new SeriesAdminService(db);
}
