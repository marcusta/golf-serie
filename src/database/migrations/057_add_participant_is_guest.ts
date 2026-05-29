import { Migration } from "./base";

export class AddParticipantIsGuestMigration extends Migration {
  version = 57;
  description =
    "Add is_guest flag to participants (guest players show on leaderboard, never earn tour points)";

  async up(): Promise<void> {
    if (await this.columnExists("participants", "is_guest")) {
      return;
    }

    await this.execute(`
      ALTER TABLE participants
      ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(): Promise<void> {
    // No rollback - schema-only addition
  }
}
