import { Database } from "bun:sqlite";
import type { TourEnrollmentService } from "./tour-enrollment.service";
import type { PlayerService } from "./player.service";
import type { PlayerProfileService } from "./player-profile.service";

// ============================================================================
// Constants
// ============================================================================

const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MIN_PASSWORD_LENGTH = 6;
const VALID_ROLES = ["SUPER_ADMIN", "ORGANIZER", "ADMIN", "PLAYER"] as const;

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

interface UserWithPlayerRow {
  id: number;
  email: string;
  role: string;
  player_id: number | null;
  player_name: string | null;
  player_handicap: number | null;
  player_gender: string | null;
  player_display_name: string | null;
  player_home_club_id: number | null;
  player_home_club_name: string | null;
}

export interface UserWithPlayerInfo {
  id: number;
  email: string;
  role: string;
  player?: {
    id: number;
    name: string;
    handicap: number;
    gender?: "male" | "female";
    display_name?: string;
    home_club_id?: number;
    home_club_name?: string;
  };
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

export interface RegisterProfileData {
  display_name?: string;
  handicap?: number;
  gender?: "male" | "female";
  home_club_id?: number;
}

export interface AuthServiceDependencies {
  tourEnrollmentService?: TourEnrollmentService;
  playerService?: PlayerService;
  playerProfileService?: PlayerProfileService;
}

export interface GetUsersOptions {
  limit: number;
  offset: number;
  search?: string;
  role?: string;
}

export interface GetUsersResult {
  users: Array<{ id: number; email: string; role: string; created_at: string }>;
  total: number;
  hasMore: boolean;
}

export class AuthService {
  private tourEnrollmentService?: TourEnrollmentService;
  private playerService?: PlayerService;
  private playerProfileService?: PlayerProfileService;

  constructor(private db: Database, deps?: AuthServiceDependencies) {
    this.tourEnrollmentService = deps?.tourEnrollmentService;
    this.playerService = deps?.playerService;
    this.playerProfileService = deps?.playerProfileService;
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

  private buildUserFilters(search?: string, role?: string): {
    whereClause: string;
    params: (string | number)[];
  } {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push("LOWER(email) LIKE LOWER(?)");
      params.push(`%${search}%`);
    }

    if (role) {
      conditions.push("role = ?");
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereClause, params };
  }

