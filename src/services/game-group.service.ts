import { Database } from "bun:sqlite";
import type { GameGroup, GameGroupMember, CreateGameGroupDto } from "../types";

// ============================================================================
// Internal Row Types (database representation)
// ============================================================================

interface GameGroupRow {
  id: number;
  game_id: number;
  name: string | null;
  start_hole: number;
  group_order: number;
  created_at: string;
  updated_at: string;
}

interface GameGroupMemberRow {
  id: number;
  game_group_id: number;
  game_player_id: number;
  tee_order: number;
  created_at: string;
}

interface GameGroupWithMembersRow extends GameGroupRow {
  members: GameGroupMemberRow[];
}

export class GameGroupService {
  constructor(private db: Database) {}

  // ============================================================================
  // Validation Methods (private, no SQL)
  // ============================================================================

  private validateStartHole(startHole: number): void {
    if (startHole !== 1 && startHole !== 10) {
      throw new Error("Start hole must be 1 or 10");
    }
  }

  private validateTeeOrder(teeOrder: number): void {
    if (teeOrder < 1) {
      throw new Error("Tee order must be greater than 0");
    }
  }

  // ============================================================================
  // Query Methods (private, single SQL)
  // ============================================================================

  private findGameGroupRow(groupId: number): GameGroupRow | null {
    const stmt = this.db.prepare("SELECT * FROM game_groups WHERE id = ?");
    return stmt.get(groupId) as GameGroupRow | null;
  }

  private findGameIdForGroup(groupId: number): number | null {
    const stmt = this.db.prepare("SELECT game_id FROM game_groups WHERE id = ?");
    const result = stmt.get(groupId) as { game_id: number } | null;
    return result?.game_id ?? null;
  }

