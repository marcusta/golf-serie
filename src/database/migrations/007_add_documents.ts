import { Migration } from "./base";

export class AddDocumentsMigration extends Migration {
  version = 7;
  description = "Add documents table for series-related documentation";

  async up(): Promise<void> {
    // Create documents table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        series_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      )
    `);

    // Create index for series_id for better query performance
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_series_id ON documents(series_id)
    `);

    // Create index for type for filtering by document type
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)
    `);
  }

  async down(): Promise<void> {
    // Drop indexes
    await this.execute("DROP INDEX IF EXISTS idx_documents_type");
    await this.execute("DROP INDEX IF EXISTS idx_documents_series_id");

    // Drop documents table
    await this.execute("DROP TABLE IF EXISTS documents");
  }
}
