import { Migration } from "./base";

export class AddSeriesAdminsMigration extends Migration {
  version = 41;
  description = "Add series_admins table for series-specific admin assignments";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id)
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_admins_series_id
      ON series_admins(series_id)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_admins_user_id
      ON series_admins(user_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS series_admins");
  }
}
