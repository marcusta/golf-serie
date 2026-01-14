import type { GamePlayer } from "@/types/games";

/**
 * Get display name for game player (registered or guest)
 */
export function getGamePlayerDisplayName(player: GamePlayer): string {
  // Prioritize display_name over name for registered players
  if (player.player_id) {
    return player.player_display_name || player.player_name || "Player";
  }
  // Use guest_name for guest players
  return player.guest_name || "Guest";
}
