import { Database } from "bun:sqlite";
import type { TourEnrollmentService } from "./tour-enrollment.service";
import type { PlayerService } from "./player.service";

// ============================================================================
// Constants
// ============================================================================

const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MIN_PASSWORD_LENGTH = 6;

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: string;
}

interface SessionRow {
  id: string;
  user_id: number;
  expires_at: number;
  email: string;
  role: string;
}

export interface RegisterResult {
  id: number;
  email: string;
  role: string;
}

export interface RegisterResultWithEnrollments extends RegisterResult {
  player_id?: number;
  auto_enrollments?: Array<{
    tour_id: number;
    tour_name: string;
    enrollment_id: number;
  }>;
}

export interface AuthServiceDependencies {
  tourEnrollmentService?: TourEnrollmentService;
  playerService?: PlayerService;
}

export class AuthService {
  private tourEnrollmentService?: TourEnrollmentService;
  private playerService?: PlayerService;

  constructor(private db: Database, deps?: AuthServiceDependencies) {
    this.tourEnrollmentService = deps?.tourEnrollmentService;
    this.playerService = deps?.playerService;
  }

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validateNewPassword(password: string): void {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
  }

  private extractEmailName(email: string): string {
    return email.split("@")[0];
  }

  // ============================================================================
  // Query Methods (private, single SQL statement each)
  // ============================================================================

  private findUserByEmail(email: string): UserRow | null {
    return this.db.prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | null;
  }

  private findUserById(id: number): UserRow | null {
    return this.db.prepare("SELECT id, email, password_hash, role FROM users WHERE id = ?")
      .get(id) as UserRow | null;
  }

  private findUserExistsByEmail(email: string): boolean {
    const row = this.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    return row !== null;
  }

  private findUserExistsByEmailExcluding(email: string, excludeUserId: number): boolean {
    const row = this.db.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, excludeUserId);
    return row !== null;
  }

  private insertUserRow(email: string, passwordHash: string, role: string): RegisterResult {
    return this.db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id, email, role"
    ).get(email, passwordHash, role) as RegisterResult;
  }

  private findSessionWithUser(sessionId: string): SessionRow | null {
    return this.db.prepare(`
      SELECT s.*, u.email, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(sessionId) as SessionRow | null;
  }

  private insertSessionRow(sessionId: string, userId: number, expiresAt: number): void {
    this.db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    ).run(sessionId, userId, expiresAt);
  }

  private deleteSessionRow(sessionId: string): void {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  private updateUserEmailRow(userId: number, email: string): void {
    this.db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, userId);
  }

  private updateUserPasswordRow(userId: number, passwordHash: string): void {
    this.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
  }

  private findTourName(tourId: number): string | null {
    const result = this.db.prepare("SELECT name FROM tours WHERE id = ?")
      .get(tourId) as { name: string } | null;
    return result?.name ?? null;
  }

  private findAllUsersRows(): Array<{ id: number; email: string; role: string; created_at: string }> {
    return this.db.prepare("SELECT id, email, role, created_at FROM users ORDER BY email")
      .all() as Array<{ id: number; email: string; role: string; created_at: string }>;
  }

  private updateUserRoleRow(userId: number, role: string): void {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  }

  // ============================================================================
  // Public API Methods (orchestration only)
  // ============================================================================

  async register(
    email: string,
    password: string,
    role: string = "PLAYER"
  ): Promise<RegisterResultWithEnrollments> {
    if (this.findUserExistsByEmail(email)) {
      throw new Error("User already exists");
    }

    const passwordHash = await Bun.password.hash(password);
    const result = this.insertUserRow(email, passwordHash, role);

    const autoEnrollments = await this.processAutoEnrollments(result.id, email);

    return {
      ...result,
      player_id: autoEnrollments.playerId,
      auto_enrollments: autoEnrollments.enrollments,
    };
  }

  private async processAutoEnrollments(
    userId: number,
    email: string
  ): Promise<{
    playerId?: number;
    enrollments?: Array<{
      tour_id: number;
      tour_name: string;
      enrollment_id: number;
    }>;
  }> {
    if (!this.tourEnrollmentService || !this.playerService) {
      return {};
    }

    const pendingEnrollments =
      this.tourEnrollmentService.getPendingEnrollmentsForEmail(email);

    if (pendingEnrollments.length === 0) {
      return {};
    }

    const emailName = this.extractEmailName(email);
    const player = this.playerService.create(
      { name: emailName, user_id: userId },
      userId
    );

    const activatedEnrollments: Array<{
      tour_id: number;
      tour_name: string;
      enrollment_id: number;
    }> = [];

    for (const enrollment of pendingEnrollments) {
      try {
        const activated = this.tourEnrollmentService.activateEnrollment(
          enrollment.tour_id,
          email,
          player.id
        );

        const tourName = this.findTourName(enrollment.tour_id);

        activatedEnrollments.push({
          tour_id: enrollment.tour_id,
          tour_name: tourName || "Unknown Tour",
          enrollment_id: activated.id,
        });
      } catch (error) {
        console.warn(
          `Failed to activate enrollment for tour ${enrollment.tour_id}:`,
          error
        );
      }
    }

    return {
      playerId: player.id,
      enrollments:
        activatedEnrollments.length > 0 ? activatedEnrollments : undefined,
    };
  }

  async login(email: string, password: string) {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await Bun.password.verify(password, user.password_hash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_EXPIRY_MS;

    this.insertSessionRow(sessionId, user.id, expiresAt);

    return { sessionId, user: { id: user.id, email: user.email, role: user.role } };
  }

  async validateSession(sessionId: string) {
    const session = this.findSessionWithUser(sessionId);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expires_at) {
      this.deleteSessionRow(sessionId);
      return null;
    }

    return {
      sessionId: session.id,
      user: { id: session.user_id, email: session.email, role: session.role }
    };
  }

  async logout(sessionId: string) {
    this.deleteSessionRow(sessionId);
  }

  async updateEmail(userId: number, newEmail: string, currentPassword: string): Promise<{ email: string }> {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    if (this.findUserExistsByEmailExcluding(newEmail, userId)) {
      throw new Error("Email already in use");
    }

    this.updateUserEmailRow(userId, newEmail);

    return { email: newEmail };
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    this.validateNewPassword(newPassword);

    const newPasswordHash = await Bun.password.hash(newPassword);
    this.updateUserPasswordRow(userId, newPasswordHash);
  }

  getAllUsers(): Array<{ id: number; email: string; role: string; created_at: string }> {
    return this.findAllUsersRows();
  }

  updateUserRole(userId: number, newRole: string): { id: number; email: string; role: string } {
    const validRoles = ["SUPER_ADMIN", "ORGANIZER", "ADMIN", "PLAYER"];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    this.updateUserRoleRow(userId, newRole);

    return { id: userId, email: user.email, role: newRole };
  }
}

export function createAuthService(db: Database, deps?: AuthServiceDependencies) {
  return new AuthService(db, deps);
}
