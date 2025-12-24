import { Migration } from "./base";

export class AddTourSettingsMigration extends Migration {
  version = 23;
  description = "Add enrollment_mode and visibility settings to tours table";

  async up(): Promise<void> {
    // Add enrollment_mode column
    // 'closed' = admin-only enrollment
    // 'request' = players can request to join
    if (!(await this.columnExists("tours", "enrollment_mode"))) {
      await this.execute(
        "ALTER TABLE tours ADD COLUMN enrollment_mode TEXT NOT NULL DEFAULT 'closed'"
      );
    }

    // Add visibility column
    // 'private' = only admins and enrolled players can view
    // 'public' = anyone can view leaderboards/standings
    if (!(await this.columnExists("tours", "visibility"))) {
      await this.execute(
        "ALTER TABLE tours ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'"
      );
    }
  }

  async down(): Promise<void> {
    // SQLite ALTER TABLE DROP COLUMN is supported in newer versions
    try {
      await this.execute("ALTER TABLE tours DROP COLUMN enrollment_mode");
      await this.execute("ALTER TABLE tours DROP COLUMN visibility");
    } catch (e) {
      console.warn(
        "Down migration for tour settings columns failed (possibly not supported by SQLite version):",
        e
      );
    }
  }
}
