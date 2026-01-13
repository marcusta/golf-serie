import { Migration } from "./base";

export class AddPlayerGenderFieldsMigration extends Migration {
  version = 46;
  description = "Add gender fields for PHCP calculation with gender-specific ratings";

  async up(): Promise<void> {
    // Add gender to players table (for registered players)
    // WHS requires gender-specific course and slope ratings
    if (!(await this.columnExists("players", "gender"))) {
      await this.execute(`
        ALTER TABLE players ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'))
      `);
    }

    // Add guest_gender to game_players table (for guest players)
    if (!(await this.columnExists("game_players", "guest_gender"))) {
      await this.execute(`
        ALTER TABLE game_players ADD COLUMN guest_gender TEXT CHECK(guest_gender IN ('male', 'female'))
      `);
    }
  }

  async down(): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily
    // Would require recreating tables without these columns
  }
}
