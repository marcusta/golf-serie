import { Migration } from "./base";

export class AddTourFieldsMigration extends Migration {
  version = 24;
  description = "Add banner_image_url and landing_document_id fields to tours table";

  async up(): Promise<void> {
    // Add banner_image_url column if it doesn't exist
    const bannerColumnExists = await this.columnExists("tours", "banner_image_url");
    if (!bannerColumnExists) {
      await this.execute(`
        ALTER TABLE tours
        ADD COLUMN banner_image_url TEXT
      `);
    }

    // Add landing_document_id column if it doesn't exist
    const landingDocColumnExists = await this.columnExists("tours", "landing_document_id");
    if (!landingDocColumnExists) {
      await this.execute(`
        ALTER TABLE tours
        ADD COLUMN landing_document_id INTEGER REFERENCES tour_documents(id) ON DELETE SET NULL
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support dropping columns directly
    // This would require table recreation which is complex for production data
    // For now, we leave columns in place (they won't affect functionality if unused)
  }
}
