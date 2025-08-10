import { Migration } from "./base";

export class AddStartHoleToTeeTimesMigration extends Migration {
  version = 12;
  description = "Add start_hole column to tee_times (default 1)";

  async up(): Promise<void> {
    const hasColumn = await this.columnExists("tee_times", "start_hole");
    if (!hasColumn) {
      await this.execute(
        "ALTER TABLE tee_times ADD COLUMN start_hole INTEGER NOT NULL DEFAULT 1"
      );
    }
  }

  async down(): Promise<void> {
    // SQLite does not support dropping columns easily; no-op.
  }
}
