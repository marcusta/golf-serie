import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type {
  Game,
  GameWithDetails,
  GamePlayer,
  GameGroup,
  GameScore,
  CreateGameDto,
  UpdateGameDto,
  AddGamePlayerDto,
  CreateGameGroupDto,
  GameLeaderboardEntry,
  GameForDashboard,
  GameStatus,
} from "../../../src/types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all games for the current user
 */
export function useMyGames() {
  return useQuery<GameForDashboard[]>({
    queryKey: ["games", "my"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/games/my`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

/**
 * Fetch a single game with full details
 */
export function useGame(gameId: number) {
  return useQuery<GameWithDetails>({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: gameId > 0,
  });
}

/**
 * Fetch all players in a game
 */
export function useGamePlayers(gameId: number) {
  return useQuery<GamePlayer[]>({
    queryKey: ["game", gameId, "players"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/players`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: gameId > 0,
  });
}

/**
 * Fetch all groups in a game
 */
export function useGameGroups(gameId: number) {
  return useQuery<GameGroup[]>({
    queryKey: ["game", gameId, "groups"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/groups`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: gameId > 0,
  });
}

/**
 * Fetch scores for a specific group
 */
export function useGameGroupScores(groupId: number) {
  return useQuery<GameScore[]>({
    queryKey: ["game-group", groupId, "scores"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/games/groups/${groupId}/scores`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: groupId > 0,
  });
}

/**
 * Fetch leaderboard for a game
 */
export function useGameLeaderboard(gameId: number) {
  return useQuery<GameLeaderboardEntry[]>({
    queryKey: ["game", gameId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/games/${gameId}/leaderboard`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: gameId > 0,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new game
 */
export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGameDto): Promise<Game> => {
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create game");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", "my"] });
    },
  });
}

/**
 * Update an existing game
 */
export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      data,
    }: {
      gameId: number;
      data: UpdateGameDto;
    }): Promise<Game> => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update game");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["games", "my"] });
    },
  });
}

/**
 * Add a player to a game
 */
export function useAddGamePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      data,
    }: {
      gameId: number;
      data: AddGamePlayerDto;
    }): Promise<GamePlayer> => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add player");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "players"] });
    },
  });
}

/**
 * Remove a player from a game
 */
export function useRemoveGamePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      playerId,
    }: {
      gameId: number;
      playerId: number;
    }): Promise<{ success: boolean }> => {
      const response = await fetch(
        `${API_BASE_URL}/games/${gameId}/players/${playerId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove player");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "players"] });
    },
  });
}

/**
 * Assign a tee box to a player
 */
export function useAssignTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      playerId,
      teeId,
    }: {
      gameId: number;
      playerId: number;
      teeId: number;
    }): Promise<GamePlayer> => {
      const response = await fetch(
        `${API_BASE_URL}/games/${gameId}/players/${playerId}/tee`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tee_id: teeId }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign tee");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "players"] });
    },
  });
}

/**
 * Create a new group in a game
 */
export function useCreateGameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      data,
    }: {
      gameId: number;
      data: CreateGameGroupDto;
    }): Promise<GameGroup> => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "groups"] });
    },
  });
}

/**
 * Set group members (for drag-n-drop assignment)
 */
export function useSetGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      groupId,
      gamePlayerIds,
    }: {
      gameId: number;
      groupId: number;
      gamePlayerIds: number[];
    }): Promise<GameScore[]> => {
      const response = await fetch(
        `${API_BASE_URL}/games/${gameId}/groups/${groupId}/members`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ game_player_ids: gamePlayerIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set group members");
      }
      return response.json();
    },
    onSuccess: (_, { gameId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "groups"] });
      queryClient.invalidateQueries({
        queryKey: ["game-group", groupId, "scores"],
      });
    },
  });
}

/**
 * Delete a group from a game
 */
export function useDeleteGameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      groupId,
    }: {
      gameId: number;
      groupId: number;
    }): Promise<{ success: boolean }> => {
      const response = await fetch(
        `${API_BASE_URL}/games/${gameId}/groups/${groupId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete group");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId, "groups"] });
    },
  });
}

/**
 * Update a hole score
 */
export function useUpdateGameScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      hole,
      shots,
    }: {
      memberId: number;
      hole: number;
      shots: number;
    }): Promise<GameScore> => {
      const response = await fetch(
        `${API_BASE_URL}/game-scores/${memberId}/hole/${hole}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ shots }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update score");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the scores for all groups (we don't know which group the member belongs to)
      queryClient.invalidateQueries({
        queryKey: ["game-group"],
      });
      // Also invalidate leaderboard
      queryClient.invalidateQueries({
        queryKey: ["game"],
      });
    },
  });
}

/**
 * Lock a scorecard (finalize)
 */
export function useLockGameScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: number): Promise<GameScore> => {
      const response = await fetch(
        `${API_BASE_URL}/game-scores/${memberId}/lock`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lock scorecard");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all game-related queries
      queryClient.invalidateQueries({ queryKey: ["game-group"] });
      queryClient.invalidateQueries({ queryKey: ["game"] });
    },
  });
}

/**
 * Unlock a scorecard (reopen for editing)
 */
export function useUnlockGameScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: number): Promise<GameScore> => {
      const response = await fetch(
        `${API_BASE_URL}/game-scores/${memberId}/unlock`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unlock scorecard");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all game-related queries
      queryClient.invalidateQueries({ queryKey: ["game-group"] });
      queryClient.invalidateQueries({ queryKey: ["game"] });
    },
  });
}

/**
 * Update game status
 */
export function useUpdateGameStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      status,
    }: {
      gameId: number;
      status: GameStatus;
    }): Promise<Game> => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update game status");
      }
      return response.json();
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["games", "my"] });
    },
  });
}

/**
 * Delete a game
 */
export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: number): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete game");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", "my"] });
    },
  });
}

// ============================================================================
// Polling Hook
// ============================================================================

/**
 * Polling hook for active games (30s interval)
 * Only polls when game status is 'active'
 */
export function useGameSync(gameId: number, gameStatus?: GameStatus) {
  const shouldPoll = gameStatus === "active";

  return useQuery<GameWithDetails>({
    queryKey: ["game", gameId, "sync"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: gameId > 0 && shouldPoll,
    refetchInterval: shouldPoll ? 30000 : false, // 30 seconds
    refetchIntervalInBackground: false,
  });
}
