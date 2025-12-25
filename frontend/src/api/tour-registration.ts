import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

// Registration status types
export type RegistrationStatus =
  | "looking_for_group"
  | "registered"
  | "playing"
  | "finished"
  | "withdrawn";

export type RegistrationMode = "solo" | "looking_for_group" | "create_group";

// Registration response from my-registration endpoint
export interface Registration {
  id: number;
  competition_id: number;
  player_id: number;
  enrollment_id: number;
  tee_time_id?: number;
  participant_id?: number;
  status: RegistrationStatus;
  group_created_by?: number;
  registered_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GroupMember {
  player_id: number;
  name: string;
  handicap?: number;
  is_you?: boolean;
}

export interface PlayingGroup {
  tee_time_id: number;
  players: GroupMember[];
}

export interface MyRegistrationResponse {
  registered: boolean;
  registration: Registration | null;
  group: PlayingGroup | null;
}

// Available player for group formation
export interface AvailablePlayer {
  player_id: number;
  name: string;
  handicap?: number;
  status: "looking_for_group" | "available" | "in_group" | "playing" | "finished";
  group_tee_time_id?: number;
}

// Active round info (for showing ongoing games)
export interface ActiveRound {
  tour_id: number;
  tour_name: string;
  competition_id: number;
  competition_name: string;
  course_name: string;
  tee_time_id: number;
  participant_id: number;
  holes_played: number;
  current_score: string;
  group: string[];
  open_until?: string;
}

// ==========================================
// HOOKS - Registration (15D.1)
// ==========================================

/**
 * Get the current player's registration status for a competition
 */
export function useMyRegistration(competitionId: number) {
  return useQuery<MyRegistrationResponse>({
    queryKey: ["my-registration", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/my-registration`,
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 401) {
          return { registered: false, registration: null, group: null };
        }
        throw new Error("Failed to fetch registration status");
      }
      return response.json();
    },
    enabled: !!competitionId,
  });
}

/**
 * Register for a competition (solo, looking_for_group, or create_group)
 */
export function useRegisterForCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      mode,
    }: {
      competitionId: number;
      mode: RegistrationMode;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mode }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to register");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", variables.competitionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["available-players", variables.competitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["active-rounds"] });
    },
  });
}

/**
 * Withdraw from a competition
 */
export function useWithdrawFromCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/register`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to withdraw");
      }
      return response.json();
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", competitionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["available-players", competitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["active-rounds"] });
    },
  });
}

/**
 * Get available players for group formation
 */
export function useAvailablePlayers(competitionId: number) {
  return useQuery<AvailablePlayer[]>({
    queryKey: ["available-players", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/available-players`,
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error("Failed to fetch available players");
      }
      return response.json();
    },
    enabled: !!competitionId,
  });
}

// ==========================================
// HOOKS - Group Management (15D for 15E prep)
// ==========================================

/**
 * Add player(s) to your group
 */
export function useAddToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      playerIds,
    }: {
      competitionId: number;
      playerIds: number[];
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/group/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ playerIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add players to group");
      }
      return response.json() as Promise<PlayingGroup>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", variables.competitionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["available-players", variables.competitionId],
      });
    },
  });
}

/**
 * Remove a player from your group
 */
export function useRemoveFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      playerId,
    }: {
      competitionId: number;
      playerId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/group/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ playerId }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove player from group");
      }
      return response.json() as Promise<PlayingGroup>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", variables.competitionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["available-players", variables.competitionId],
      });
    },
  });
}

/**
 * Leave your current group
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/group/leave`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to leave group");
      }
      return response.json();
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", competitionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["available-players", competitionId],
      });
    },
  });
}

/**
 * Get current group members
 */
export function useMyGroup(competitionId: number) {
  return useQuery<PlayingGroup>({
    queryKey: ["my-group", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/group`,
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 404) {
          return { tee_time_id: 0, players: [] };
        }
        throw new Error("Failed to fetch group");
      }
      return response.json();
    },
    enabled: !!competitionId,
  });
}

// ==========================================
// HOOKS - Play Mode (15D for 15F prep)
// ==========================================

/**
 * Start playing (transition from registered to playing)
 */
export function useStartPlaying() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/start-playing`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start playing");
      }
      return response.json();
    },
    onSuccess: (_, competitionId) => {
      queryClient.invalidateQueries({
        queryKey: ["my-registration", competitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["active-rounds"] });
    },
  });
}

/**
 * Get all active rounds for the current player
 */
export function useActiveRounds() {
  return useQuery<ActiveRound[]>({
    queryKey: ["active-rounds"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/player/active-rounds`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error("Failed to fetch active rounds");
      }
      return response.json();
    },
  });
}
