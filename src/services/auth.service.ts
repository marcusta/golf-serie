import { Database } from "bun:sqlite";

export class AuthService {
  constructor(private db: Database) {}

  async register(email: string, password: string, role: string = "PLAYER") {
    // Check if user exists
    const existing = this.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await Bun.password.hash(password);
    
    const result = this.db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id, email, role"
    ).get(email, passwordHash, role) as { id: number; email: string; role: string };

    return result;
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
}

export function createAuthService(db: Database) {
  return new AuthService(db);
}
