import { Migration } from "./base";

export class AddTourDocumentsMigration extends Migration {
  version = 25;
  description = "Add tour_documents table for tour-related documentation";

  async up(): Promise<void> {
    // Create tour_documents table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'general',
        tour_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
      )
    `);

    // Create index for tour_id for better query performance
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_documents_tour_id ON tour_documents(tour_id)
    `);

    // Create index for type for filtering by document type
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_documents_type ON tour_documents(type)
    `);
  }

  async down(): Promise<void> {
    // Drop indexes
    await this.execute("DROP INDEX IF EXISTS idx_tour_documents_type");
    await this.execute("DROP INDEX IF EXISTS idx_tour_documents_tour_id");

    // Drop tour_documents table
    await this.execute("DROP TABLE IF EXISTS tour_documents");
  }
}
