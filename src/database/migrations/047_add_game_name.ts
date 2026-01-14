import { Migration } from "./base";

export class AddGameNameMigration extends Migration {
  version = 47;
  description = "Add name field to games table";

  async up(): Promise<void> {
    // Add optional name field to games table
    if (!(await this.columnExists("games", "name"))) {
      await this.execute(`
        ALTER TABLE games ADD COLUMN name TEXT
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily
    // Would require recreating table without this column
  }
}
