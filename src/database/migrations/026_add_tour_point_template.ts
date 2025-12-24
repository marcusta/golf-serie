import { Migration } from "./base";

export class AddTourPointTemplateMigration extends Migration {
  version = 26;
  description = "Add point_template_id to tours for standings calculation";

  async up(): Promise<void> {
    // Add point_template_id column to tours
    if (!(await this.columnExists("tours", "point_template_id"))) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN point_template_id INTEGER REFERENCES point_templates(id) ON DELETE SET NULL
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support DROP COLUMN in older versions
    // For safety, we just log a warning
    console.warn("Down migration for point_template_id column not supported");
  }
}
