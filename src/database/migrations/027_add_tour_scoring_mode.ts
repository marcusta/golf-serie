import { Migration } from "./base";

export class AddTourScoringModeMigration extends Migration {
  version = 27;
  description = "Add scoring_mode to tours for gross/net scoring support";

  async up(): Promise<void> {
    // Add scoring_mode column to tours
    // 'gross' - Raw scores only (current behavior, default)
    // 'net' - Net scores only (gross - handicap)
    // 'both' - Track and display both gross and net scores
    if (!(await this.columnExists("tours", "scoring_mode"))) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'gross'
      `);
    }
  }

  async down(): Promise<void> {
    console.warn("Down migration for scoring_mode column not supported");
  }
}
