import { Database } from "bun:sqlite";
import type { TourEnrollmentService } from "./tour-enrollment.service";
import type { PlayerService } from "./player.service";
import type { TourEnrollment } from "../types";

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

  async register(
    email: string,
    password: string,
    role: string = "PLAYER"
  ): Promise<RegisterResultWithEnrollments> {
    // Check if user exists
    const existing = this.db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await Bun.password.hash(password);

    const result = this.db
      .prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id, email, role"
      )
      .get(email, passwordHash, role) as RegisterResult;

    // Check for pending tour enrollments and auto-enroll if services are available
    const autoEnrollments = await this.processAutoEnrollments(
      result.id,
      email
    );

    return {
      ...result,
      player_id: autoEnrollments.playerId,
      auto_enrollments: autoEnrollments.enrollments,
    };
  }

  /**
   * Process auto-enrollments for a newly registered user
   * Checks for pending tour enrollments matching the email and activates them
   */
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
    // If services aren't available, skip auto-enrollment
    if (!this.tourEnrollmentService || !this.playerService) {
      return {};
    }

    // Check for pending enrollments
    const pendingEnrollments =
      this.tourEnrollmentService.getPendingEnrollmentsForEmail(email);

    if (pendingEnrollments.length === 0) {
      return {};
    }

    // Create a player profile for this user (using email as name initially)
    const emailName = email.split("@")[0]; // Use part before @ as initial name
    const player = this.playerService.create(
      { name: emailName, user_id: userId },
      userId
    );

    // Activate all pending enrollments
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

        // Get tour name for the response
        const tour = this.db
          .prepare("SELECT name FROM tours WHERE id = ?")
          .get(enrollment.tour_id) as { name: string } | null;

        activatedEnrollments.push({
          tour_id: enrollment.tour_id,
          tour_name: tour?.name || "Unknown Tour",
          enrollment_id: activated.id,
        });
      } catch (error) {
        // Log but don't fail registration if an enrollment activation fails
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
    const user = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await Bun.password.verify(password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    // Create session
    const sessionId = crypto.randomUUID();
    // Expires in 7 days
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; 

    this.db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    ).run(sessionId, user.id, expiresAt);

    return { sessionId, user: { id: user.id, email: user.email, role: user.role } };
  }

  async validateSession(sessionId: string) {
    const session = this.db.prepare(`
      SELECT s.*, u.email, u.role 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(sessionId) as any;

    if (!session) {
      return null;
    }

    if (Date.now() > session.expires_at) {
      // Clean up expired
      this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
      return null;
    }

    return {
      sessionId: session.id,
      user: { id: session.user_id, email: session.email, role: session.role }
    };
  }

  async logout(sessionId: string) {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  async updateEmail(userId: number, newEmail: string, currentPassword: string): Promise<{ email: string }> {
    // Get current user
    const user = this.db
      .prepare("SELECT id, email, password_hash FROM users WHERE id = ?")
      .get(userId) as { id: number; email: string; password_hash: string } | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const valid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    // Check if new email is already taken
    const existing = this.db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(newEmail, userId);
    if (existing) {
      throw new Error("Email already in use");
    }

    // Update email
    this.db
      .prepare("UPDATE users SET email = ? WHERE id = ?")
      .run(newEmail, userId);

    return { email: newEmail };
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get current user
    const user = this.db
      .prepare("SELECT id, password_hash FROM users WHERE id = ?")
      .get(userId) as { id: number; password_hash: string } | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const valid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    // Hash and update password
    const newPasswordHash = await Bun.password.hash(newPassword);
    this.db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(newPasswordHash, userId);
  }

  getAllUsers(): Array<{ id: number; email: string; role: string }> {
    return this.db
      .prepare("SELECT id, email, role FROM users ORDER BY email")
      .all() as Array<{ id: number; email: string; role: string }>;
  }
}

export function createAuthService(db: Database, deps?: AuthServiceDependencies) {
  return new AuthService(db, deps);
}
