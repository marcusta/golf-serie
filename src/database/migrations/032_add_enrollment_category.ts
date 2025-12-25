import { Migration } from "./base";

export class AddEnrollmentCategoryMigration extends Migration {
  version = 32;
  description = "Add category_id to tour_enrollments for player classification";

  async up(): Promise<void> {
    // Check if column already exists
    if (await this.columnExists("tour_enrollments", "category_id")) {
      return;
    }

    await this.execute(`
      ALTER TABLE tour_enrollments ADD COLUMN category_id INTEGER REFERENCES tour_categories(id) ON DELETE SET NULL
    `);

    // Create index for category filtering
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_category ON tour_enrollments(category_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_category");
    // SQLite doesn't support DROP COLUMN in older versions, would need table rebuild
  }
}
