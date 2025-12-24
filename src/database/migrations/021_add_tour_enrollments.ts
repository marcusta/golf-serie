import { Migration } from "./base";

export class AddTourEnrollmentsMigration extends Migration {
  version = 21;
  description = "Add tour_enrollments table for managing tour memberships";

  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        player_id INTEGER,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
        UNIQUE(tour_id, email)
      )
    `);

    // Create index for faster lookups by email (for auto-enrollment on registration)
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_email ON tour_enrollments(email)
    `);

    // Create index for status filtering
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_status ON tour_enrollments(tour_id, status)
    `);
  }

  async down(): Promise<void> {
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_status");
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_email");
    await this.execute("DROP TABLE IF EXISTS tour_enrollments");
  }
}
