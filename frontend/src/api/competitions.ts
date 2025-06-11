import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type { Series } from "./series";
import type { TeeTimeParticipant } from "./tee-times";

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  created_at: string;
  updated_at: string;
  participant_count: number;
}

// Enhanced Competition interface
export interface EnhancedCompetition extends Competition {
  series_name?: string;
}

export interface LeaderboardEntry {
  participant: TeeTimeParticipant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
}

export function useCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCompetition(competitionId: number) {
  return useQuery<EnhancedCompetition>({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const competitionResponse = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}`
      );
      if (!competitionResponse.ok) {
        throw new Error("Network response was not ok");
      }
      const competition: Competition = await competitionResponse.json();

      if (competition.series_id) {
        try {
          const seriesResponse = await fetch(
            `${API_BASE_URL}/series/${competition.series_id}`
          );
          if (seriesResponse.ok) {
            const series: Series = await seriesResponse.json();
            return { ...competition, series_name: series.name };
          }
        } catch (error) {
          console.error("Failed to fetch series details", error);
          // Return competition data even if series fetch fails
          return { ...competition, series_name: undefined };
        }
      }

      return competition;
    },
    enabled: competitionId > 0,
  });
}

export function useCompetitionLeaderboard(competitionId: number) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["competition", competitionId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/leaderboard`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

// Note: These mutation hooks will be added when needed for admin functionality
// For now, competitions are read-only in the current implementation

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompetitionDto): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create competition");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateCompetitionDto;
    }): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update competition");
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", id] });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete competition");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}
