import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface TeeTimeParticipant {
  id: number;
  tee_order: number;
  team_id: number;
  position_name: string;
  player_names: string | null;
  created_at: string;
  updated_at: string;
  tee_time_id: number;
  score: number[];
  is_locked: boolean;
  locked_at?: string;
  team_name: string;
  player_id?: number | null;
  handicap_index?: number;
  is_dq?: boolean;
}

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  start_hole: number;
  hitting_bay?: number;
  created_at: string;
  updated_at: string;
  course_name: string;
  pars: number[];
  participants: TeeTimeParticipant[];
}

export function useTeeTimes() {
  return useQuery<TeeTime[]>({
    queryKey: ["tee-times"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tee-times`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useTeeTimesForCompetition(competitionId: number) {
  return useQuery<TeeTime[]>({
    queryKey: ["tee-times", "competition", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/tee-times`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: !!competitionId,
  });
}

export function useTeeTime(teeTimeId: number) {
  return useQuery({
    queryKey: ["teeTime", teeTimeId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tee-times/${teeTimeId}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: teeTimeId > 0,
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      participantId,
      hole,
      shots,
    }: {
      participantId: number;
      hole: number;
      shots: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}/score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hole, shots }),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update the specific teeTime query cache with the fresh data
      // This ensures the UI reflects the updated score immediately
      const teeTimeId = data.tee_time_id;
      if (teeTimeId) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", teeTimeId] });
      }
      // Also invalidate leaderboard queries so they reflect the updated scores
      // Uses predicate to match all leaderboard-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "competition" &&
            (key[2] === "leaderboard" || key[2] === "team-leaderboard")
          );
        },
      });
    },
  });
}

interface CreateTeeTimeParams {
  competitionId: number;
  teetime: string;
  start_hole?: number; // 1 or 10
  hitting_bay?: number;
}

interface CreateParticipantParams {
  tee_order: number;
  position_name: string;
  team_id: number;
  tee_time_id: number;
  player_names?: string;
  player_id?: number;
}

export function useCreateTeeTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      teetime,
      start_hole,
      hitting_bay,
    }: CreateTeeTimeParams) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/tee-times`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teetime, start_hole, hitting_bay }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to create tee time");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tee-times", "competition", variables.competitionId],
      });
    },
  });
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateParticipantParams) => {
      const response = await fetch(`${API_BASE_URL}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error("Failed to create participant");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the tee time query to refetch the updated data
      queryClient.invalidateQueries({
        queryKey: ["teeTime", variables.tee_time_id],
      });
    },
  });
}

export function useDeleteTeeTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teeTimeId: number) => {
      const response = await fetch(`${API_BASE_URL}/tee-times/${teeTimeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete tee time");
      }
      // Don't try to parse JSON for 204 responses
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the tee times query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    },
  });
}

export function useUpdateTeeTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        teetime: string;
        competition_id: number;
        start_hole: number;
        hitting_bay: number;
      }>;
    }) => {
      const response = await fetch(`${API_BASE_URL}/tee-times/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update tee time");
      }
      return response.json();
    },
    onSuccess: (updated) => {
      if (updated?.id) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", updated.id] });
      }
      if (updated?.competition_id) {
        queryClient.invalidateQueries({
          queryKey: ["tee-times", "competition", updated.competition_id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    },
  });
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete participant");
      }
      // Don't try to parse JSON for 204 responses
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the tee times query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    },
  });
}

export function useParticipant(participantId: number) {
  return useQuery<TeeTimeParticipant>({
    queryKey: ["participant", participantId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: participantId > 0,
  });
}
