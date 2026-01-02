import { Migration } from "./base";

export class AddTourIdToPointTemplatesMigration extends Migration {
  version = 43;
  description = "Add tour_id to point_templates for tour-scoped templates";

  async up(): Promise<void> {
    // Check if column already exists
    const columns = this.db
      .prepare("PRAGMA table_info(point_templates)")
      .all() as { name: string }[];
    const hasTourIdColumn = columns.some((col) => col.name === "tour_id");

    if (!hasTourIdColumn) {
      await this.execute(`
        ALTER TABLE point_templates ADD COLUMN tour_id INTEGER
        REFERENCES tours(id) ON DELETE CASCADE
      `);
    }

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_point_templates_tour_id
      ON point_templates(tour_id)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_point_templates_tour_id");
    // Note: SQLite doesn't support DROP COLUMN, would need table recreation
  }
}
