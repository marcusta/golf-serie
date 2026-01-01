import { Database } from "bun:sqlite";
import type {
  TourEnrollment,
  TourEnrollmentStatus,
  TourEnrollmentWithPlayer,
  Tour,
} from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface TourRow {
  id: number;
  enrollment_mode: string;
  visibility: string;
  owner_id: number;
}

interface UserRow {
  id: number;
  email: string;
  role: string;
}

interface PlayerWithEmailRow {
  id: number;
  email: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class TourEnrollmentService {
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

  private findTourWithMode(
    tourId: number
  ): Pick<TourRow, "id" | "enrollment_mode"> | null {
    return this.db
      .prepare("SELECT id, enrollment_mode FROM tours WHERE id = ?")
      .get(tourId) as Pick<TourRow, "id" | "enrollment_mode"> | null;
  }

  private findTourVisibility(
    tourId: number
  ): Pick<TourRow, "id" | "visibility" | "owner_id"> | null {
    return this.db
      .prepare("SELECT id, visibility, owner_id FROM tours WHERE id = ?")
      .get(tourId) as Pick<TourRow, "id" | "visibility" | "owner_id"> | null;
  }

  private findTourOwnerId(tourId: number): number | null {
    const row = this.db
      .prepare("SELECT owner_id FROM tours WHERE id = ?")
      .get(tourId) as { owner_id: number } | null;
    return row?.owner_id ?? null;
  }

  private findUserByEmailLower(email: string): UserRow | null {
    return this.db
      .prepare("SELECT id, email, role FROM users WHERE LOWER(email) = ?")
      .get(email.toLowerCase()) as UserRow | null;
  }

  private findUserRole(userId: number): string | null {
    const row = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: string } | null;
    return row?.role ?? null;
  }

  private findPlayerByUserId(userId: number): { id: number } | null {
    return this.db
      .prepare("SELECT id FROM players WHERE user_id = ?")
      .get(userId) as { id: number } | null;
  }

  private findPlayerWithEmail(playerId: number): PlayerWithEmailRow | null {
    return this.db
      .prepare(
        `
        SELECT p.id, u.email
        FROM players p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `
      )
      .get(playerId) as PlayerWithEmailRow | null;
  }

