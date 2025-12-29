import { Migration } from "./base";

export class AddCompetitionCategoryTeesMigration extends Migration {
  version = 35;
  description = "Add competition_category_tees table for category-specific tee assignments";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_category_tees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        tee_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES tour_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (tee_id) REFERENCES course_tees(id),
        UNIQUE(competition_id, category_id)
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_category_tees_competition
        ON competition_category_tees(competition_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_competition_category_tees_competition");
    await this.execute("DROP TABLE IF EXISTS competition_category_tees");
  }
}
