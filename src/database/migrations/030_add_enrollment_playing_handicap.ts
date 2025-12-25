import { Migration } from "./base";

export class AddEnrollmentPlayingHandicapMigration extends Migration {
  version = 30;
  description = "Add playing_handicap to tour_enrollments for tour-specific handicap index";

  async up(): Promise<void> {
    // Add playing_handicap column to tour_enrollments
    // Allows overriding player.handicap with a tour-specific handicap index
    // NULL means use the player's default handicap
    if (!(await this.columnExists("tour_enrollments", "playing_handicap"))) {
      await this.execute(`
        ALTER TABLE tour_enrollments ADD COLUMN playing_handicap REAL
      `);
    }
  }

  async down(): Promise<void> {
    console.warn("Down migration for playing_handicap column not supported");
  }
}
