import { Migration } from "./base";

export class UpdateExistingTablesMigration extends Migration {
  version = 18;
  description = "Update series, competitions, and participants tables";

  async up(): Promise<void> {
    // Add owner_id to series
    if (!(await this.columnExists("series", "owner_id"))) {
      await this.execute("ALTER TABLE series ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }

    // Add tour_id to competitions
    if (!(await this.columnExists("competitions", "tour_id"))) {
      await this.execute("ALTER TABLE competitions ADD COLUMN tour_id INTEGER REFERENCES tours(id) ON DELETE SET NULL");
    }

    // Add point_template_id to competitions
    if (!(await this.columnExists("competitions", "point_template_id"))) {
      await this.execute("ALTER TABLE competitions ADD COLUMN point_template_id INTEGER REFERENCES point_templates(id) ON DELETE SET NULL");
    }

    // Add player_id to participants
    if (!(await this.columnExists("participants", "player_id"))) {
        await this.execute("ALTER TABLE participants ADD COLUMN player_id INTEGER REFERENCES players(id) ON DELETE SET NULL");
    }
  }

  async down(): Promise<void> {
     // SQLite doesn't support DROP COLUMN easily in older versions, but Bun usually bundles a recent one.
     // However, for safety in migrations with SQLite, usually we have to recreate tables, which is complex.
     // For this MVP/Proof of context, we might skip full down logic for ALTER COLUMN or try it if supported.
     try {
       await this.execute("ALTER TABLE series DROP COLUMN owner_id");
       await this.execute("ALTER TABLE competitions DROP COLUMN tour_id");
       await this.execute("ALTER TABLE competitions DROP COLUMN point_template_id");
       await this.execute("ALTER TABLE participants DROP COLUMN player_id");
     } catch (e) {
       console.warn("Down migration for columns failed (possibly not supported by SQLite version):", e);
     }
  }
}
