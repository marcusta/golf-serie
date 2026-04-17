import { Database } from "bun:sqlite";

// ============================================================================
// Types
// ============================================================================

export interface LinkedPlayer {
  player_id: number;
  player_name: string;
  display_name: string | null;
  handicap_index: number | null;
  created_at: number;
}

interface LinkedPlayerRow {
  player_id: number;
  player_name: string;
  display_name: string | null;
  handicap_index: number | null;
  created_at: number;
}

interface ParticipantPlayerRow {
  participant_id: number;
  player_id: number;
  created_at: number;
}

// ============================================================================
// Service
// ============================================================================

export class ParticipantPlayersService {
  constructor(private db: Database) {}

  // ============================================================================
  // Query Methods (private, single SQL statement each)
  // ============================================================================

  private findLinkedPlayerRows(participantId: number): LinkedPlayerRow[] {
    return this.db
      .prepare(
        `
        SELECT
          pp.player_id,
          p.name as player_name,
          pf.display_name,
          p.handicap as handicap_index,
          pp.created_at
        FROM participant_players pp
        JOIN players p ON pp.player_id = p.id
        LEFT JOIN player_profiles pf ON p.id = pf.player_id
        WHERE pp.participant_id = ?
        ORDER BY pp.created_at ASC
      `
      )
      .all(participantId) as LinkedPlayerRow[];
  }

  private findLinkExists(participantId: number, playerId: number): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM participant_players WHERE participant_id = ? AND player_id = ? LIMIT 1`
      )
      .get(participantId, playerId);
    return row !== null;
  }

  private findParticipantExists(participantId: number): boolean {
    const row = this.db
      .prepare(`SELECT id FROM participants WHERE id = ?`)
      .get(participantId);
    return row !== null;
  }

  private findPlayerExists(playerId: number): boolean {
    const row = this.db
      .prepare(`SELECT id FROM players WHERE id = ?`)
      .get(playerId);
    return row !== null;
  }

  private insertLink(
    participantId: number,
    playerId: number
  ): ParticipantPlayerRow {
    return this.db
      .prepare(
        `
        INSERT INTO participant_players (participant_id, player_id)
        VALUES (?, ?)
        RETURNING *
      `
      )
      .get(participantId, playerId) as ParticipantPlayerRow;
  }

  private deleteLink(participantId: number, playerId: number): number {
    const result = this.db
      .prepare(
        `DELETE FROM participant_players WHERE participant_id = ? AND player_id = ?`
      )
      .run(participantId, playerId);
    return result.changes;
  }

  // ============================================================================
  // Transform Methods (private, no SQL)
  // ============================================================================

  private transformLinkedPlayerRow(row: LinkedPlayerRow): LinkedPlayer {
    return {
      player_id: row.player_id,
      player_name: row.display_name || row.player_name,
      display_name: row.display_name,
      handicap_index: row.handicap_index,
      created_at: row.created_at,
    };
  }

  // ============================================================================
  // Public API Methods (orchestration)
  // ============================================================================

  /**
   * Get all players linked to a participant
   */
  getLinkedPlayers(participantId: number): LinkedPlayer[] {
    if (!this.findParticipantExists(participantId)) {
      throw new Error("Participant not found");
    }

    const rows = this.findLinkedPlayerRows(participantId);
    return rows.map((row) => this.transformLinkedPlayerRow(row));
  }

  /**
   * Link a player to a participant
   */
  linkPlayer(participantId: number, playerId: number): LinkedPlayer {
    if (!this.findParticipantExists(participantId)) {
      throw new Error("Participant not found");
    }

    if (!this.findPlayerExists(playerId)) {
      throw new Error("Player not found");
    }

    if (this.findLinkExists(participantId, playerId)) {
      throw new Error("Player is already linked to this participant");
    }

    this.insertLink(participantId, playerId);

    // Return the linked player details
    const rows = this.findLinkedPlayerRows(participantId);
    const linkedPlayer = rows.find((r) => r.player_id === playerId);
    if (!linkedPlayer) {
      throw new Error("Failed to retrieve linked player");
    }

    return this.transformLinkedPlayerRow(linkedPlayer);
  }

  /**
   * Unlink a player from a participant
   */
  unlinkPlayer(participantId: number, playerId: number): void {
    if (!this.findParticipantExists(participantId)) {
      throw new Error("Participant not found");
    }

    if (!this.findLinkExists(participantId, playerId)) {
      throw new Error("Player is not linked to this participant");
    }

    const changes = this.deleteLink(participantId, playerId);
    if (changes === 0) {
      throw new Error("Failed to unlink player");
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createParticipantPlayersService(
  db: Database
): ParticipantPlayersService {
  return new ParticipantPlayersService(db);
}
