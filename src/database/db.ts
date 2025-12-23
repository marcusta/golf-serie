import { Database } from "bun:sqlite";
import { InitialSchemaMigration } from "./migrations/001_initial_schema";
import { AddTeeTimeIdMigration } from "./migrations/002_add_tee_time_id";
import { AddParticipantScoreMigration } from "./migrations/003_add_participant_score";
import { AddSeriesMigration } from "./migrations/004_add_series";
import { AddSeriesFieldsMigration } from "./migrations/005_add_series_fields";
import { SeriesTeamsJunctionMigration } from "./migrations/006_series_teams_junction";
import { AddDocumentsMigration } from "./migrations/007_add_documents";
import { AddLandingDocumentToSeriesMigration } from "./migrations/008_add_landing_document_to_series";
import { AddParticipantLockStatusMigration } from "./migrations/009_add_participant_lock_status";
import { AddManualScoresToParticipantsMigration } from "./migrations/010_add_manual_scores_to_participants";
import { AddManualEntryFormatToCompetitions } from "./migrations/011_add_manual_entry_format_to_competitions";
import { AddStartHoleToTeeTimesMigration } from "./migrations/012_add_start_hole_to_tee_times";
import { AddPointsMultiplierToCompetitionsMigration } from "./migrations/013_add_points_multiplier_to_competitions";
import { AddIndoorSupportMigration } from "./migrations/014_add_indoor_support";
import { AddUsersAndSessionsMigration } from "./migrations/015_add_users_and_sessions";
import { AddPlayersMigration } from "./migrations/016_add_players";
import { AddToursAndPointTemplatesMigration } from "./migrations/017_add_tours_and_point_templates";
import { UpdateExistingTablesMigration } from "./migrations/018_update_existing_tables";
import { AddStartModeToCompetitionsMigration } from "./migrations/019_add_start_mode_to_competitions";

export function createDatabase(dbPath?: string): Database {
  // Use environment variable or default path
  const finalPath = dbPath || process.env.DATABASE_PATH || "golf_series.db";
  const db = new Database(finalPath);

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  return db;
}

export async function initializeDatabase(db: Database): Promise<void> {
  // Create migrations table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const appliedMigrations = db
    .query("SELECT version FROM migrations")
    .all() as { version: number }[];
  const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

  // Define migrations in order
  const migrations = [
    new InitialSchemaMigration(db),
    new AddTeeTimeIdMigration(db),
    new AddParticipantScoreMigration(db),
    new AddSeriesMigration(db),
    new AddSeriesFieldsMigration(db),
    new SeriesTeamsJunctionMigration(db),
    new AddDocumentsMigration(db),
    new AddLandingDocumentToSeriesMigration(db),
    new AddParticipantLockStatusMigration(db),
    new AddManualScoresToParticipantsMigration(db),
    new AddManualEntryFormatToCompetitions(db),
    new AddStartHoleToTeeTimesMigration(db),
    new AddPointsMultiplierToCompetitionsMigration(db),
    new AddIndoorSupportMigration(db),
    new AddUsersAndSessionsMigration(db),
    new AddPlayersMigration(db),
    new AddToursAndPointTemplatesMigration(db),
    new UpdateExistingTablesMigration(db),
    new AddStartModeToCompetitionsMigration(db),
  ];

  // Apply pending migrations
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up();
      db.run("INSERT INTO migrations (version, description) VALUES (?, ?)", [
        migration.version,
        migration.description,
      ]);
    }
  }
}

export async function createTestDatabase(): Promise<Database> {
  const db = createDatabase(":memory:");
  await initializeDatabase(db);
  return db;
}
