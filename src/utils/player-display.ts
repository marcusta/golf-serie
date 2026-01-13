/**
 * Utility functions for player display names
 *
 * RULE: Always use display_name from player_profiles as first priority,
 * then fall back to name from players table.
 */

/**
 * Get the display name for a player
 * @param displayName - Player's display name from player_profiles table
 * @param name - Player's name from players table
 * @returns The preferred display name
 */
export function getPlayerDisplayName(displayName: string | null | undefined, name: string): string {
  return displayName?.trim() || name;
}

/**
 * SQL fragment for JOINing player names in queries
 * Use this in any query that needs to display player names
 *
 * Example usage:
 * ```sql
 * SELECT t.*, ${PLAYER_NAME_JOIN_FIELDS}
 * FROM teams t
 * LEFT JOIN players p ON t.player_id = p.id
 * LEFT JOIN player_profiles pp ON p.id = pp.player_id
 * ```
 */
export const PLAYER_NAME_JOIN_FIELDS = "p.name as player_name, pp.display_name as player_display_name";

/**
 * SQL fragment for the player name JOINs themselves
 * Use this when you need both the JOIN and the fields
 *
 * Example usage:
 * ```sql
 * SELECT t.*, ${PLAYER_NAME_JOIN_FIELDS}
 * FROM teams t
 * ${PLAYER_NAME_JOINS('t.player_id')}
 * ```
 */
export function PLAYER_NAME_JOINS(playerIdColumn: string): string {
  return `
    LEFT JOIN players p ON ${playerIdColumn} = p.id
    LEFT JOIN player_profiles pp ON p.id = pp.player_id
  `.trim();
}
