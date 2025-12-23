import { Migration } from "./base";

export class AddUsersAndSessionsMigration extends Migration {
  version = 15;
  description = "Add users and sessions tables";

  async up(): Promise<void> {
    // Create users table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PLAYER', -- SUPER_ADMIN, ADMIN, PLAYER
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS sessions");
    await this.execute("DROP TABLE IF EXISTS users");
  }
}