  private findUsersWithPagination(
    limit: number,
    offset: number,
    search?: string,
    role?: string
  ): Array<{ id: number; email: string; role: string; created_at: string }> {
    const { whereClause, params } = this.buildUserFilters(search, role);

    const sql = `
      SELECT id, email, role, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    return this.db.prepare(sql).all(...params, limit, offset) as Array<{
      id: number;
      email: string;
      role: string;
      created_at: string;
    }>;
  }

  private countUsersWithFilters(search?: string, role?: string): number {
    const { whereClause, params } = this.buildUserFilters(search, role);
    const sql = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  private updateUserRoleRow(userId: number, role: string): void {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  }

  private findUserWithPlayerRow(userId: number): UserWithPlayerRow | null {
    return this.db.prepare(`
      SELECT
        u.id,
        u.email,
        u.role,
        p.id as player_id,
        p.name as player_name,
        p.handicap as player_handicap,
        p.gender as player_gender,
        pp.display_name as player_display_name,
        pp.home_club_id as player_home_club_id,
        c.name as player_home_club_name
      FROM users u
      LEFT JOIN players p ON u.id = p.user_id
      LEFT JOIN player_profiles pp ON p.id = pp.player_id
      LEFT JOIN clubs c ON pp.home_club_id = c.id
      WHERE u.id = ?
    `).get(userId) as UserWithPlayerRow | null;
  }

  // ============================================================================
  // Public API Methods (orchestration only)
  // ============================================================================

  async register(
    email: string,
    password: string,
    role: string = "PLAYER",
    profileData?: RegisterProfileData
  ): Promise<RegisterResultWithEnrollments> {
    if (this.findUserExistsByEmail(email)) {
      throw new Error("User already exists");
    }

    const passwordHash = await Bun.password.hash(password);
    const result = this.insertUserRow(email, passwordHash, role);

    const playerAndEnrollments = await this.createPlayerAndProcessEnrollments(
      result.id,
      email,
      profileData
    );

    return {
      ...result,
      player_id: playerAndEnrollments.playerId,
      auto_enrollments: playerAndEnrollments.enrollments,
    };
  }

  private async createPlayerAndProcessEnrollments(
    userId: number,
    email: string,
    profileData?: RegisterProfileData
  ): Promise<{
    playerId?: number;
    enrollments?: Array<{
      tour_id: number;
      tour_name: string;
      enrollment_id: number;
    }>;
  }> {
    if (!this.playerService) {
      return {};
    }

    // Determine player name: use display_name if provided, otherwise extract from email
    const playerName = profileData?.display_name || this.extractEmailName(email);

    // Create player with name and handicap
    const player = this.playerService.create(
      {
        name: playerName,
        user_id: userId,
        handicap: profileData?.handicap,
      },
      userId
    );

    // Create player profile with display_name, home_club_id, and gender
    if (this.playerProfileService && profileData) {
      const profileUpdates: {
        display_name?: string;
        home_club_id?: number;
        gender?: "male" | "female";
      } = {};
      if (profileData.display_name) {
        profileUpdates.display_name = profileData.display_name;
      }
      if (profileData.home_club_id) {
        profileUpdates.home_club_id = profileData.home_club_id;
      }
      if (profileData.gender) {
        profileUpdates.gender = profileData.gender;
      }
      if (Object.keys(profileUpdates).length > 0) {
        this.playerProfileService.getOrCreateProfile(player.id);
        this.playerProfileService.updateProfile(player.id, profileUpdates);
      }
    }

    // Process any pending tour enrollments
    if (!this.tourEnrollmentService) {
      return { playerId: player.id };
    }

    const pendingEnrollments =
      this.tourEnrollmentService.getPendingEnrollmentsForEmail(email);

    if (pendingEnrollments.length === 0) {
      return { playerId: player.id };
    }

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

  getUsers(options: GetUsersOptions): GetUsersResult {
    // Validate and sanitize limit (1-100, default 50)
    const limit = Math.min(Math.max(1, options.limit || 50), 100);

    // Validate and sanitize offset (non-negative, default 0)
    const offset = Math.max(0, options.offset || 0);

    // Validate role if provided - silently ignore invalid roles
    const role = options.role && (VALID_ROLES as readonly string[]).includes(options.role)
      ? options.role
      : undefined;

    // Get total count for stats
    const total = this.countUsersWithFilters(options.search, role);

    // Get paginated users
    const users = this.findUsersWithPagination(limit, offset, options.search, role);

    // Calculate if more results exist
    const hasMore = offset + users.length < total;

    return { users, total, hasMore };
  }

  updateUserRole(userId: number, newRole: string): { id: number; email: string; role: string } {
    if (!(VALID_ROLES as readonly string[]).includes(newRole)) {
      throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
    }

    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    this.updateUserRoleRow(userId, newRole);

    return { id: userId, email: user.email, role: newRole };
  }

  getUserWithPlayer(userId: number): UserWithPlayerInfo | null {
    const row = this.findUserWithPlayerRow(userId);
    if (!row) {
      return null;
    }

    return this.transformUserWithPlayerRow(row);
  }

  private transformUserWithPlayerRow(row: UserWithPlayerRow): UserWithPlayerInfo {
    const result: UserWithPlayerInfo = {
      id: row.id,
      email: row.email,
      role: row.role,
    };

    if (row.player_id !== null) {
      result.player = {
        id: row.player_id,
        name: row.player_name!,
        handicap: row.player_handicap ?? 0,
      };

      if (row.player_gender) {
        result.player.gender = row.player_gender as "male" | "female";
      }
      if (row.player_display_name) {
        result.player.display_name = row.player_display_name;
      }
      if (row.player_home_club_id !== null) {
        result.player.home_club_id = row.player_home_club_id;
      }
      if (row.player_home_club_name) {
        result.player.home_club_name = row.player_home_club_name;
      }
    }

    return result;
  }
}

export function createAuthService(db: Database, deps?: AuthServiceDependencies) {
  return new AuthService(db, deps);
}
