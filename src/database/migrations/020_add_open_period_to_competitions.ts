import { Migration } from "./base";

export class AddOpenPeriodToCompetitionsMigration extends Migration {
  version = 20;
  description = "Add open_start and open_end columns to competitions table for open period";

  async up(): Promise<void> {
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
