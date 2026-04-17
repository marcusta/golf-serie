import { Migration } from "./base";

export class AddCompetitionRoundTypeMigration extends Migration {
  version = 51;
  description =
    "Add round_type to competitions (full_18 | front_9 | back_9)";

  async up(): Promise<void> {
    if (await this.columnExists("competitions", "round_type")) {
      return;
    }

    await this.execute(`
      ALTER TABLE competitions
      ADD COLUMN round_type TEXT NOT NULL DEFAULT 'full_18'
    `);
  }

  async down(): Promise<void> {
    // No rollback - schema-only addition
  }
}
