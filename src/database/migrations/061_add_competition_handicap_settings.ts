import { Migration } from "./base";

export class AddCompetitionHandicapSettingsMigration extends Migration {
  version = 61;
  description =
    "Add handicap_mode and handicap_allowance to competitions";

  async up(): Promise<void> {
    if (!(await this.columnExists("competitions", "handicap_mode"))) {
      await this.execute(`
        ALTER TABLE competitions
        ADD COLUMN handicap_mode TEXT NOT NULL DEFAULT 'whs'
      `);
    }

    if (!(await this.columnExists("competitions", "handicap_allowance"))) {
      await this.execute(`
        ALTER TABLE competitions
        ADD COLUMN handicap_allowance REAL NOT NULL DEFAULT 100
      `);
    }
  }

  async down(): Promise<void> {
    // No rollback for additive SQLite schema changes
  }
}