  private findGameGroupsRows(gameId: number): GameGroupRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM game_groups
      WHERE game_id = ?
      ORDER BY group_order
    `);
    return stmt.all(gameId) as GameGroupRow[];
  }

  private insertGameGroupRow(
    gameId: number,
    name: string | null,
    startHole: number,
    groupOrder: number
  ): GameGroupRow {
    const stmt = this.db.prepare(`
      INSERT INTO game_groups (game_id, name, start_hole, group_order)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(gameId, name, startHole, groupOrder) as GameGroupRow;
  }

  private deleteGameGroupRow(groupId: number): void {
    const stmt = this.db.prepare("DELETE FROM game_groups WHERE id = ?");
    stmt.run(groupId);
  }

  private getNextGroupOrder(gameId: number): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(group_order), 0) + 1 as next_order
      FROM game_groups
      WHERE game_id = ?
    `);
    const result = stmt.get(gameId) as { next_order: number };
    return result.next_order;
  }

  private findGroupMemberRow(memberId: number): GameGroupMemberRow | null {
    const stmt = this.db.prepare("SELECT * FROM game_group_members WHERE id = ?");
    return stmt.get(memberId) as GameGroupMemberRow | null;
  }

  private findGroupMembersRows(groupId: number): GameGroupMemberRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM game_group_members
      WHERE game_group_id = ?
      ORDER BY tee_order
    `);
    return stmt.all(groupId) as GameGroupMemberRow[];
  }

  private insertGroupMemberRow(
    groupId: number,
    gamePlayerId: number,
    teeOrder: number
  ): GameGroupMemberRow {
    const stmt = this.db.prepare(`
      INSERT INTO game_group_members (game_group_id, game_player_id, tee_order)
      VALUES (?, ?, ?)
      RETURNING *
    `);
    return stmt.get(groupId, gamePlayerId, teeOrder) as GameGroupMemberRow;
  }

  private deleteGroupMemberRow(memberId: number): void {
    const stmt = this.db.prepare("DELETE FROM game_group_members WHERE id = ?");
    stmt.run(memberId);
  }

  private updateGroupMemberTeeOrderRow(memberId: number, teeOrder: number): void {
    const stmt = this.db.prepare(`
      UPDATE game_group_members
      SET tee_order = ?
      WHERE id = ?
    `);
    stmt.run(teeOrder, memberId);
  }

  private deleteGroupMembersByGroupRow(groupId: number): void {
    const stmt = this.db.prepare("DELETE FROM game_group_members WHERE game_group_id = ?");
    stmt.run(groupId);
  }

  private getNextTeeOrder(groupId: number): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(tee_order), 0) + 1 as next_order
      FROM game_group_members
      WHERE game_group_id = ?
    `);
    const result = stmt.get(groupId) as { next_order: number };
    return result.next_order;
  }

  private findGameScoreExists(memberId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM game_scores WHERE game_group_member_id = ?");
    return stmt.get(memberId) !== null;
  }

  private insertGameScoreRow(memberId: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO game_scores (game_group_member_id, score)
      VALUES (?, '[]')
    `);
    stmt.run(memberId);
  }

  private findGameExists(gameId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM games WHERE id = ?");
    return stmt.get(gameId) !== null;
  }

  private findGamePlayerExists(gamePlayerId: number): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM game_players WHERE id = ?");
    return stmt.get(gamePlayerId) !== null;
  }

  // ============================================================================
  // Logic Methods (private, no SQL)
  // ============================================================================

  private transformGameGroupRow(row: GameGroupRow): GameGroup {
    return {
      ...row,
      name: row.name ?? undefined,
    };
  }

  private transformGameGroupMemberRow(row: GameGroupMemberRow): GameGroupMember {
    return {
      ...row,
    };
  }

  // ============================================================================
  // Public API Methods (orchestration)
  // ============================================================================

  /**
   * Create a new group for a game
   */
  createGroup(gameId: number, data: CreateGameGroupDto): GameGroup {
    const startHole = data.start_hole ?? 1;

    this.validateStartHole(startHole);

    if (!this.findGameExists(gameId)) {
      throw new Error(`Game ${gameId} not found`);
    }

    const groupOrder = this.getNextGroupOrder(gameId);

    const row = this.insertGameGroupRow(
      gameId,
      data.name ?? null,
      startHole,
      groupOrder
    );

    return this.transformGameGroupRow(row);
  }

  /**
   * Get a single group by ID
   */
  findById(groupId: number): GameGroup | null {
    const row = this.findGameGroupRow(groupId);
    return row ? this.transformGameGroupRow(row) : null;
  }

  /**
   * Get all groups for a game
   */
  findGroupsForGame(gameId: number): GameGroup[] {
    const rows = this.findGameGroupsRows(gameId);
    return rows.map((row) => this.transformGameGroupRow(row));
  }

  /**
   * Delete a group (and all its members via CASCADE)
   */
  deleteGroup(groupId: number): void {
    const group = this.findGameGroupRow(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    this.deleteGameGroupRow(groupId);
  }

  /**
   * Add a member to a group
   */
  addMemberToGroup(
    groupId: number,
    gamePlayerId: number,
    teeOrder?: number
  ): GameGroupMember {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }

    if (!this.findGamePlayerExists(gamePlayerId)) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }

    const finalTeeOrder = teeOrder ?? this.getNextTeeOrder(groupId);
    this.validateTeeOrder(finalTeeOrder);

    const row = this.insertGroupMemberRow(groupId, gamePlayerId, finalTeeOrder);

    // Initialize game score record if it doesn't exist
    if (!this.findGameScoreExists(row.id)) {
      this.insertGameScoreRow(row.id);
    }

    return this.transformGameGroupMemberRow(row);
  }

  /**
   * Remove a member from a group
   */
  removeMemberFromGroup(memberId: number): void {
    const member = this.findGroupMemberRow(memberId);
    if (!member) {
      throw new Error(`Group member ${memberId} not found`);
    }

    this.deleteGroupMemberRow(memberId);
  }

  getGameIdByGroupId(groupId: number): number | null {
    return this.findGameIdForGroup(groupId);
  }

  /**
   * Get all members of a group
   */
  findGroupMembers(groupId: number): GameGroupMember[] {
    const rows = this.findGroupMembersRows(groupId);
    return rows.map((row) => this.transformGameGroupMemberRow(row));
  }

  /**
   * Reorder members in a group
   * @param groupId - Group ID
   * @param memberIds - Array of member IDs in desired order
   */
  reorderMembers(groupId: number, memberIds: number[]): void {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Use transaction to update all orders atomically
    this.db.transaction(() => {
      memberIds.forEach((memberId, index) => {
        const member = this.findGroupMemberRow(memberId);
        if (!member) {
          throw new Error(`Group member ${memberId} not found`);
        }

        if (member.game_group_id !== groupId) {
          throw new Error(`Member ${memberId} does not belong to group ${groupId}`);
        }

        this.updateGroupMemberTeeOrderRow(memberId, index + 1);
      });
    })();
  }

  /**
   * Replace all members in a group (used for drag-n-drop reassignment)
   * @param groupId - Group ID
   * @param gamePlayerIds - Array of game_player_ids to assign
   */
  setGroupMembers(groupId: number, gamePlayerIds: number[]): GameGroupMember[] {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }

    return this.db.transaction(() => {
      // Remove all existing members
      this.deleteGroupMembersByGroupRow(groupId);

      // Add new members in order
      const members: GameGroupMember[] = [];
      gamePlayerIds.forEach((gamePlayerId, index) => {
        if (!this.findGamePlayerExists(gamePlayerId)) {
          throw new Error(`Game player ${gamePlayerId} not found`);
        }

        const row = this.insertGroupMemberRow(groupId, gamePlayerId, index + 1);

        // Initialize game score record if it doesn't exist
        if (!this.findGameScoreExists(row.id)) {
          this.insertGameScoreRow(row.id);
        }

        members.push(this.transformGameGroupMemberRow(row));
      });

      return members;
    })();
  }
}
