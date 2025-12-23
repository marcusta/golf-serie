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

export class PlayerService {
  constructor(private db: Database) {}

  findAll(): Player[] {
    return this.db
      .prepare("SELECT * FROM players ORDER BY name ASC")
      .all() as Player[];
  }

  findById(id: number): Player | null {
    return this.db
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(id) as Player | null;
  }

  findByUserId(userId: number): Player | null {
    return this.db
      .prepare("SELECT * FROM players WHERE user_id = ?")
      .get(userId) as Player | null;
  }

  getPlayerProfile(id: number): PlayerProfile | null {
    const player = this.findById(id);
    if (!player) {
      return null;
    }

    // Aggregate stats from participants table
    try {
      const stats = this.db
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
        .get(id) as any;

      return {
        ...player,
        competitions_played: stats?.competitions_played || 0,
        total_rounds: stats?.total_rounds || 0,
        best_score: stats?.best_score || null,
        average_score: stats?.average_score ? Math.round(stats.average_score * 10) / 10 : null,
      };
    } catch (error) {
      // If player_id column doesn't exist yet, return player with zero stats
      console.warn("Error fetching player stats, returning zero stats:", error);
      return {
        ...player,
        competitions_played: 0,
        total_rounds: 0,
        best_score: null,
        average_score: null,
      };
    }
  }

  create(data: CreatePlayerInput, createdBy?: number): Player {
    const handicap = data.handicap ?? 0;
    const userId = data.user_id ?? null;
    const createdById = createdBy ?? null;

    const result = this.db
      .prepare(
        `
      INSERT INTO players (name, handicap, user_id, created_by)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(data.name, handicap, userId, createdById) as Player;

    return result;
  }

  update(id: number, data: UpdatePlayerInput): Player {
    const player = this.findById(id);
    if (!player) {
      throw new Error("Player not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.handicap !== undefined) {
      updates.push("handicap = ?");
      values.push(data.handicap);
    }

    if (updates.length === 0) {
      return player;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result = this.db
      .prepare(
        `
      UPDATE players 
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `
      )
      .get(...values) as Player;

    return result;
  }

  delete(id: number): void {
    const result = this.db.prepare("DELETE FROM players WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Player not found");
    }
  }

  linkToUser(playerId: number, userId: number): Player {
    const player = this.findById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user is already linked to another player
    const existingLink = this.findByUserId(userId);
    if (existingLink && existingLink.id !== playerId) {
      throw new Error("User is already linked to another player");
    }

    const result = this.db
      .prepare(
        `
      UPDATE players 
      SET user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `
      )
      .get(userId, playerId) as Player;

    return result;
  }

  updateHandicap(id: number, handicap: number): Player {
    return this.update(id, { handicap });
  }
}

export function createPlayerService(db: Database) {
  return new PlayerService(db);
}
