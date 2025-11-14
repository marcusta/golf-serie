import { Migration } from "./base";

export class AddIndoorSupportMigration extends Migration {
  version = 14;
  description = "Add indoor golf simulator support (venue_type to competitions, hitting_bay to tee_times)";

  async up(): Promise<void> {
    // Add venue_type column to competitions
    const hasVenueTypeColumn = await this.columnExists("competitions", "venue_type");
    if (!hasVenueTypeColumn) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN venue_type TEXT NOT NULL DEFAULT 'outdoor'"
      );
    }

    // Add hitting_bay column to tee_times
    const hasBayColumn = await this.columnExists("tee_times", "hitting_bay");
    if (!hasBayColumn) {
      await this.execute(
        "ALTER TABLE tee_times ADD COLUMN hitting_bay INTEGER"
      );
    }
  }

  async down(): Promise<void> {
    // SQLite does not support dropping columns easily; no-op.
  }
}
