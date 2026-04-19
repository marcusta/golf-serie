import { Migration } from "./base";

export class AddTourScoringFormatAndStablefordPointsMigration extends Migration {
  version = 54;
  description =
    "Add scoring_format to tours and stableford_points to competition_results";

  async up(): Promise<void> {
    if (!(await this.columnExists("tours", "scoring_format"))) {
      await this.execute(`
        ALTER TABLE tours
        ADD COLUMN scoring_format TEXT NOT NULL DEFAULT 'stroke_play'
      `);
    }

    if (!(await this.columnExists("competition_results", "stableford_points"))) {
      await this.execute(`
        ALTER TABLE competition_results
        ADD COLUMN stableford_points INTEGER
      `);
    }
  }

  async down(): Promise<void> {
    // No rollback for additive SQLite schema changes
  }
}
