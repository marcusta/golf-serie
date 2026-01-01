import { Database } from "bun:sqlite";

export type Player = {
  id: number;
  name: string;
  handicap: number;
  user_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type CreatePlayerInput = {
  name: string;
  handicap?: number;
  user_id?: number;
};

export type UpdatePlayerInput = {
  name?: string;
  handicap?: number;
};

export type PlayerProfile = Player & {
  competitions_played: number;
  total_rounds: number;
  best_score: number | null;
  average_score: number | null;
};

// Internal types for query results
interface PlayerStatsRow {
  competitions_played: number;
  total_rounds: number;
  best_score: number | null;
  average_score: number | null;
}

export class PlayerService {
  constructor(private db: Database) {}

  // ============================================================
  // Query Methods (private, single SQL statement)
  // ============================================================

  private findAllPlayerRows(): Player[] {
    return this.db
      .prepare("SELECT * FROM players ORDER BY name ASC")
      .all() as Player[];
  }

  private findPlayerRowById(id: number): Player | null {
    return this.db
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(id) as Player | null;
  }

  private findPlayerRowByUserId(userId: number): Player | null {
    return this.db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player | null;
  }

  private findPlayerStatsRow(playerId: number): PlayerStatsRow | null {
    return this.db
      .prepare(
        `
        SELECT
          COUNT(DISTINCT p.competition_id) as competitions_played,
          COUNT(p.id) as total_rounds,
          MIN(p.total_score) as best_score,
          AVG(p.total_score) as average_score
        FROM participants p
        WHERE p.player_id = ? AND p.total_score IS NOT NULL
      `
      )
      .get(playerId) as PlayerStatsRow | null;
  }

  private insertPlayerRow(
    name: string,
    handicap: number,
    userId: number | null,
    createdBy: number | null
  ): Player {
    return this.db
      .prepare(
        `
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `
      )
      .get(name, handicap, userId, createdBy) as Player;
  }

  private updatePlayerRow(
    id: number,
    updates: string[],
    values: (string | number)[]
  ): Player {
    return this.db
      .prepare(
        `
        UPDATE players
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `
      )
      .get(...values, id) as Player;
  }

  private updatePlayerLinkRow(playerId: number, userId: number): Player {
    return this.db
      .prepare(
        `
        UPDATE players
        SET user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `
      )
      .get(userId, playerId) as Player;
  }

  private deletePlayerRow(id: number): number {
    const result = this.db.prepare("DELETE FROM players WHERE id = ?").run(id);
    return result.changes;
  }

  // ============================================================
  // Logic Methods (private, no SQL)
  // ============================================================

  private buildUpdateFields(data: UpdatePlayerInput): {
    updates: string[];
    values: (string | number)[];
  } {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.handicap !== undefined) {
      updates.push("handicap = ?");
      values.push(data.handicap);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }

    return { updates, values };
  }

  private transformToPlayerProfile(
    player: Player,
    stats: PlayerStatsRow | null
  ): PlayerProfile {
    return {
      ...player,
      competitions_played: stats?.competitions_played || 0,
      total_rounds: stats?.total_rounds || 0,
      best_score: stats?.best_score || null,
      average_score: this.calculateRoundedAverage(stats?.average_score),
    };
  }

  private calculateRoundedAverage(avgScore: number | null | undefined): number | null {
    if (avgScore === null || avgScore === undefined) {
      return null;
    }
    return Math.round(avgScore * 10) / 10;
  }

  // ============================================================
  // Public API Methods (orchestration)
  // ============================================================

  findAll(): Player[] {
    return this.findAllPlayerRows();
  }

  findById(id: number): Player | null {
    return this.findPlayerRowById(id);
  }

  findByUserId(userId: number): Player | null {
    return this.findPlayerRowByUserId(userId);
  }

  getPlayerProfile(id: number): PlayerProfile | null {
    const player = this.findPlayerRowById(id);
    if (!player) {
      return null;
    }

    try {
      const stats = this.findPlayerStatsRow(id);
      return this.transformToPlayerProfile(player, stats);
    } catch (error) {
      // If player_id column doesn't exist yet, return player with zero stats
      console.warn("Error fetching player stats, returning zero stats:", error);
      return this.transformToPlayerProfile(player, null);
    }
  }

  create(data: CreatePlayerInput, createdBy?: number): Player {
    const handicap = data.handicap ?? 0;
    const userId = data.user_id ?? null;
    const createdById = createdBy ?? null;

    return this.insertPlayerRow(data.name, handicap, userId, createdById);
  }

  update(id: number, data: UpdatePlayerInput): Player {
    const player = this.findPlayerRowById(id);
    if (!player) {
      throw new Error("Player not found");
    }

    const { updates, values } = this.buildUpdateFields(data);

    if (updates.length === 0) {
      return player;
    }

    return this.updatePlayerRow(id, updates, values);
  }

  delete(id: number): void {
    const changes = this.deletePlayerRow(id);
    if (changes === 0) {
      throw new Error("Player not found");
    }
  }

  linkToUser(playerId: number, userId: number): Player {
    const player = this.findPlayerRowById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user is already linked to another player
    const existingLink = this.findPlayerRowByUserId(userId);
    if (existingLink && existingLink.id !== playerId) {
      throw new Error("User is already linked to another player");
    }

    return this.updatePlayerLinkRow(playerId, userId);
  }

  updateHandicap(id: number, handicap: number): Player {
    return this.update(id, { handicap });
  }
}

export function createPlayerService(db: Database) {
  return new PlayerService(db);
}
