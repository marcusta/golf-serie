import { Database } from "bun:sqlite";
import type { TourAdmin, TourAdminWithUser } from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface UserRoleRow {
  role: string;
}

interface TourOwnerRow {
  owner_id: number;
}

// ============================================================================
// Service Class
// ============================================================================

export class TourAdminService {
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

  private findUserExists(userId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM users WHERE id = ?")
      .get(userId);
    return !!result;
  }

  private findTourAdminExists(tourId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);
    return !!result;
  }

  private findUserRole(userId: number): string | null {
    const row = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as UserRoleRow | null;
    return row?.role ?? null;
  }

  private findTourOwnerId(tourId: number): number | null {
    const row = this.db
      .prepare("SELECT owner_id FROM tours WHERE id = ?")
      .get(tourId) as TourOwnerRow | null;
    return row?.owner_id ?? null;
  }

  private insertTourAdminRow(tourId: number, userId: number): TourAdmin {
    return this.db
      .prepare(
        `
        INSERT INTO tour_admins (tour_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `
      )
      .get(tourId, userId) as TourAdmin;
  }

  private deleteTourAdminRow(tourId: number, userId: number): number {
    const result = this.db
      .prepare("DELETE FROM tour_admins WHERE tour_id = ? AND user_id = ?")
      .run(tourId, userId);
    return result.changes;
  }

  private findTourAdminsWithUser(tourId: number): TourAdminWithUser[] {
    return this.db
      .prepare(
        `
        SELECT
          ta.*,
          u.email,
          u.role
        FROM tour_admins ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.tour_id = ?
        ORDER BY ta.created_at ASC
      `
      )
      .all(tourId) as TourAdminWithUser[];
  }

  private findToursForUser(
    userId: number
  ): { tour_id: number; tour_name: string }[] {
    return this.db
      .prepare(
        `
        SELECT ta.tour_id, t.name as tour_name
        FROM tour_admins ta
        JOIN tours t ON ta.tour_id = t.id
        WHERE ta.user_id = ?
        ORDER BY t.name ASC
      `
      )
      .all(userId) as { tour_id: number; tour_name: string }[];
  }

  private findTourAdminById(id: number): TourAdmin | null {
    return this.db
      .prepare("SELECT * FROM tour_admins WHERE id = ?")
      .get(id) as TourAdmin | null;
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
   * Add a user as an admin for a tour
   * Only tour owners and SUPER_ADMINs can add tour admins
   */
  addTourAdmin(tourId: number, userId: number): TourAdmin {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }

    if (this.findTourAdminExists(tourId, userId)) {
      throw new Error("User is already an admin for this tour");
    }

    return this.insertTourAdminRow(tourId, userId);
  }

  /**
   * Remove a user as admin from a tour
   */
  removeTourAdmin(tourId: number, userId: number): void {
    const changes = this.deleteTourAdminRow(tourId, userId);
    if (changes === 0) {
      throw new Error("Tour admin not found");
    }
  }

  /**
   * Get all admins for a tour with user details
   */
  getTourAdmins(tourId: number): TourAdminWithUser[] {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    return this.findTourAdminsWithUser(tourId);
  }

  /**
   * Check if a user is an admin for a specific tour
   */
  isTourAdmin(tourId: number, userId: number): boolean {
    return this.findTourAdminExists(tourId, userId);
  }

  /**
   * Get all tours where a user is an admin
   */
  getToursForAdmin(userId: number): { tour_id: number; tour_name: string }[] {
    return this.findToursForUser(userId);
  }

  /**
   * Check if a user can manage a tour (add/remove enrollments, approve requests, manage admins)
   * Returns true if:
   * - User is SUPER_ADMIN
   * - User is the tour owner
   * - User is a tour admin
   */
  canManageTour(tourId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === null) {
      return false;
    }

    if (ownerId === userId) {
      return true;
    }

    return this.findTourAdminExists(tourId, userId);
  }

  /**
   * Check if a user can manage tour admins (more restrictive than canManageTour)
   * Only tour owners and SUPER_ADMINs can add/remove tour admins
   */
  canManageTourAdmins(tourId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === null) {
      return false;
    }

    return ownerId === userId;
  }

  /**
   * Find a tour admin by ID
   */
  findById(id: number): TourAdmin | null {
    return this.findTourAdminById(id);
  }
}

export function createTourAdminService(db: Database) {
  return new TourAdminService(db);
}
