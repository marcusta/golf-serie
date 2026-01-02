import { Database } from "bun:sqlite";
import type { CompetitionAdmin, CompetitionAdminWithUser } from "../types";

// ============================================================================
// Internal Types
// ============================================================================

interface UserRoleRow {
  role: string;
}

interface CompetitionOwnerRow {
  owner_id: number | null;
  series_id: number | null;
  tour_id: number | null;
}

// ============================================================================
// Service Class
// ============================================================================

export class CompetitionAdminService {
  constructor(private db: Database) {}

  // ==========================================================================
  // Query Methods (private, single SQL statement)
  // ==========================================================================

  private findCompetitionExists(competitionId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM competitions WHERE id = ?")
      .get(competitionId);
    return !!result;
  }

  private findUserExists(userId: number): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM users WHERE id = ?")
      .get(userId);
    return !!result;
  }

  private findCompetitionAdminExists(
    competitionId: number,
    userId: number
  ): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM competition_admins WHERE competition_id = ? AND user_id = ? LIMIT 1"
      )
      .get(competitionId, userId);
    return !!result;
  }

  private findUserRole(userId: number): string | null {
    const row = this.db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as UserRoleRow | null;
    return row?.role ?? null;
  }

  private findCompetitionOwnerAndContext(
    competitionId: number
  ): CompetitionOwnerRow | null {
    return this.db
      .prepare(
        "SELECT owner_id, series_id, tour_id FROM competitions WHERE id = ?"
      )
      .get(competitionId) as CompetitionOwnerRow | null;
  }

  private findSeriesOwnerId(seriesId: number): number | null {
    const row = this.db
      .prepare("SELECT owner_id FROM series WHERE id = ?")
      .get(seriesId) as { owner_id: number | null } | null;
    return row?.owner_id ?? null;
  }

  private findSeriesAdminExists(seriesId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM series_admins WHERE series_id = ? AND user_id = ? LIMIT 1"
      )
      .get(seriesId, userId);
    return !!result;
  }

  private findTourOwnerId(tourId: number): number | null {
    const row = this.db
      .prepare("SELECT owner_id FROM tours WHERE id = ?")
      .get(tourId) as { owner_id: number | null } | null;
    return row?.owner_id ?? null;
  }

  private findTourAdminExists(tourId: number, userId: number): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1"
      )
      .get(tourId, userId);
    return !!result;
  }

  private insertCompetitionAdminRow(
    competitionId: number,
    userId: number
  ): CompetitionAdmin {
    return this.db
      .prepare(
        `
        INSERT INTO competition_admins (competition_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `
      )
      .get(competitionId, userId) as CompetitionAdmin;
  }

  private deleteCompetitionAdminRow(
    competitionId: number,
    userId: number
  ): number {
    const result = this.db
      .prepare(
        "DELETE FROM competition_admins WHERE competition_id = ? AND user_id = ?"
      )
      .run(competitionId, userId);
    return result.changes;
  }

  private findCompetitionAdminsWithUser(
    competitionId: number
  ): CompetitionAdminWithUser[] {
    return this.db
      .prepare(
        `
        SELECT
          ca.*,
          u.email,
          u.role
        FROM competition_admins ca
        JOIN users u ON ca.user_id = u.id
        WHERE ca.competition_id = ?
        ORDER BY ca.created_at ASC
      `
      )
      .all(competitionId) as CompetitionAdminWithUser[];
  }

  private findCompetitionsForUser(
    userId: number
  ): { competition_id: number; competition_name: string }[] {
    return this.db
      .prepare(
        `
        SELECT ca.competition_id, c.name as competition_name
        FROM competition_admins ca
        JOIN competitions c ON ca.competition_id = c.id
        WHERE ca.user_id = ?
        ORDER BY c.date DESC
      `
      )
      .all(userId) as { competition_id: number; competition_name: string }[];
  }

  private findCompetitionAdminById(id: number): CompetitionAdmin | null {
    return this.db
      .prepare("SELECT * FROM competition_admins WHERE id = ?")
      .get(id) as CompetitionAdmin | null;
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
   * Add a user as an admin for a competition
   * Only competition owners, parent series/tour admins, and SUPER_ADMINs can add admins
   */
  addCompetitionAdmin(
    competitionId: number,
    userId: number
  ): CompetitionAdmin {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }

    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }

    if (this.findCompetitionAdminExists(competitionId, userId)) {
      throw new Error("User is already an admin for this competition");
    }

    return this.insertCompetitionAdminRow(competitionId, userId);
  }

  /**
   * Remove a user as admin from a competition
   */
  removeCompetitionAdmin(competitionId: number, userId: number): void {
    const changes = this.deleteCompetitionAdminRow(competitionId, userId);
    if (changes === 0) {
      throw new Error("Competition admin not found");
    }
  }

  /**
   * Get all admins for a competition with user details
   */
  getCompetitionAdmins(competitionId: number): CompetitionAdminWithUser[] {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }

    return this.findCompetitionAdminsWithUser(competitionId);
  }

  /**
   * Check if a user is a direct admin for a specific competition
   */
  isCompetitionAdmin(competitionId: number, userId: number): boolean {
    return this.findCompetitionAdminExists(competitionId, userId);
  }

  /**
   * Get all competitions where a user is a direct admin
   */
  getCompetitionsForAdmin(
    userId: number
  ): { competition_id: number; competition_name: string }[] {
    return this.findCompetitionsForUser(userId);
  }

  /**
   * Check if a user can manage a series (helper for hierarchical access)
   */
  private canManageSeriesInternal(seriesId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === userId) {
      return true;
    }

    return this.findSeriesAdminExists(seriesId, userId);
  }

  /**
   * Check if a user can manage a tour (helper for hierarchical access)
   */
  private canManageTourInternal(tourId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === userId) {
      return true;
    }

    return this.findTourAdminExists(tourId, userId);
  }

  /**
   * Check if a user can manage a competition (edit, manage participants, etc.)
   * Returns true if:
   * - User is SUPER_ADMIN
   * - User is the competition owner
   * - User is a direct competition admin
   * - User can manage the parent series (if competition is in a series)
   * - User can manage the parent tour (if competition is in a tour)
   */
  canManageCompetition(competitionId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const context = this.findCompetitionOwnerAndContext(competitionId);
    if (!context) {
      return false;
    }

    // Direct ownership
    if (context.owner_id === userId) {
      return true;
    }

    // Direct admin
    if (this.findCompetitionAdminExists(competitionId, userId)) {
      return true;
    }

    // Series admin (if competition is in a series)
    if (context.series_id) {
      if (this.canManageSeriesInternal(context.series_id, userId)) {
        return true;
      }
    }

    // Tour admin (if competition is in a tour)
    if (context.tour_id) {
      if (this.canManageTourInternal(context.tour_id, userId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a user can manage competition admins (more restrictive than canManageCompetition)
   * Only competition owners, parent series/tour owners, and SUPER_ADMINs can add/remove admins
   */
  canManageCompetitionAdmins(competitionId: number, userId: number): boolean {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }

    const context = this.findCompetitionOwnerAndContext(competitionId);
    if (!context) {
      return false;
    }

    // Direct ownership
    if (context.owner_id === userId) {
      return true;
    }

    // Series owner (if competition is in a series)
    if (context.series_id) {
      const seriesOwnerId = this.findSeriesOwnerId(context.series_id);
      if (seriesOwnerId === userId) {
        return true;
      }
    }

    // Tour owner (if competition is in a tour)
    if (context.tour_id) {
      const tourOwnerId = this.findTourOwnerId(context.tour_id);
      if (tourOwnerId === userId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find a competition admin by ID
   */
  findById(id: number): CompetitionAdmin | null {
    return this.findCompetitionAdminById(id);
  }
}

export function createCompetitionAdminService(db: Database) {
  return new CompetitionAdminService(db);
}
