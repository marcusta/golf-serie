import { Migration } from "./base";

export class AddParticipantDQAndAuditMigration extends Migration {
  version = 38;
  description = "Add DQ status and audit fields to participants table";

  async up(): Promise<void> {
    // Add is_dq column - whether participant is disqualified
    if (!(await this.columnExists("participants", "is_dq"))) {
      await this.execute(
        "ALTER TABLE participants ADD COLUMN is_dq INTEGER DEFAULT 0"
      );
    }

    // Add admin_notes column - comment/reason for admin changes
    if (!(await this.columnExists("participants", "admin_notes"))) {
      await this.execute(
        "ALTER TABLE participants ADD COLUMN admin_notes TEXT"
      );
    }

    // Add admin_modified_by column - user_id who made the last admin change
    if (!(await this.columnExists("participants", "admin_modified_by"))) {
      await this.execute(
        "ALTER TABLE participants ADD COLUMN admin_modified_by INTEGER REFERENCES users(id)"
      );
    }

    // Add admin_modified_at column - timestamp of last admin change
    if (!(await this.columnExists("participants", "admin_modified_at"))) {
      await this.execute(
        "ALTER TABLE participants ADD COLUMN admin_modified_at TEXT"
      );
    }
  }

  async down(): Promise<void> {
    const columns = ["is_dq", "admin_notes", "admin_modified_by", "admin_modified_at"];
    for (const column of columns) {
      try {
        await this.execute(`ALTER TABLE participants DROP COLUMN ${column}`);
      } catch (e) {
        console.warn(
          `Down migration for ${column} column failed (possibly not supported by SQLite version):`,
          e
        );
      }
    }
  }
}
