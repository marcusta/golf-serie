import { Database } from "bun:sqlite";
import type {
  TourEnrollment,
  TourEnrollmentStatus,
  TourEnrollmentWithPlayer,
  Tour,
} from "../types";

export class TourEnrollmentService {
  constructor(private db: Database) {}

  /**
   * Add an enrollment for an email (Admin adds email)
   * If user already exists with a player profile -> 'active'
   * If user exists but no player profile -> create player, then 'active'
   * If user doesn't exist -> 'pending' (waiting for registration)
   */
  addPendingEnrollment(tourId: number, email: string): TourEnrollment {
    // Validate tour exists
    const tour = this.db
      .prepare("SELECT id FROM tours WHERE id = ?")
      .get(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Check if enrollment already exists
    const existing = this.getEnrollmentByEmail(tourId, email);
    if (existing) {
      throw new Error("Email is already enrolled in this tour");
    }

    const normalizedEmail = email.toLowerCase();

    // Check if a user with this email already exists
    const existingUser = this.db
      .prepare("SELECT id, email FROM users WHERE LOWER(email) = ?")
      .get(normalizedEmail) as { id: number; email: string } | null;

    if (existingUser) {
      // User exists - check if they have a player profile
      let player = this.db
        .prepare("SELECT id FROM players WHERE user_id = ?")
        .get(existingUser.id) as { id: number } | null;

      if (!player) {
        // Create a player profile for this user
        const emailName = existingUser.email.split("@")[0];
        player = this.db
          .prepare(
            "INSERT INTO players (name, user_id) VALUES (?, ?) RETURNING id"
          )
          .get(emailName, existingUser.id) as { id: number };
      }

      // Create active enrollment directly
      const result = this.db
        .prepare(
          `
          INSERT INTO tour_enrollments (tour_id, player_id, email, status)
          VALUES (?, ?, ?, 'active')
          RETURNING *
        `
        )
        .get(tourId, player.id, normalizedEmail) as TourEnrollment;

      return result;
    }

    // User doesn't exist - create pending enrollment
    const result = this.db
      .prepare(
        `
        INSERT INTO tour_enrollments (tour_id, email, status)
        VALUES (?, ?, 'pending')
        RETURNING *
      `
      )
      .get(tourId, normalizedEmail) as TourEnrollment;

    return result;
  }

  /**
   * Player requests to join a tour (for tours with enrollment_mode = 'request')
   * Status will be 'requested' - waiting for admin approval
   */
  requestEnrollment(tourId: number, playerId: number): TourEnrollment {
    // Validate tour exists and allows requests
    const tour = this.db
      .prepare("SELECT id, enrollment_mode FROM tours WHERE id = ?")
      .get(tourId) as { id: number; enrollment_mode: string } | null;

    if (!tour) {
      throw new Error("Tour not found");
    }

    if (tour.enrollment_mode !== "request") {
      throw new Error("This tour does not accept enrollment requests");
    }

    // Get the player's user email
    const player = this.db
      .prepare(
        `
        SELECT p.id, u.email
        FROM players p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `
      )
      .get(playerId) as { id: number; email: string } | null;

    if (!player) {
      throw new Error("Player not found or not linked to a user account");
    }

    // Check if already enrolled
    const existing = this.getEnrollmentByEmail(tourId, player.email);
    if (existing) {
      throw new Error("Player is already enrolled or has a pending request");
    }

    const result = this.db
      .prepare(
        `
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'requested')
        RETURNING *
      `
      )
      .get(tourId, playerId, player.email.toLowerCase()) as TourEnrollment;

    return result;
  }

  /**
   * Approve an enrollment request (Admin approves)
   * Changes status from 'requested' to 'active'
   */
  approveEnrollment(enrollmentId: number): TourEnrollment {
    const enrollment = this.findById(enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    if (enrollment.status !== "requested") {
      throw new Error("Can only approve enrollments with 'requested' status");
    }

    const result = this.db
      .prepare(
        `
        UPDATE tour_enrollments
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `
      )
      .get(enrollmentId) as TourEnrollment;

    return result;
  }

  /**
   * Reject/delete an enrollment (Admin rejects)
   * Removes the enrollment entirely
   */
  rejectEnrollment(enrollmentId: number): void {
    const result = this.db
      .prepare("DELETE FROM tour_enrollments WHERE id = ?")
      .run(enrollmentId);

    if (result.changes === 0) {
      throw new Error("Enrollment not found");
    }
  }

  /**
   * Get enrollments for a tour, optionally filtered by status
   */
  getEnrollments(
    tourId: number,
    status?: TourEnrollmentStatus
  ): TourEnrollmentWithPlayer[] {
    let query = `
      SELECT
        te.*,
        p.name as player_name,
        tc.name as category_name,
        COALESCE(te.playing_handicap, p.handicap) as handicap
      FROM tour_enrollments te
      LEFT JOIN players p ON te.player_id = p.id
      LEFT JOIN tour_categories tc ON te.category_id = tc.id
      WHERE te.tour_id = ?
    `;

    const params: any[] = [tourId];

    if (status) {
      query += " AND te.status = ?";
      params.push(status);
    }

    query += " ORDER BY te.created_at DESC";

    return this.db.prepare(query).all(...params) as TourEnrollmentWithPlayer[];
  }

  /**
   * Get enrollment by email for a specific tour
   */
  getEnrollmentByEmail(
    tourId: number,
    email: string
  ): TourEnrollmentWithPlayer | null {
    return this.db
      .prepare(
        `
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ? AND LOWER(te.email) = LOWER(?)
      `
      )
      .get(tourId, email) as TourEnrollmentWithPlayer | null;
  }

  /**
   * Find enrollment by ID
   */
  findById(id: number): TourEnrollment | null {
    return this.db
      .prepare("SELECT * FROM tour_enrollments WHERE id = ?")
      .get(id) as TourEnrollment | null;
  }

  /**
   * Activate an enrollment when user registers
   * Called when a user registers with an email that has a pending enrollment
   * Changes status from 'pending' to 'active' and links the player
   */
  activateEnrollment(
    tourId: number,
    email: string,
    playerId: number
  ): TourEnrollment {
    const enrollment = this.getEnrollmentByEmail(tourId, email);

    if (!enrollment) {
      throw new Error("Enrollment not found for this email");
    }

    if (enrollment.status !== "pending") {
      throw new Error("Can only activate enrollments with 'pending' status");
    }

    const result = this.db
      .prepare(
        `
        UPDATE tour_enrollments
        SET status = 'active', player_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `
      )
      .get(playerId, enrollment.id) as TourEnrollment;

    return result;
  }

  /**
   * Get all pending enrollments for an email across all tours
   * Used during registration to find all tours the user should be auto-enrolled in
   */
  getPendingEnrollmentsForEmail(email: string): TourEnrollment[] {
    return this.db
      .prepare(
        `
        SELECT * FROM tour_enrollments
        WHERE LOWER(email) = LOWER(?) AND status = 'pending'
      `
      )
      .all(email) as TourEnrollment[];
  }

  /**
   * Check if a user can view a tour based on visibility and enrollment
   * Returns true if:
   * - Tour is public
   * - User is SUPER_ADMIN
   * - User is the tour owner
   * - User is a tour admin
   * - User has an active enrollment
   */
  canViewTour(tourId: number, userId: number | null): boolean {
    // Get tour details
    const tour = this.db
      .prepare("SELECT id, visibility, owner_id FROM tours WHERE id = ?")
      .get(tourId) as Pick<Tour, "id" | "visibility" | "owner_id"> | null;

    if (!tour) {
      return false;
    }

    // Public tours are visible to everyone
    if (tour.visibility === "public") {
      return true;
    }

    // Private tour - need to check permissions
    if (!userId) {
      return false;
    }

    // Check if user is SUPER_ADMIN
    const user = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | null;

    if (user?.role === "SUPER_ADMIN") {
      return true;
    }

    // Check if user is tour owner
    if (tour.owner_id === userId) {
      return true;
    }

    // Check if user is a tour admin
    const isTourAdmin = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);

    if (isTourAdmin) {
      return true;
    }

    // Check if user has an active enrollment (via their player)
    const hasActiveEnrollment = this.db
      .prepare(
        `
        SELECT 1 FROM tour_enrollments te
        JOIN players p ON te.player_id = p.id
        WHERE te.tour_id = ? AND p.user_id = ? AND te.status = 'active'
        LIMIT 1
      `
      )
      .get(tourId, userId);

    return !!hasActiveEnrollment;
  }

  /**
   * Check if a user can manage a tour (add/remove enrollments, approve requests)
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
    const isTourAdmin = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);

    return !!isTourAdmin;
  }

  /**
   * Get all enrollments for a player across all tours
   */
  getEnrollmentsForPlayer(playerId: number): TourEnrollment[] {
    return this.db
      .prepare(
        `
        SELECT * FROM tour_enrollments
        WHERE player_id = ?
        ORDER BY created_at DESC
      `
      )
      .all(playerId) as TourEnrollment[];
  }

  /**
   * Remove a player's enrollment from a tour
   */
  removeEnrollment(tourId: number, enrollmentId: number): void {
    const result = this.db
      .prepare(
        "DELETE FROM tour_enrollments WHERE id = ? AND tour_id = ?"
      )
      .run(enrollmentId, tourId);

    if (result.changes === 0) {
      throw new Error("Enrollment not found");
    }
  }
}

export function createTourEnrollmentService(db: Database) {
  return new TourEnrollmentService(db);
}
