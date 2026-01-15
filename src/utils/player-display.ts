/**
 * Utility functions for player display names
 *
 * RULE: Always use 3-level fallback for player names in participant contexts:
 * 1. display_name from player_profiles (user's preferred name)
 * 2. name from players table (registration name)
 * 3. player_names from participants (for unlinked participants)
 *
 * For non-participant contexts (player + profile only), use 2-level fallback.
 */

// ============================================================================
// SQL COALESCE Fragments
// ============================================================================

/**
 * Standard SQL fragment for player name in NON-PARTICIPANT contexts.
 * Use when querying players/enrollments where there's no participants table.
 *
 * Aliases expected: pp = player_profiles, pl = players
 *
 * Example: tour enrollments, stored competition results, player lookups
 */
export const PLAYER_NAME_COALESCE = "COALESCE(pp.display_name, pl.name) as player_name";

/**
 * SQL fragment for PARTICIPANT contexts (includes player_names fallback).
 * Use when querying participants who may not have a linked player.
 *
 * Aliases expected: pp = player_profiles, pl = players, p = participants
 *
 * Example: leaderboards, tee times with participants, competition groups
 */
export const PARTICIPANT_NAME_COALESCE =
  "COALESCE(pp.display_name, pl.name, p.player_names) as player_name";

// ============================================================================
// SQL JOIN Generators
// ============================================================================

/**
 * Generate SQL JOINs for player name resolution from a player_id column.
 *
 * @param playerIdColumn - The column containing player_id (e.g., "te.player_id", "p.player_id")
 * @param playerAlias - Alias for players table (default: "pl")
 * @param profileAlias - Alias for player_profiles table (default: "pp")
 *
 * Example usage:
 * ```sql
 * SELECT te.*, ${PLAYER_NAME_COALESCE}
 * FROM tour_enrollments te
 * ${playerNameJoins("te.player_id")}
 * WHERE te.tour_id = ?
 * ```
 */
export function playerNameJoins(
  playerIdColumn: string,
  playerAlias = "pl",
  profileAlias = "pp"
): string {
  return `
    LEFT JOIN players ${playerAlias} ON ${playerIdColumn} = ${playerAlias}.id
    LEFT JOIN player_profiles ${profileAlias} ON ${playerAlias}.id = ${profileAlias}.player_id
  `.trim();
}

// ============================================================================
// JavaScript Helper Functions
// ============================================================================

/**
 * Get display name in JavaScript (for post-query processing).
 * Falls back through display_name -> player name -> fallback name.
 *
 * @param displayName - Player's display name from player_profiles table
 * @param playerName - Player's name from players table
 * @param fallbackName - Optional fallback (e.g., player_names from participants)
 * @returns The preferred display name, or "Unknown" if all are empty
 */
export function getPlayerDisplayName(
  displayName: string | null | undefined,
  playerName: string | null | undefined,
  fallbackName?: string
): string {
  return displayName?.trim() || playerName?.trim() || fallbackName || "Unknown";
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use PLAYER_NAME_COALESCE or PARTICIPANT_NAME_COALESCE instead.
 * SQL fragment for JOINing player names in queries.
 */
export const PLAYER_NAME_JOIN_FIELDS =
  "p.name as player_name, pp.display_name as player_display_name";

/**
 * @deprecated Use playerNameJoins() instead.
 * SQL fragment for the player name JOINs themselves.
 */
export function PLAYER_NAME_JOINS(playerIdColumn: string): string {
  return `
    LEFT JOIN players p ON ${playerIdColumn} = p.id
    LEFT JOIN player_profiles pp ON p.id = pp.player_id
  `.trim();
}