  private findTourAdminExists(tourId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);
    return !!result;
  }

  private findActiveEnrollmentByUser(tourId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        `
        SELECT 1 FROM tour_enrollments te
        JOIN players p ON te.player_id = p.id
        WHERE te.tour_id = ? AND p.user_id = ? AND te.status = 'active'
        LIMIT 1
      `
      )
      .get(tourId, userId);
    return !!result;
  }

  private insertPlayerRow(name: string, userId: number): { id: number } {
    return this.db
      .prepare("INSERT INTO players (name, user_id) VALUES (?, ?) RETURNING id")
      .get(name, userId) as { id: number };
  }

  private insertActiveEnrollmentRow(
    tourId: number,
    playerId: number,
    email: string
  ): TourEnrollment {
    return this.db
      .prepare(
        `
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
        RETURNING *
      `
      )
      .get(tourId, playerId, email) as TourEnrollment;
  }

  private insertPendingEnrollmentRow(
    tourId: number,
    email: string
  ): TourEnrollment {
    return this.db
      .prepare(
        `
        INSERT INTO tour_enrollments (tour_id, email, status)
        VALUES (?, ?, 'pending')
        RETURNING *
      `
      )
      .get(tourId, email) as TourEnrollment;
  }

  private insertRequestedEnrollmentRow(
    tourId: number,
    playerId: number,
    email: string
  ): TourEnrollment {
    return this.db
      .prepare(
        `
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'requested')
        RETURNING *
      `
      )
      .get(tourId, playerId, email) as TourEnrollment;
  }

  private updateEnrollmentStatusRow(
    enrollmentId: number,
    status: string
  ): TourEnrollment {
    return this.db
      .prepare(
        `
        UPDATE tour_enrollments
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `
      )
      .get(status, enrollmentId) as TourEnrollment;
  }

  private updateEnrollmentWithPlayerRow(
    enrollmentId: number,
    playerId: number
  ): TourEnrollment {
    return this.db
      .prepare(
        `
        UPDATE tour_enrollments
        SET status = 'active', player_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `
      )
      .get(playerId, enrollmentId) as TourEnrollment;
  }

  private deleteEnrollmentRow(enrollmentId: number): number {
    const result = this.db
      .prepare("DELETE FROM tour_enrollments WHERE id = ?")
      .run(enrollmentId);
    return result.changes;
  }

  private deleteEnrollmentByTourRow(
    enrollmentId: number,
    tourId: number
  ): number {
    const result = this.db
      .prepare("DELETE FROM tour_enrollments WHERE id = ? AND tour_id = ?")
      .run(enrollmentId, tourId);
    return result.changes;
  }

  private findEnrollmentsByTour(tourId: number): TourEnrollmentWithPlayer[] {
    return this.db
      .prepare(
        `
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name,
          COALESCE(te.playing_handicap, p.handicap) as handicap
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ?
        ORDER BY te.created_at DESC
      `
      )
      .all(tourId) as TourEnrollmentWithPlayer[];
  }

  private findEnrollmentsByTourAndStatus(
    tourId: number,
    status: TourEnrollmentStatus
  ): TourEnrollmentWithPlayer[] {
    return this.db
      .prepare(
        `
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name,
          COALESCE(te.playing_handicap, p.handicap) as handicap
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ? AND te.status = ?
        ORDER BY te.created_at DESC
      `
      )
      .all(tourId, status) as TourEnrollmentWithPlayer[];
  }

  private findEnrollmentsByPlayer(playerId: number): TourEnrollment[] {
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

  // ==========================================================================
  // Logic Methods (private, no SQL)
  // ==========================================================================

  private extractEmailName(email: string): string {
    return email.split("@")[0];
  }

  private validateEnrollmentStatus(
    enrollment: TourEnrollment,
    expectedStatus: TourEnrollmentStatus,
    action: string
  ): void {
    if (enrollment.status !== expectedStatus) {
      throw new Error(
        `Can only ${action} enrollments with '${expectedStatus}' status`
      );
    }
  }

  // ==========================================================================
  // Public API Methods (orchestration)
  // ==========================================================================

  /**
   * Add an enrollment for an email (Admin adds email)
   * If user already exists with a player profile -> 'active'
   * If user exists but no player profile -> create player, then 'active'
   * If user doesn't exist -> 'pending' (waiting for registration)
   */
  addPendingEnrollment(tourId: number, email: string): TourEnrollment {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }

    const existingEnrollment = this.getEnrollmentByEmail(tourId, email);
    if (existingEnrollment) {
      throw new Error("Email is already enrolled in this tour");
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = this.findUserByEmailLower(normalizedEmail);

    if (existingUser) {
      let player = this.findPlayerByUserId(existingUser.id);

      if (!player) {
        const emailName = this.extractEmailName(existingUser.email);
        player = this.insertPlayerRow(emailName, existingUser.id);
      }

      return this.insertActiveEnrollmentRow(tourId, player.id, normalizedEmail);
    }

    return this.insertPendingEnrollmentRow(tourId, normalizedEmail);
  }

  /**
   * Player requests to join a tour (for tours with enrollment_mode = 'request')
   * Status will be 'requested' - waiting for admin approval
   */
  requestEnrollment(tourId: number, playerId: number): TourEnrollment {
    const tour = this.findTourWithMode(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    if (tour.enrollment_mode !== "request") {
      throw new Error("This tour does not accept enrollment requests");
    }

    const player = this.findPlayerWithEmail(playerId);
    if (!player) {
      throw new Error("Player not found or not linked to a user account");
    }

    const existingEnrollment = this.getEnrollmentByEmail(tourId, player.email);
    if (existingEnrollment) {
      throw new Error("Player is already enrolled or has a pending request");
    }

    return this.insertRequestedEnrollmentRow(
      tourId,
      playerId,
      player.email.toLowerCase()
    );
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

    this.validateEnrollmentStatus(enrollment, "requested", "approve");

    return this.updateEnrollmentStatusRow(enrollmentId, "active");
  }

  /**
   * Reject/delete an enrollment (Admin rejects)
   * Removes the enrollment entirely
   */
  rejectEnrollment(enrollmentId: number): void {
    const changes = this.deleteEnrollmentRow(enrollmentId);
    if (changes === 0) {
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
    if (status) {
      return this.findEnrollmentsByTourAndStatus(tourId, status);
    }
    return this.findEnrollmentsByTour(tourId);
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

    this.validateEnrollmentStatus(enrollment, "pending", "activate");

    return this.updateEnrollmentWithPlayerRow(enrollment.id, playerId);
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
    const tour = this.findTourVisibility(tourId);
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

    const userRole = this.findUserRole(userId);
    if (userRole === "SUPER_ADMIN") {
      return true;
    }

    if (tour.owner_id === userId) {
      return true;
    }

    if (this.findTourAdminExists(tourId, userId)) {
      return true;
    }

    return this.findActiveEnrollmentByUser(tourId, userId);
  }

  /**
   * Check if a user can manage a tour (add/remove enrollments, approve requests)
   * Returns true if:
   * - User is SUPER_ADMIN
   * - User is the tour owner
   * - User is a tour admin
   */
  canManageTour(tourId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (userRole === "SUPER_ADMIN") {
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
   * Get all enrollments for a player across all tours
   */
  getEnrollmentsForPlayer(playerId: number): TourEnrollment[] {
    return this.findEnrollmentsByPlayer(playerId);
  }

  /**
   * Remove a player's enrollment from a tour
   */
  removeEnrollment(tourId: number, enrollmentId: number): void {
    const changes = this.deleteEnrollmentByTourRow(enrollmentId, tourId);
    if (changes === 0) {
      throw new Error("Enrollment not found");
    }
  }
}

export function createTourEnrollmentService(db: Database) {
  return new TourEnrollmentService(db);
}
