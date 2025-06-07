import { Migration } from "./base";

export class AddLandingDocumentToSeriesMigration extends Migration {
  version = 8;
  description = "Add landing_document_id field to series table";

  async up(): Promise<void> {
    // Add landing_document_id column to series table
    await this.execute(`
      ALTER TABLE series 
      ADD COLUMN landing_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL
    `);

    // Create index for landing_document_id for better query performance
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_landing_document_id ON series(landing_document_id)
    `);
  }

  async down(): Promise<void> {
    // Drop index
    await this.execute("DROP INDEX IF EXISTS idx_series_landing_document_id");

    // Remove landing_document_id from series table by recreating without the column
    await this.execute(`
      CREATE TABLE series_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute(`
      INSERT INTO series_temp (id, name, description, banner_image_url, is_public, created_at, updated_at)
      SELECT id, name, description, banner_image_url, is_public, created_at, updated_at FROM series
    `);

    await this.execute(`DROP TABLE series`);
    await this.execute(`ALTER TABLE series_temp RENAME TO series`);
  }
}
