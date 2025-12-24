import { Migration } from "./base";

export class AddTourAdminsMigration extends Migration {
  version = 22;
  description = "Add tour_admins table for tour-specific admin assignments";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(tour_id, user_id)
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS tour_admins");
  }
}
