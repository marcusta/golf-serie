import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UseGameSyncOptions {
  gameId: number;
  enabled?: boolean;
}

/**
 * Polling hook for casual games - syncs game data every 30 seconds when game is active
 *
 * Pattern: Similar to useCompetitionSync but simplified for games
 * - Polls game details, group scores, and leaderboard data
 * - Only polls when game status is 'active'
 * - Stops polling for 'setup' or 'completed' games
 * - Automatically invalidates React Query cache to trigger refetch
 */
export function useGameSync({ gameId, enabled = true }: UseGameSyncOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !gameId) return;

    // Sync game data every 30 seconds (consistent with competition sync)
    const syncInterval = setInterval(() => {
      console.log(`[useGameSync] Syncing game ${gameId} data...`);

      // Invalidate all game-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["game-group-scores"] });
    }, 30000); // 30 seconds

    return () => clearInterval(syncInterval);
  }, [gameId, enabled, queryClient]);
}
