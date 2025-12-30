import { Migration } from "./base";

export class AddParticipantHandicapSnapshotMigration extends Migration {
  version = 37;
  description = "Add handicap_index snapshot column to participants table";

  async up(): Promise<void> {
    // Add handicap_index column to participants table
    // This stores the player's handicap at the time they played (when first score was entered)
    if (!(await this.columnExists("participants", "handicap_index"))) {
      await this.execute(
        "ALTER TABLE participants ADD COLUMN handicap_index REAL"
      );
    }
  }

  async down(): Promise<void> {
    try {
      await this.execute("ALTER TABLE participants DROP COLUMN handicap_index");
    } catch (e) {
      console.warn(
        "Down migration for handicap_index column failed (possibly not supported by SQLite version):",
        e
      );
    }
  }
}
