import { Migration } from "./base";

export class AddStartModeToCompetitionsMigration extends Migration {
  version = 19;
  description = "Add start_mode column to competitions table (scheduled or open) with open period fields";

  async up(): Promise<void> {
    const hasStartModeColumn = await this.columnExists("competitions", "start_mode");
    if (!hasStartModeColumn) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN start_mode TEXT NOT NULL DEFAULT 'scheduled'"
      );
    }

    const hasOpenStartColumn = await this.columnExists("competitions", "open_start");
    if (!hasOpenStartColumn) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN open_start DATETIME"
      );
    }

    const hasOpenEndColumn = await this.columnExists("competitions", "open_end");
    if (!hasOpenEndColumn) {
      await this.execute(
        "ALTER TABLE competitions ADD COLUMN open_end DATETIME"
      );
    }
  }

  async down(): Promise<void> {
    // SQLite does not support dropping columns easily; no-op.
  }
}
