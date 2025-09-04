import { Migration } from "./base";

export class AddPointsMultiplierToCompetitionsMigration extends Migration {
  version = 13;
  description = "Add points_multiplier column to competitions table (default 1)";

  async up(): Promise<void> {
    const hasColumn = await this.columnExists("competitions", "points_multiplier");
    if (!hasColumn) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN points_multiplier REAL NOT NULL DEFAULT 1"
      );
    }
  }

  async down(): Promise<void> {
    // SQLite does not support dropping columns easily; no-op.
  }
}