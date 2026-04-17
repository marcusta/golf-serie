import { Migration } from "./base";

export class AddCompetitionSelfOrganizeMigration extends Migration {
  version = 52;
  description =
    "Add self_organize flag to competitions (anyone with link can build groups)";

  async up(): Promise<void> {
    if (await this.columnExists("competitions", "self_organize")) {
      return;
    }

    await this.execute(`
      ALTER TABLE competitions
      ADD COLUMN self_organize INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(): Promise<void> {
    // No rollback - schema-only addition
  }
}
