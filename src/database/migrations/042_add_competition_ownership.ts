import { Migration } from "./base";

export class AddCompetitionOwnershipMigration extends Migration {
  version = 42;
  description =
    "Add owner_id to competitions and create competition_admins table";

  async up(): Promise<void> {
    // Add owner_id to competitions table
    const columns = this.db
      .prepare("PRAGMA table_info(competitions)")
      .all() as { name: string }[];
    const hasOwnerIdColumn = columns.some((col) => col.name === "owner_id");

    if (!hasOwnerIdColumn) {
      await this.execute(`
        ALTER TABLE competitions ADD COLUMN owner_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // Create competition_admins table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(competition_id, user_id)
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_admins_competition_id
      ON competition_admins(competition_id)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_admins_user_id
      ON competition_admins(user_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS competition_admins");
    // Note: SQLite doesn't support DROP COLUMN, would need table recreation
  }
}
