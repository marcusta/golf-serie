import { Migration } from "./base";

export class AddDopedHandicapMigration extends Migration {
  version = 62;
  description = "Add doped handicap flags to tours and competitions and doped_handicap to participants";

  async up(): Promise<void> {
    if (!(await this.columnExists("tours", "doped_handicap_enabled"))) {
      await this.execute(
        `ALTER TABLE tours ADD COLUMN doped_handicap_enabled INTEGER NOT NULL DEFAULT 0`
      );
    }
    if (!(await this.columnExists("competitions", "use_doped_handicap"))) {
      await this.execute(
        `ALTER TABLE competitions ADD COLUMN use_doped_handicap INTEGER NOT NULL DEFAULT 0`
      );
    }
    if (!(await this.columnExists("competitions", "exclude_from_doped_handicap"))) {
      await this.execute(
        `ALTER TABLE competitions ADD COLUMN exclude_from_doped_handicap INTEGER NOT NULL DEFAULT 0`
      );
    }
    if (!(await this.columnExists("participants", "doped_handicap"))) {
      await this.execute(
        `ALTER TABLE participants ADD COLUMN doped_handicap REAL NULL`
      );
    }
  }

  async down(): Promise<void> {
    // No rollback for additive SQLite schema changes
  }
}
