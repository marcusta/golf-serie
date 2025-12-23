import { Migration } from "./base";

export class AddPlayersMigration extends Migration {
  version = 16;
  description = "Add players table";

  async up(): Promise<void> {
    // Create players table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        handicap REAL DEFAULT 0,
        user_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS players");
  }
}
