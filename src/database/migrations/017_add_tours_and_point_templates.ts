import { Migration } from "./base";

export class AddToursAndPointTemplatesMigration extends Migration {
  version = 17;
  description = "Add tours and point templates tables";

  async up(): Promise<void> {
    // Create point_templates table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS point_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        points_structure TEXT NOT NULL, -- JSON string
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create tours table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS tours");
    await this.execute("DROP TABLE IF EXISTS point_templates");
  }
}
