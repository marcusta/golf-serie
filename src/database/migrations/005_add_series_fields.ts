import { Migration } from "./base";

export class AddSeriesFieldsMigration extends Migration {
  version = 5;
  description = "Add banner_image_url and is_public fields to series table";

  async up(): Promise<void> {
    // Add banner_image_url column if it doesn't exist
    const bannerColumnExists = await this.columnExists("series", "banner_image_url");
    if (!bannerColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN banner_image_url TEXT
      `);
    }

    // Add is_public column if it doesn't exist
    const publicColumnExists = await this.columnExists("series", "is_public");
    if (!publicColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN is_public INTEGER DEFAULT 1
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns, so we need to recreate the table
    await this.execute(`
      CREATE TABLE series_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO series_new (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at 
      FROM series
    `);

    await this.execute("DROP TABLE series");
    await this.execute("ALTER TABLE series_new RENAME TO series");
  }
}
