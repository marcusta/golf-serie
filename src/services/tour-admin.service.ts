import { Database } from "bun:sqlite";
import type { TourAdmin, TourAdminWithUser } from "../types";

export class TourAdminService {
  constructor(private db: Database) {}

  /**
   * Add a user as an admin for a tour
   * Only tour owners and SUPER_ADMINs can add tour admins
   */
  addTourAdmin(tourId: number, userId: number): TourAdmin {
    // Validate tour exists
    const tour = this.db
      .prepare("SELECT id FROM tours WHERE id = ?")
      .get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Validate user exists
    const user = this.db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if already a tour admin
    const existing = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);
    if (existing) {
      throw new Error("User is already an admin for this tour");
    }

    const result = this.db
      .prepare(
        `
        INSERT INTO tour_admins (tour_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `
      )
      .get(tourId, userId) as TourAdmin;

    return result;
  }

  /**
   * Remove a user as admin from a tour
   */
  removeTourAdmin(tourId: number, userId: number): void {
    const result = this.db
      .prepare("DELETE FROM tour_admins WHERE tour_id = ? AND user_id = ?")
      .run(tourId, userId);

    if (result.changes === 0) {
      throw new Error("Tour admin not found");
    }
  }

  /**
   * Get all admins for a tour with user details
   */
  getTourAdmins(tourId: number): TourAdminWithUser[] {
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

  /**
   * Check if a user is an admin for a specific tour
   */
  isTourAdmin(tourId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);

    return !!result;
  }

  /**
   * Get all tours where a user is an admin
   */
  getToursForAdmin(userId: number): { tour_id: number; tour_name: string }[] {
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

  /**
   * Check if a user can manage a tour (add/remove enrollments, approve requests, manage admins)
   * Returns true if:
   * - User is SUPER_ADMIN
   * - User is the tour owner
   * - User is a tour admin
   */
  canManageTour(tourId: number, userId: number): boolean {
    // Check if user is SUPER_ADMIN
    const user = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | null;

    if (user?.role === "SUPER_ADMIN") {
      return true;
    }

    // Get tour and check ownership
    const tour = this.db
      .prepare("SELECT owner_id FROM tours WHERE id = ?")
      .get(tourId) as { owner_id: number } | null;

    if (!tour) {
      return false;
    }

    if (tour.owner_id === userId) {
      return true;
    }

    // Check if user is a tour admin
    return this.isTourAdmin(tourId, userId);
  }

  /**
   * Check if a user can manage tour admins (more restrictive than canManageTour)
   * Only tour owners and SUPER_ADMINs can add/remove tour admins
   */
  canManageTourAdmins(tourId: number, userId: number): boolean {
    // Check if user is SUPER_ADMIN
    const user = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | null;

    if (user?.role === "SUPER_ADMIN") {
      return true;
    }

    // Get tour and check ownership
    const tour = this.db
      .prepare("SELECT owner_id FROM tours WHERE id = ?")
      .get(tourId) as { owner_id: number } | null;

    if (!tour) {
      return false;
    }

    return tour.owner_id === userId;
  }

  /**
   * Find a tour admin by ID
   */
  findById(id: number): TourAdmin | null {
    return this.db
      .prepare("SELECT * FROM tour_admins WHERE id = ?")
      .get(id) as TourAdmin | null;
  }
}

export function createTourAdminService(db: Database) {
  return new TourAdminService(db);
}
