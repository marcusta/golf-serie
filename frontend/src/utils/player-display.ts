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
export function getPlayerDisplayName(
  displayName: string | null | undefined,
  name: string | undefined
): string {
  return displayName?.trim() || name || "Unknown Player";
}

/**
 * Get display name for a GamePlayer (handles registered players and guests)
 * @param player - GamePlayer object with player names or guest name
 * @returns The preferred display name
 */
export function getGamePlayerDisplayName(player: {
  player_display_name?: string;
  player_name?: string;
  guest_name?: string;
}): string {
  return player.player_display_name?.trim() || player.player_name || player.guest_name || "Unknown Player";
}
