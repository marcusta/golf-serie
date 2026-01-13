import { Migration } from "./base";

export class AddCasualGamesMigration extends Migration {
  version = 45;
  description = "Add casual games tables";

  async up(): Promise<void> {
    // Create games table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        game_type VARCHAR(50) NOT NULL DEFAULT 'stroke_play',
        scoring_mode VARCHAR(20) NOT NULL DEFAULT 'gross',
        status VARCHAR(20) NOT NULL DEFAULT 'setup',
        custom_settings TEXT,
        scheduled_date DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_owner ON games(owner_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_course ON games(course_id)");

    // Create game_players table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id),
        guest_name VARCHAR(255),
        guest_handicap REAL,
        tee_id INTEGER REFERENCES course_tees(id),
        display_order INTEGER NOT NULL DEFAULT 0,
        is_owner INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (player_id IS NOT NULL AND guest_name IS NULL) OR
          (player_id IS NULL AND guest_name IS NOT NULL)
        )
      )
    `);

    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id)");

    // Create game_groups table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name VARCHAR(100),
        start_hole INTEGER NOT NULL DEFAULT 1,
        group_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_groups_game ON game_groups(game_id)");

    // Create game_group_members junction table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_group_id INTEGER NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
        game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
        tee_order INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_group_id, game_player_id)
      )
    `);

    await this.execute("CREATE INDEX IF NOT EXISTS idx_group_members_group ON game_group_members(game_group_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_group_members_player ON game_group_members(game_player_id)");

    // Create game_scores table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_group_member_id INTEGER NOT NULL REFERENCES game_group_members(id) ON DELETE CASCADE,
        score TEXT NOT NULL DEFAULT '[]',
        handicap_index REAL,
        is_locked INTEGER DEFAULT 0,
        locked_at DATETIME,
        custom_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_scores_member ON game_scores(game_group_member_id)");
  }

  async down(): Promise<void> {
    await this.execute("DROP TABLE IF EXISTS game_scores");
    await this.execute("DROP TABLE IF EXISTS game_group_members");
    await this.execute("DROP TABLE IF EXISTS game_groups");
    await this.execute("DROP TABLE IF EXISTS game_players");
    await this.execute("DROP TABLE IF EXISTS games");
  }
}
