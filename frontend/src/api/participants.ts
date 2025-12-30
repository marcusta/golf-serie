import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  player_id?: number;
  handicap_index?: number;
  score: number[];
  is_locked: boolean;
  locked_at?: string;
  manual_score_out?: number;
  manual_score_in?: number;
  manual_score_total?: number;
  // DQ and audit fields
  is_dq: boolean;
  admin_notes?: string;
  admin_modified_by?: number;
  admin_modified_at?: string;
  created_at: string;
  updated_at: string;
  team_name: string;
}

export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useParticipant(id: number) {
  return useQuery<Participant>({
    queryKey: ["participant", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCompetitionParticipants(competitionId: number) {
  return useQuery<Participant[]>({
    queryKey: ["competition-participants", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/participants`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export interface UpdateParticipantDto {
  tee_order?: number;
  team_id?: number;
  tee_time_id?: number;
  position_name?: string;
  player_names?: string;
  handicap_index?: number | null;
}

export function useUpdateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateParticipantDto;
    }) => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update participant");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries to ensure UI is up-to-date
      const teeTimeId = data?.tee_time_id;
      if (teeTimeId) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", teeTimeId] });
      }
      queryClient.invalidateQueries({
        queryKey: ["participant", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useLockParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to lock participant");
      }
      return response.json();
    },
    onSuccess: (updatedParticipant) => {
      // Update specific caches with the updated participant, preserving fields
      queryClient.setQueryData(
        ["participant", updatedParticipant.id],
        (oldData: Participant | undefined) =>
          oldData ? { ...oldData, ...updatedParticipant } : updatedParticipant
      );

      queryClient.setQueriesData(
        { queryKey: ["participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((p) =>
            p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
          );
        }
      );

      queryClient.setQueriesData(
        { queryKey: ["competition-participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((p) =>
            p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
          );
        }
      );

      // Also invalidate related lists/leaderboards
      const teeTimeId = updatedParticipant?.tee_time_id;
      if (teeTimeId) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", teeTimeId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
    },
  });
}

export function useUnlockParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${id}/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to unlock participant");
      }
      return response.json();
    },
    onSuccess: (updatedParticipant) => {
      // Update specific caches with the updated participant, preserving fields
      queryClient.setQueryData(
        ["participant", updatedParticipant.id],
        (oldData: Participant | undefined) =>
          oldData ? { ...oldData, ...updatedParticipant } : updatedParticipant
      );

      queryClient.setQueriesData(
        { queryKey: ["participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((p) =>
            p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
          );
        }
      );

      queryClient.setQueriesData(
        { queryKey: ["competition-participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((p) =>
            p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
          );
        }
      );

      // Also invalidate related lists/leaderboards
      const teeTimeId = updatedParticipant?.tee_time_id;
      if (teeTimeId) {
        queryClient.invalidateQueries({ queryKey: ["teeTime", teeTimeId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
    },
  });
}

export interface ManualScoreDto {
  out?: number | null;
  in?: number | null;
  total: number | null;
}

export function useUpdateManualScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ManualScoreDto }) => {
      const response = await fetch(
        `${API_BASE_URL}/participants/${id}/manual-score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update manual score");
      }
      return response.json();
    },
    onSuccess: (updatedParticipant, variables) => {
      // Update the specific participant in all relevant caches without invalidating
      queryClient.setQueryData(
        ["participant", variables.id],
        updatedParticipant
      );

      // Update the participant in competition-participants cache
      queryClient.setQueriesData(
        { queryKey: ["competition-participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((participant) =>
            participant.id === variables.id ? updatedParticipant : participant
          );
        }
      );

      // Update the participant in participants cache
      queryClient.setQueriesData(
        { queryKey: ["participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((participant) =>
            participant.id === variables.id ? updatedParticipant : participant
          );
        }
      );

      // Only invalidate leaderboard queries since manual scores affect standings
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
    },
  });
}

export function useUpdateParticipantHandicap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      handicap_index,
    }: {
      id: number;
      handicap_index: number | null;
    }) => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handicap_index }),
      });

      if (!response.ok) {
        throw new Error("Failed to update participant handicap");
      }
      return response.json();
    },
    onSuccess: (updatedParticipant, variables) => {
      // Update the specific participant in all relevant caches
      queryClient.setQueryData(
        ["participant", variables.id],
        updatedParticipant
      );

      queryClient.setQueriesData(
        { queryKey: ["competition-participants"] },
        (oldData: Participant[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((participant) =>
            participant.id === variables.id ? updatedParticipant : participant
          );
        }
      );

      // Invalidate tee-times to refresh the admin view
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });

      // Invalidate leaderboard since handicap affects net score calculations
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
    },
  });
}

export function useAdminSetDQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_dq,
      admin_notes,
    }: {
      id: number;
      is_dq: boolean;
      admin_notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}/admin/dq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ is_dq, admin_notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update DQ status");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      queryClient.invalidateQueries({ queryKey: ["competition-groups"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-participants"] });
    },
  });
}

export function useAdminUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      score,
      admin_notes,
    }: {
      id: number;
      score: number[];
      admin_notes?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}/admin/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ score, admin_notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update score");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      queryClient.invalidateQueries({ queryKey: ["competition-groups"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["competition-participants"] });
    },
  });
}
