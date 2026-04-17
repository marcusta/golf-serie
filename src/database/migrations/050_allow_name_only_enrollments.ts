import { Migration } from "./base";

export class AllowNameOnlyEnrollmentsMigration extends Migration {
  version = 50;
  description =
    "Allow name-only tour enrollments (nullable email, add name column)";

  async up(): Promise<void> {
    if (await this.columnExists("tour_enrollments", "name")) {
      return;
    }

    await this.execute(`
      CREATE TABLE tour_enrollments_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        player_id INTEGER,
        email TEXT,
        name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        category_id INTEGER,
        playing_handicap REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES tour_categories(id) ON DELETE SET NULL
      )
    `);

    const hasCategoryId = await this.columnExists(
      "tour_enrollments",
      "category_id"
    );
    const hasPlayingHandicap = await this.columnExists(
      "tour_enrollments",
      "playing_handicap"
    );

    const categorySelect = hasCategoryId ? "category_id" : "NULL";
    const handicapSelect = hasPlayingHandicap ? "playing_handicap" : "NULL";

    await this.execute(`
      INSERT INTO tour_enrollments_new
        (id, tour_id, player_id, email, name, status, category_id, playing_handicap, created_at, updated_at)
      SELECT
        id, tour_id, player_id, email, NULL, status,
        ${categorySelect}, ${handicapSelect},
        created_at, updated_at
      FROM tour_enrollments
    `);

    await this.execute(`DROP TABLE tour_enrollments`);
    await this.execute(
      `ALTER TABLE tour_enrollments_new RENAME TO tour_enrollments`
    );

    await this.execute(`
      CREATE UNIQUE INDEX idx_tour_enrollments_tour_email
      ON tour_enrollments(tour_id, email)
      WHERE email IS NOT NULL
    `);

    await this.execute(`
      CREATE INDEX idx_tour_enrollments_email
      ON tour_enrollments(email)
      WHERE email IS NOT NULL
    `);

    await this.execute(`
      CREATE INDEX idx_tour_enrollments_status
      ON tour_enrollments(tour_id, status)
    `);
  }

  async down(): Promise<void> {
    // No rollback - would lose name-only enrollments
  }
}
