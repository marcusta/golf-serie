import { Migration } from "./base";

export class AddTourCategoriesMigration extends Migration {
  version = 31;
  description = "Add tour_categories table for player classification within tours";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        UNIQUE(tour_id, name)
      )
    `);

    // Create index for faster lookups by tour
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_categories_tour_id ON tour_categories(tour_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_tour_categories_tour_id");
    await this.execute("DROP TABLE IF EXISTS tour_categories");
  }
}
