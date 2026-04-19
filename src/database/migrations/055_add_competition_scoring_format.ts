import { Migration } from "./base";

export class AddCompetitionScoringFormatMigration extends Migration {
  version = 55;
  description = "Add scoring_format to competitions";

  async up(): Promise<void> {
    if (await this.columnExists("competitions", "scoring_format")) {
      return;
    }

    await this.execute(`
      ALTER TABLE competitions
      ADD COLUMN scoring_format TEXT
    `);
  }

  async down(): Promise<void> {
    // No rollback for additive SQLite schema changes
  }
}
